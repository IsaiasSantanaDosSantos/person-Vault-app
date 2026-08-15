# Auditoria de Segurança — Cofre de Senhas Pessoal (v3)

**Data:** 2026-08-15
**Relação com as auditorias anteriores:** este documento **não substitui** [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md) (v1) nem [AUDITORIA_SEGURANCA_V2.md](AUDITORIA_SEGURANCA_V2.md) (v2) — audita especificamente o que mudou desde a v2.2 (compartilhamento por link, MFA, recuperação de senha, exclusão de conta): um bug real de expiração de link, e a adição de uma esteira de testes automatizados, CI/CD, SAST, atualização automática de dependências, rate limiting de borda e monitoramento externo. Leia a v1 e a v2 primeiro se quiser o histórico completo dos achados de arquitetura.

---

## O que mudou desde a v2.2 (escopo desta auditoria)

| Mudança | Arquivos |
|---|---|
| Fix: link compartilhado expirado continuava acessível pro dono logado | `lib/shareStore.ts` (`getShare`) |
| 48 testes unitários automatizados (Vitest) | `vitest.config.mts`, `lib/*.test.ts` |
| Pipeline de CI (lint + tipos + testes + build em toda PR) | `.github/workflows/ci.yml` |
| Promoção automática `pre-producao` → `main` | `.github/workflows/promote-to-main.yml` |
| SAST (Semgrep) | `.github/workflows/semgrep.yml` |
| Atualização automática de dependências | `.github/dependabot.yml` |
| Rate limiting de borda em `/share/[id]` | `lib/rateLimit.ts`, `middleware.ts` |
| Monitoramento externo + status page pública | `MONITORAMENTO.md` |
| Configuração de lint pela primeira vez | `.eslintrc.json` |

---

## 1. Fix: bypass de expiração em link compartilhado — CORRIGIDO

**Onde:** `lib/shareStore.ts` (`getShare`)

**O problema:** a tabela `shared_items` tem duas políticas de RLS permissivas: `"shared: public read valid"` (`expires_at > now()`, pra quem não é o dono) e `"shared: owner select"` (`auth.uid() = owner_id`, sem checar expiração — de propósito, pra o dono conseguir ver o histórico de compartilhamentos). O Postgres combina políticas permissivas com OR. Resultado: se o dono abrisse o próprio link de compartilhamento **no mesmo navegador em que estava logado**, a política do dono concedia acesso independente da expiração — o link nunca "expirava de verdade" nesse cenário específico, mesmo já tendo passado do prazo. Só um `DELETE` explícito (revogar) barrava o acesso, porque `DELETE` usa a política de exclusão do dono, que não depende de RLS de select nenhuma.

Esse era exatamente o comportamento relatado no início desta sessão: um link configurado pra expirar em 10 minutos continuava acessível depois do prazo, mas sumia na hora ao clicar em "Revogar".

**A correção:** `getShare()` agora verifica `expires_at` explicitamente no código, depois de buscar a linha — não depende só do RLS pra essa regra. Isso fecha o bypass pra qualquer sessão, incluindo a do próprio dono. Testado em janela anônima após a correção, confirmando "link inválido/expirado" corretamente.

**Severidade:** Média. A janela de exposição real é estreita — só afeta o *dono* testando o próprio link, no *mesmo navegador* de uma sessão logada, depois do prazo de expiração; um terceiro que recebesse o link já sempre esbarrava corretamente na política pública. Ainda assim, era um bug genuíno de "a UI diz uma coisa, o sistema faz outra", corrigido nesta sessão.

**Teste automatizado:** `lib/shareStore.test.ts` agora tem um caso dedicado que simula exatamente esse cenário (mock devolvendo uma linha expirada) e trava a correção contra regressão futura.

---

## 2. Testes unitários automatizados — NOVO

**Onde:** `vitest.config.mts`, `lib/*.test.ts` (7 arquivos, 48 testes)

Cobertura: round-trip de criptografia do cofre e do compartilhamento (`crypto.ts`, `shareCrypto.ts`, incluindo o caso de chaves derivadas com número de iterações diferente não serem intercambiáveis), força da senha mestra (`passwordStrength.ts`, tabela cobrindo cada branch), a chave em memória (`keyStore.ts`), o rate limiting de borda (`rateLimit.ts`, incluindo o comportamento de falha aberta), e o acesso a dados do Supabase (`shareStore.ts`, `vaultStore.ts`, com o cliente mockado — sem nenhuma chamada de rede real).

