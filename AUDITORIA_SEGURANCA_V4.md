# Auditoria de Segurança — Cofre de Senhas Pessoal (v4)

**Data:** 2026-08-15
**Relação com as auditorias anteriores:** não substitui [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md) (v1), [AUDITORIA_SEGURANCA_V2.md](AUDITORIA_SEGURANCA_V2.md) (v2) nem [AUDITORIA_SEGURANCA_V3.md](AUDITORIA_SEGURANCA_V3.md) (v3) — audita o que mudou desde a v3: a implementação do CAPTCHA (Cloudflare Turnstile), e uma reconfirmação pontual de dois itens que a documentação ainda listava como pendentes sem estarem mais.

---

## O que motivou esta rodada

Pedido explícito: refazer a auditoria conferindo três coisas específicas — a verificação "sou humano" (CAPTCHA), o MFA, e se a migração `supabase/schema.sql` está em dia. Resultado da conferência:

| Item | Estava pendente na v3? | Situação real agora |
|---|---|---|
| CAPTCHA (Cloudflare Turnstile) | Sim, não existia ainda | ✅ Implementado, configurado e testado — ver seção 1 |
| MFA testado ponta a ponta | Não — já tinha sido corrigido antes da v3, mas o texto de alguns documentos ainda não refletia isso corretamente em todos os lugares | ✅ Confirmado (reconfirmação, não mudança de fato) |
| `supabase/schema.sql` rodado | Item de checklist manual, sem confirmação registrada | ✅ Confirmado pelo usuário — rodado (inclusive de novo, por segurança) |

O achado real desta rodada não é uma vulnerabilidade de código — é **documentação desatualizada**: o `README.md` e o `/docs` ainda listavam `schema.sql` como pendência de checklist mesmo depois de já ter sido executado, e a tabela de histórico de auditorias do `README.md` nunca tinha sido atualizada com as rodadas v3 e v4 (só existia em `/docs`). Corrigido nesta sessão — ver seção 4.

---

## 1. CAPTCHA (Cloudflare Turnstile) — NOVO, verificado

**Onde:** `components/Turnstile.tsx`, `app/login/page.tsx`, `middleware.ts` (CSP)

**O que foi conferido nesta rodada, lendo o código atual (não só a memória da implementação):**

- **Os três fluxos que o Supabase pode exigir `captchaToken` estão cobertos:** `signInWithPassword`, `signUp` e `resetPasswordForEmail` passam `captchaToken` explicitamente (`app/login/page.tsx`, confirmado nas três chamadas).
- **CSP correta e mínima:** `challenges.cloudflare.com` liberado em `script-src`, `connect-src` e `frame-src` — os três pontos que o widget precisa (script, chamadas de rede, iframe do desafio) e nada além disso.
- **Nenhum segredo vazado no repositório.** Busquei por trechos da Site Key e da Secret Key (prefixo `0x4AAAAAAEQ`, comum às duas) em toda a árvore de arquivos e em todo o histórico do git — zero ocorrências. A Secret Key nunca chegou perto do código; vive só no painel do Supabase, como deveria.
- **Sem dependência nova.** O widget usa `next/script` (já parte do Next.js) pra carregar o script da Cloudflare — nenhum pacote npm novo, nenhuma superfície de supply-chain adicional.
- **Vira no-op sem `NEXT_PUBLIC_TURNSTILE_SITE_KEY`** — mesmo padrão já usado no rate limiting (`lib/rateLimit.ts`): local/CI/preview sem a env var configurada não quebram.
- **Testado de ponta a ponta contra o Supabase real:** confirmado que uma tentativa sem o widget resolvido é rejeitada pelo próprio Supabase (`captcha protection: request disallowed`), e que com o token válido o fluxo completa normalmente — nos três fluxos.

**Trade-off identificado (não é um bug, é uma escolha consciente que vale documentar):** ao contrário do rate limiting de `/share/[id]` (que falha *aberto* — libera a requisição se o Upstash cair), o CAPTCHA falha *fechado* por natureza: se o script do Turnstile não carregar (instabilidade de rede do usuário, ou uma indisponibilidade da Cloudflare), o token nunca é gerado, e o botão de entrar/criar conta/recuperar senha fica bloqueado indefinidamente (`disabled={loading || (CAPTCHA_ENABLED && !captchaToken)}`). Isso é o comportamento correto do ponto de vista de segurança (não dá pra contornar a proteção contra bots simplesmente derrubando o serviço de CAPTCHA), mas é uma dependência de disponibilidade nova: o login do app passa a depender também da Cloudflare estar no ar, não só do Supabase e da Vercel. Na prática o Turnstile tem uptime historicamente muito alto (é a mesma infraestrutura que protege boa parte da internet), então o risco residual é baixo — mas é uma dependência a mais que não existia antes, e vale saber que existe.