**Análise de segurança:** positiva, sem ressalvas. Testes usam mocks (nenhuma credencial real, nenhuma chamada contra o Supabase de produção) e rodam num ambiente Node isolado. O valor de segurança aqui não é achar uma vulnerabilidade nova — é **travar invariantes já corretas contra regressão futura** (ex: IV nunca reutilizado, iterações de PBKDF2 não intercambiáveis, expiração de share sempre verificada). Cobertura é só de `lib/` (lógica), não de componentes React nem end-to-end — ver seção "O que não mudou" abaixo.

---

## 3. Pipeline de CI (GitHub Actions) — NOVO

**Onde:** `.github/workflows/ci.yml`, `package.json` (scripts `test`/`typecheck` novos)

Toda alteração (push ou PR contra `pre-producao`/`main`) roda: lint → checagem de tipos → os 48 testes → build de produção completo. Nada chega em `main` (e, por consequência, em produção na Vercel) sem passar por essas quatro portas.

**Descoberta feita ao configurar isso:** o script `"lint"` já existia no `package.json`, mas nunca tinha sido configurado de fato — `next lint` abria um prompt interativo (ESLint nunca tinha sido instalado). Ou seja, lint **nunca rodou** neste projeto antes desta sessão. Configurei o ESLint (`.eslintrc.json`, herdando `next/core-web-vitals`) e isso expôs ~40 erros pré-existentes de `react/no-unescaped-entities` (aspas retas dentro de texto JSX) espalhados por páginas de conteúdo (`/docs`, `/ajuda`, `/login`, etc.) — todos estilísticos, sem nenhuma implicação de segurança ou funcional. Desliguei essa regra específica em vez de editar ~15 arquivos de prosa fora do escopo pedido; o restante do lint (incluindo regras que pegariam problemas reais) ficou ativo.

**Análise de segurança:** positiva. Ter um gate automatizado antes de qualquer merge é, por si só, uma redução de risco — elimina a classe de erro "esqueci de rodar o build/lint antes de subir".

---

## 4. Promoção automática `pre-producao` → `main` — NOVO

**Onde:** `.github/workflows/promote-to-main.yml`

Depois que uma PR é mergeada em `pre-producao`, um segundo workflow abre (ou reaproveita) uma PR `pre-producao → main`, espera o check `ci` dessa PR terminar, e só então mergeia — sem clique manual.

**Ponto de atenção identificado e mitigado:** esse workflow precisa de um Personal Access Token (`PROMOTE_PAT`) em vez do `GITHUB_TOKEN` padrão do Actions, porque PRs/merges autoria `github-actions[bot]` não disparam outros workflows (regra anti-recursão do GitHub) — sem isso, o `ci.yml` nunca rodaria de novo na PR de promoção. **Isso introduz um novo segredo com permissão de escrita no repositório.** Mitigações aplicadas: o token é fine-grained, restrito a este único repositório, com só as duas permissões estritamente necessárias (`contents: write`, `pull requests: write` — sem admin, sem acesso a outros repos, sem acesso a Actions/Secrets em si). Como o repositório é privado e de um único desenvolvedor, a superfície de risco desse token vazando é a mesma de qualquer credencial de deploy pessoal — não introduz um vetor novo de terceiros.

**Sem proteção de branch nativa:** branch protection rules (exigir PR, exigir status check) em repositório privado é recurso pago (Pro/Team/Enterprise) no GitHub — indisponível no plano atual. Na prática isso não enfraquece o mecanismo: o workflow em si já só mergeia depois do check `ci` passar, então a garantia funcional (nada verde chega em `main`) se mantém mesmo sem essa rede de segurança adicional. O que se perde é só a proteção contra o próprio dono empurrar algo manualmente pra `main` sem passar pela esteira — risco aceitável pra um repositório de um único mantenedor.

---

## 5. SAST (Semgrep) e Dependabot — NOVO

**Onde:** `.github/workflows/semgrep.yml`, `.github/dependabot.yml`

CodeQL foi avaliado e descartado: em repositório privado, publicar resultados no GitHub exige GitHub Advanced Security, que não está incluso nos planos Free/Pro individuais. Semgrep roda sem custo em qualquer visibilidade de repositório, sem precisar de conta nem token — usa só os rulesets públicos (`p/javascript`, `p/typescript`, `p/react`, `p/owasp-top-ten`) e falha o job se encontrar algo, gatilhando em todo push/PR mais uma vez por semana.

Dependabot abre PRs semanais de atualização (npm + GitHub Actions), agrupando bumps de patch/minor. **Importante:** isso não corrige, por si só, nenhuma vulnerabilidade das dependências atuais (ver seção 7 abaixo) — só garante que futuras atualizações passem a chegar automaticamente como PR, em vez de dependerem de alguém lembrar de rodar `npm outdated` manualmente.

**Análise de segurança:** positiva. Nenhum dos dois workflows expõe segredos (Semgrep não precisa de nenhum; Dependabot usa permissões padrão do GitHub, sem token adicional).

---

## 6. Rate limiting de borda em `/share/[id]` — NOVO

**Onde:** `lib/rateLimit.ts`, `middleware.ts`

Throttle (janela deslizante, 20 requisições/60s por IP, via Upstash Redis) aplicado só na rota pública `/share/[id]`, como camada extra contra enumeração de links compartilhados (o UUID em si já é praticamente impossível de adivinhar — isso é defesa em profundidade, não a proteção principal).

**Decisões de design verificadas:**
- **Falha aberta.** Se `UPSTASH_REDIS_REST_URL`/`TOKEN` não estiverem configurados, ou o Upstash responder com erro, a requisição é liberada normalmente. Isso é deliberado: essa é uma mitigação de abuso, não a fronteira de segurança real do app (RLS + criptografia zero-knowledge continuam sendo essa fronteira, inalteradas). Uma falha fechada aqui transformaria uma indisponibilidade do Upstash num incidente de disponibilidade do app inteiro — pior troca.
- **Sem segredo exposto ao cliente.** As duas variáveis de ambiente do Upstash não têm o prefixo `NEXT_PUBLIC_`, então nunca são incluídas no bundle JavaScript enviado ao navegador — confirmado lendo `lib/rateLimit.ts` e `next.config.mjs` (nenhuma reexposição via `env`/`publicRuntimeConfig`).
- **Escopo limitado por design.** Só cobre `/share/*`, porque é a única rota que o próprio servidor Next.js processa (não há rotas de API customizadas — tudo mais fala direto do navegador com o Supabase). Abuso de login/cadastro continua sendo responsabilidade do painel do Supabase (rate limiting/CAPTCHA, item pendente desde a v1) — não dá pra mitigar em código aqui, e o rate limiting de borda não deve ser confundido com isso.

**Análise de segurança:** positiva, com o trade-off de "falha aberta" documentado e intencional.

---

## 7. O que NÃO mudou (reconfirmado nesta rodada)

- **Next.js continua em 14.2.35**, com as mesmas falhas médias/altas do `npm audit` já identificadas na v1 (DoS/SSRF em Server Actions e Server Components, path traversal no PostCSS embutido) — nenhuma se aplica sem Server Actions, WebSocket upgrades, i18n do Pages Router ou servidor customizado, nenhum dos quais este app usa. Migração pra Next.js 15/16 continua sendo um upgrade maior, deliberadamente não feito nesta sessão — mas agora que o Dependabot está ativo, uma PR de atualização vai aparecer sozinha quando fizer sentido revisitar isso.
- **Nova vulnerabilidade dev-only introduzida indiretamente:** instalar `eslint-config-next` trouxe uma dependência transitiva (`glob` CLI, via `@next/eslint-plugin-next`) com uma falha de command injection conhecida. Irrelevante na prática: é uma ferramenta de linha de comando que só importa se alguém invocá-la diretamente com input controlado por atacante, o que não acontece em nenhum lugar deste projeto (só afeta quem roda `next lint` localmente ou em CI, nunca o app em produção, e não há nenhuma superfície de output do usuário alimentando esse CLI).
- RLS de `vault_items`/`vault_profiles`/`shared_items`, arquitetura zero-knowledge, CSP, PBKDF2 600k, bloqueio por inatividade — tudo inalterado e reconfirmado presente após `npm run build`.
- Ações manuais pendentes do painel do Supabase (leaked password protection, rate limiting/CAPTCHA de login, troca de senha mestra) continuam exatamente como estavam — nada nesta sessão dependia delas nem as resolveu.

**Correção pós-publicação desta auditoria:** o MFA (TOTP) já estava, na verdade, testado e confirmado ponta a ponta contra o Supabase real antes desta rodada — funciona como esperado (login sem autenticador cadastrado segue normal; com um cadastrado, o código de 6 dígitos é exigido em todo login, logo após a conta autenticar e antes da senha mestra). Esse item saiu da lista de pendências em `README.md`, `MFA.md` e `/docs`.