**Severidade do achado:** nenhuma — é uma adição de segurança, não uma correção de vulnerabilidade. Fecha um item que estava pendente desde a v1 (rate limiting/CAPTCHA no login, item #7 do checklist original).

---

## 2. MFA — reconfirmado, sem mudança de código

Sem alteração de comportamento nesta rodada. Reconfirmando o que a v3 já deveria ter deixado assentado: MFA (TOTP) ativado e testado ponta a ponta contra o Supabase real — sem autenticador cadastrado, login normal; com um cadastrado, o código de 6 dígitos é exigido em todo login, logo após a conta autenticar e antes da senha mestra. Ver `MFA.md`.

---

## 3. `supabase/schema.sql` — reconfirmado, sem mudança de código

O script (colunas `iterations`, limites de tamanho, tabela `shared_items`) foi executado no SQL Editor do Supabase — o usuário confirmou tê-lo rodado, inclusive novamente por precaução. É idempotente por design, então rodar de novo não tem efeito colateral. Item fechado.

---

## 4. Documentação corrigida nesta rodada

- `README.md` e `/docs`: item "rodar `supabase/schema.sql`" e item "CAPTCHA" movidos da lista de pendências pra lista do que já está feito.
- `README.md`: a tabela de histórico de auditorias (seção 7) estava parada na v2.2 — nunca tinha ganhado as linhas da v3 nem desta v4, embora o `/docs` já tivesse a v3. Adicionadas as duas.
- `README.md` e `/docs`: árvore de arquivos desatualizada havia sessões — faltavam `.github/`, `vitest.config.mts`, `.eslintrc.json`, `lib/rateLimit.ts`, os arquivos `lib/*.test.ts`, `components/Turnstile.tsx`, `MONITORAMENTO.md` e as próprias `AUDITORIA_SEGURANCA_V3.md`/`V4.md`. Atualizada nos dois arquivos.

Nenhuma dessas correções é uma vulnerabilidade — é higiene documental. Mas documentação de segurança desatualizada tem um risco próprio: alguém (inclusive uma futura sessão de IA revisando o projeto) pode tomar uma decisão baseada em "isso ainda está pendente" quando na verdade já foi resolvido, ou vice-versa.

---

## Comparativo atualizado (v1 → v4)

| Rodada | Mudança principal | 🟢 Prós | 🔴 Contras / risco residual |
|---|---|---|---|
| v1 | PBKDF2 600k, CSP, força de senha, patch do Next.js | Fechou os 4 achados críticos de arquitetura | Next.js manteve CVEs médias sem correção; MFA, leaked-password e rate limiting de login pendentes de configuração manual |
| v2 / v2.1 | Sessão persistente, edição de itens, fix visual | Nenhuma regressão; RLS de `UPDATE` verificada | — |
| v2.2 | Compartilhamento por link, MFA ativado, reset de senha, exclusão de conta | Escopo de chave por link isolado; teto de 24h em duas camadas | Nenhum achado formal registrado — em retrospecto, foi aqui que o bug de expiração (fechado na v3) entrou |
| v3 | Fix da expiração de link + testes + CI/CD + SAST + Dependabot + rate limiting de borda + monitoramento | Fecha um bypass real de RLS; 48 testes travam invariantes; nada chega em produção sem lint+tipos+testes+build | Next.js 14.2.35 e CVEs médias continuam (agora rastreadas via Dependabot); `PROMOTE_PAT` é um novo segredo (mitigado); rate limiting falha aberto por design |
| **v4 (esta rodada)** | CAPTCHA (Turnstile) implementado e testado; reconfirmação de MFA/schema.sql; documentação desatualizada corrigida | Fecha o item de rate limiting/CAPTCHA de login pendente desde a v1; nenhum segredo vazado (conferido); zero dependência npm nova; documentação voltou a bater com a realidade do código | CAPTCHA introduz uma dependência de disponibilidade na Cloudflare (falha fechada, por design — trade-off aceitável); "Leaked password protection" continua sendo o único item do painel do Supabase ainda não confirmado como feito |

---

## O que ainda falta (lista final, sem surpresas novas)

1. **"Leaked password protection"** em Authentication → Settings do Supabase — único item de configuração manual que resta sem confirmação.
2. **Next.js 14.2.35 → 15/16** — upgrade maior, deliberadamente adiado; agora rastreado automaticamente via Dependabot.
3. **Troca de senha mestra com reencriptação** — deliberadamente deixado por último desde o início desta série de melhorias, pra avaliar prós/contras à parte.
4. Itens de nível "produto comercial" (auditoria externa, pentest formal, SLA contratual, infraestrutura dedicada) — fora do escopo de um projeto pessoal, documentados na seção 9 do `/docs`.

---

## Pontuação de segurança: 8,5 / 10

Não existe "10 de 10" honesto pra software nenhum — a nota reflete onde a aplicação está, não uma promessa de invulnerabilidade.

- **Arquitetura e criptografia (o que mais importa): 9/10.** Zero-knowledge genuíno, chave que nunca sai do dispositivo, AES-256-GCM com IV correto, PBKDF2 600k, RLS por linha, CSP restritiva — nenhum achado de arquitetura aberto depois de quatro rodadas de revisão.
- **Processo e defesa em profundidade: forte e crescente.** Testes automatizados, CI obrigatório, SAST, Dependabot, rate limiting de borda, CAPTCHA nos três fluxos de autenticação, monitoramento externo — camadas que a maioria dos projetos pessoais (e vários comerciais) não tem.
- **O que impede um 9 ou 10 puro:** um item de configuração manual ainda sem confirmação (leaked password protection — resolve em um clique, quando você fizer), CVEs médias do Next.js ainda abertas (risco baixo pra este app específico, mas presentes), e a ausência estrutural de auditoria externa/pentest/bug bounty que só um produto comercial maduro acumula — essa última diferença é permanente até que exista, por design, não é algo que "ajusto amanhã".

Comparado à última nota que dei (8, antes desta rodada): subiu porque o CAPTCHA fechou um gap real que estava aberto desde a v1, testado e confirmado, sem introduzir nenhum achado novo — e a limpeza de documentação, embora não seja uma correção de vulnerabilidade, remove um risco de "confiar em informação desatualizada" que também conta.