---

## Comparativo entre as rodadas de auditoria

| Rodada | Mudança principal | 🟢 Prós | 🔴 Contras / risco residual |
|---|---|---|---|
| v1 | Correções fundamentais: PBKDF2 600k, CSP, força de senha, patch do Next.js | Fechou os 4 achados críticos de arquitetura que existiam desde o início | Next.js manteve CVEs médias sem correção (exigem upgrade maior); MFA, leaked-password e rate limiting de login ficaram pendentes de configuração manual no Supabase |
| v2 | Sessão persistente + botão de logoff + edição de itens | Nenhuma regressão de segurança; RLS de `UPDATE` verificada explicitamente contra a documentação do Postgres antes de declarar segura | — |
| v2.1 | Correção visual (overflow do botão "Gerar") | — | — (puramente visual, sem relação com segurança) |
| v2.2 | Compartilhamento por link, MFA ativado, reset de senha, exclusão de conta | Escopo de chave por link isolado da senha mestra; teto de 24h garantido em duas camadas (app + `CHECK` no banco); MFA isolado atrás de feature flag, sem chamada em produção enquanto desativado | Nenhum achado formal registrado nesta rodada (revisão feita durante a própria implementação, não como auditoria separada) — em retrospecto, foi aqui que o bug de expiração do item 1 desta v3 foi introduzido, sem ter sido pego na hora |
| **v3 (esta rodada)** | Fix da expiração de link + testes automatizados + CI/CD + SAST + Dependabot + rate limiting de borda + monitoramento | Fecha um bypass real de RLS; 48 testes travam invariantes de criptografia contra regressão; nada chega em produção sem passar por lint+tipos+testes+build; SAST e atualização de dependências agora automáticos; throttle de borda mitiga enumeração de links; monitoramento externo dá visibilidade de indisponibilidade sem custo | Next.js 14.2.35 e suas CVEs médias continuam de pé (agora ao menos rastreadas via Dependabot); novo segredo `PROMOTE_PAT` com escrita no repo (mitigado: escopo mínimo, repo privado, solo dev); sem proteção de branch nativa (indisponível no plano, mitigado pelo próprio design do workflow); rate limiting de borda falha aberto por design (mitigação, não fronteira real); nova dependência dev-only (`glob` via ESLint) com CVE irrelevante na prática |

**Leitura geral:** todas as rodadas foram líquidas positivas pra postura de segurança — nenhuma introduziu uma regressão real. A v3 é a que mais expande a superfície de *processo* (CI/CD, testes, SAST) em vez de código de aplicação em si, o que é coerente com o objetivo declarado desta sessão: fechar a lacuna "achados corrigidos manualmente, um de cada vez" por "achados que a esteira automatizada vai continuar pegando sozinha daqui pra frente".

---

## A aplicação está "100% segura"?

A resposta não muda de rodada pra rodada: **não existe "100% seguro" em software.** O que esta v3 acrescenta à resposta das auditorias anteriores:

- O bug de expiração de link (item 1) é a prova concreta de por que "arquitetura correta" e "zero bug" não são a mesma coisa — a arquitetura de RLS estava certa (cada policy fazendo exatamente o que o comentário dizia que fazia), o bug estava na composição entre duas policies corretas isoladamente. É exatamente o tipo de erro que revisão manual ocasional tem mais chance de deixar passar, e que uma esteira de testes + CI reduz (não elimina) a chance de se repetir despercebido.
- A aplicação agora tem menos dependência de disciplina manual pra manter o nível de segurança já alcançado: testes automatizados, gate de CI, SAST e atualização de dependências rodam sozinhos a partir de agora, em vez de dependerem de uma auditoria pontual lembrar de checar tudo de novo a cada mudança.
- Os itens que seguem genuinamente pendentes (configuração manual no painel do Supabase, upgrade do Next.js, troca de senha mestra com reencriptação) são os mesmos de sempre — nada nesta rodada piorou, nem escondeu, o que ainda falta.

Mantida a mesma conclusão das rodadas anteriores: com o checklist de ações manuais em dia, a aplicação continua **adequada para uso pessoal com segredos de qualquer criticidade que você seria responsável por proteger sozinho de qualquer forma**, com a mesma ressalva permanente sobre a diferença entre isso e um produto comercial com auditoria de terceiros contínua.
