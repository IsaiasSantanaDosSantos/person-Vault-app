# Auditoria de Segurança — Cofre de Senhas Pessoal

**Data da auditoria:** 2026-08-13 (correções aplicadas em 2026-08-13)
**Escopo:** Código-fonte completo do repositório (`app/`, `components/`, `lib/`, `supabase/schema.sql`, configs, dependências), com foco na pergunta central: **este app é seguro o suficiente para guardar senhas de qualquer nível de criticidade (bancárias, cartão, servidores)?**
**Método:** Revisão manual linha a linha de todo o fluxo de criptografia, autenticação e armazenamento, análise das políticas de Row Level Security do Supabase, verificação de segredos expostos no código, e varredura de dependências (`npm audit`).

> Este projeto não é um repositório git, então esta auditoria foi feita manualmente sobre o estado atual dos arquivos (não foi possível usar o fluxo padrão de `/security-review` baseado em diff).

> **Atualização:** todos os achados de prioridade Alta e Média marcados como código (não configuração externa do painel do Supabase) foram corrigidos nesta mesma sessão. O status de cada um está marcado inline abaixo. Itens que dependem de configuração no painel do Supabase (MFA, rate limiting, leaked password protection) continuam pendentes e exigem ação manual — ver checklist no fim do documento.

---

## Veredito executivo

A arquitetura é **fundamentalmente correta e bem projetada**: é um modelo *zero-knowledge* de verdade — a senha mestra nunca sai do navegador, a chave de criptografia nunca é enviada ao servidor, e o Supabase só enxerga texto cifrado. Isso é o requisito mínimo indispensável para confiar segredos de alto valor a um app assim, e o projeto cumpre esse requisito corretamente.

**Porém, no estado atual, eu não recomendaria usá-lo para senhas de banco, cartão ou servidores de produção sem antes aplicar as correções da seção "Prioridade Alta" abaixo.** Nenhum dos problemas encontrados quebra a arquitetura de ponta a ponta, mas somados eles reduzem a margem de segurança justamente no ponto que mais importa para segredos desse nível: a resistência a um ataque de força bruta offline contra a senha mestra, e a superfície de exposição em caso de XSS.

Depois de aplicadas as correções listadas, a aplicação fica em um patamar sólido para uso pessoal com segredos sensíveis. Ainda assim, vale o alerta honesto: nenhum app pessoal auto-hospedado, por melhor que seja o código, tem o mesmo nível de escrutínio, testes de penetração contínuos e resposta a incidentes de produtos dedicados e amplamente auditados (Bitwarden, 1Password, KeePass). Para senhas realmente irrecuperáveis em caso de erro (ex: acesso root de servidores críticos), considere isso no seu cálculo de risco.

---

## O que foi analisado

| Área | Arquivos |
|---|---|
| Criptografia client-side | `lib/crypto.ts` |
| Gestão da chave em memória | `lib/keyStore.ts` |
| Acesso a dados / Supabase | `lib/vaultStore.ts`, `lib/supabaseClient.ts` |
| Autenticação e fluxo de login | `app/login/page.tsx`, `app/page.tsx` |
| Tela do cofre e exibição de senhas | `app/vault/page.tsx`, `components/PasswordCard.tsx`, `components/AddPasswordModal.tsx` |
| Banco de dados e controle de acesso | `supabase/schema.sql` (RLS) |
| PWA / Service Worker | `public/sw.js`, `public/manifest.json`, `components/ServiceWorkerRegister.tsx` |
| Configuração e segredos | `next.config.mjs`, `.env.local.example`, `.gitignore`, `package.json` |
| Dependências | `npm audit` sobre `package-lock.json` |

---

## ✅ Pontos positivos (o que já está correto)

1. **Arquitetura zero-knowledge genuína.** A senha mestra nunca é transmitida ao servidor (`lib/crypto.ts:1-11`, confirmado no fluxo de `app/login/page.tsx`). Apenas `iv` + `ciphertext` chegam ao Supabase.
2. **Primitivas criptográficas corretas e bem usadas:**
   - AES-256-GCM com IV aleatório de 96 bits gerado a cada operação de criptografia (`lib/crypto.ts:66`), nunca reutilizado — isso é essencial para a segurança do GCM e está implementado certo.
   - PBKDF2-HMAC-SHA256 com salt aleatório de 128 bits **único por usuário** (`generateSalt`, `lib/crypto.ts:30-33`).
   - A `CryptoKey` derivada é marcada `extractable: false` (`lib/crypto.ts:55`) — o próprio app não consegue exportar a chave crua, reduzindo superfície de erro de implementação.
3. **Verificador de senha mestra bem desenhado em princípio:** em vez de guardar a senha mestra ou um hash dela, o app cifra uma string fixa conhecida (`makeVerifier`) e testa a descriptografia — a senha mestra em si nunca é persistida em lugar nenhum (ver ressalva sobre força de brute-force na seção de achados).
4. **Row Level Security habilitada e correta** em `vault_profiles` e `vault_items` (`supabase/schema.sql:29-57`): todas as políticas usam `auth.uid() = user_id`, cobrindo `select`/`insert`/`update`/`delete` nos itens. Um usuário autenticado não consegue ler nem escrever linhas de outro usuário via API do Supabase.
5. **Nenhum segredo sensível hardcoded no código-fonte.** Busquei por `service_role`, chaves secretas, etc. — as únicas ocorrências estão em artefatos de build de terceiros (`.next/`), não no código da aplicação. Apenas a chave `anon` pública do Supabase é usada no client, que é o uso correto (a segurança real fica por conta do RLS, não do sigilo dessa chave).
6. **`.env.local` está no `.gitignore`** — segredos de ambiente não vazam para controle de versão.
7. **Minimização de exposição de texto plano:** a lista de itens do cofre guarda só o ciphertext em estado do React; a descriptografia acontece sob demanda, item por item, só quando o usuário clica em "Ver" (`components/PasswordCard.tsx:19-37`), e a senha revelada some sozinha após 20 segundos.
8. **Chave em memória, nunca em disco:** `lib/keyStore.ts` guarda a chave só numa variável de módulo (RAM), que desaparece ao recarregar a página — não vai para `localStorage`, `sessionStorage` nem cookie. Isso é o design correto para minimizar persistência de segredo.
9. **Sem `dangerouslySetInnerHTML`, `eval` ou `innerHTML`** em nenhum arquivo do código-fonte da aplicação — o React já escapa conteúdo dinâmico por padrão, e o app não introduz pontos óbvios de XSS.
10. **HTTPS é pré-requisito de fato**, já que a Web Crypto API (`crypto.subtle`) só funciona em contexto seguro — isso força deploy com TLS (ex: Vercel).

---

## 🔴 Prioridade Alta (corrigir antes de guardar segredos de alto valor)

### ✅ 1. Custo de derivação de chave (PBKDF2) abaixo do recomendado atualmente — CORRIGIDO
**Onde:** `lib/crypto.ts`, `supabase/schema.sql`, `lib/vaultStore.ts`, `app/login/page.tsx`

Perfis novos agora usam `DEFAULT_PBKDF2_ITERATIONS = 600_000` (recomendação OWASP 2023+ para PBKDF2-HMAC-SHA256), contra os `250_000` originais.

**Detalhe importante da implementação:** simplesmente trocar a constante quebraria o login e a descriptografia de qualquer cofre já existente — a chave AES muda por completo se o número de iterações mudar, então um perfil criado com 250k teria seu verificador e todos os itens tornados ilegíveis se o app passasse a derivar com 600k. Por isso, o número de iterações agora é **salvo por perfil** (`vault_profiles.iterations`, nova coluna) em vez de ser uma constante fixa: perfis antigos continuam usando o valor com que foram criados (250k, valor padrão da coluna pra quem já tinha cofre), perfis novos já nascem em 600k.

> ⚠️ **Ação necessária:** rode novamente `supabase/schema.sql` no SQL Editor do seu projeto Supabase — ele é idempotente e adiciona a coluna `iterations` sem quebrar nada existente. Sem rodar isso, `createProfile` vai falhar ao tentar gravar uma coluna que não existe.
>
> Cofres já criados continuam em 250k iterações até você trocar a senha mestra (recriando o perfil) — não há hoje um fluxo de "trocar senha mestra" implementado (é uma limitação pré-existente do app, não desta correção).

**Pendente (não implementado):** migrar de PBKDF2 para Argon2id seria o próximo passo para robustez máxima contra hardware dedicado (GPU/ASIC), mas exige uma lib adicional (`hash-wasm` ou similar) — não apliquei por ser uma mudança maior de dependência; deixo como recomendação futura.

### ✅ 2. Nenhuma exigência real de força para a senha mestra — CORRIGIDO
**Onde:** `lib/passwordStrength.ts` (novo), `app/login/page.tsx`

Senha mestra agora exige no mínimo 12 caracteres, bloqueia uma lista de senhas comuns, e exige pelo menos 2 das 4 categorias (minúsculas/maiúsculas/números/símbolos). Adicionei também um medidor de força visual (barra + rótulo "Fraca/Razoável/Boa/Forte") que aparece ao digitar. Isso só se aplica à **criação** de senha mestra — logins em perfis existentes continuam aceitando a senha já definida, mesmo que tenha menos de 12 caracteres.

**Pendente (não implementado):** checagem contra vazamentos conhecidos via k-anonymity do Have I Been Pwned — não apliquei porque exigiria uma chamada de rede externa a cada tentativa de senha mestra, o que eu não faria sem confirmar com você primeiro (mesmo com k-anonymity, é uma decisão de privacidade que vale perguntar).

### ✅ 3. Ausência total de cabeçalhos de segurança HTTP (CSP e afins) — CORRIGIDO
**Onde:** `middleware.ts` (novo), `next.config.mjs`

Adicionei uma Content-Security-Policy restritiva com nonce por requisição (`script-src 'self' 'nonce-...' 'strict-dynamic'`, sem `unsafe-inline` para scripts em produção), mais `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` em `next.config.mjs`. `connect-src` é restrito a `'self'` + a URL do seu projeto Supabase (lida de `NEXT_PUBLIC_SUPABASE_URL` em tempo de requisição).

**Detalhe importante:** o modo de desenvolvimento do Next.js (`npm run dev`) usa `eval()` internamente para hot-reload — testei isso ao vivo e a CSP inicial quebrou a aplicação inteira em dev. A correção libera `'unsafe-eval'` **somente quando `NODE_ENV === "development"`**; em produção (`npm run build && npm start`, ou deploy na Vercel) a política continua estrita, sem eval.

> Nota sobre o achado #4 original (token de sessão do Supabase em `localStorage`): essa CSP não elimina esse ponto, mas é a mitigação principal contra ele — sem conseguir rodar script arbitrário via XSS, um atacante não consegue ler `localStorage` para roubar o token, nem chamar `getKey()`/`decryptText()` para exfiltrar o cofre.

### ✅ 4. Next.js desatualizado — 1 CVE crítica pendente — CORRIGIDO (parcialmente)
**Onde:** `package.json` — `"next"` de `14.2.15` para `14.2.35`

A CVE crítica (GHSA-f82v-jwr5-mffw, bypass de autorização em Middleware) está corrigida nessa versão. As demais falhas que o `npm audit` ainda reporta (2 altas: DoS/SSRF em Server Actions e Server Components, e um path-traversal no `postcss` embutido no Next) só fecham de vez com Next.js 15.x — **não fiz essa migração** porque é um upgrade de versão maior (breaking changes reais: React 19, mudanças de API), que exige teste completo antes de aplicar. Na prática, o risco residual dessas falhas é baixo pra este app específico: nenhuma delas se aplica sem Server Actions, WebSocket upgrades, i18n do Pages Router ou servidor customizado — nada disso é usado aqui.

**Recomendação futura:** planejar a migração para Next.js 15 como um item separado, com tempo pra testar.

---

## 🟠 Prioridade Média

### ✅ 5. Sem bloqueio automático por inatividade — CORRIGIDO
**Onde:** `app/vault/page.tsx`

A tela do cofre agora trava sozinha (`clearKey()` + redireciona pro login) após **5 minutos sem interação** (sem mouse/teclado/toque/scroll). Isso não desloga da conta Supabase — só exige redigitar a senha mestra, igual já acontecia ao recarregar a página.

### ⏳ 6. Sem MFA (autenticação multifator) na conta — PENDENTE (config. externa)
Continua como limitação conhecida (`README.md`). Isso não dá pra corrigir só no código — precisa ser habilitado no painel do Supabase.

**Ação necessária (fora do código):** habilitar MFA (TOTP) em **Authentication → Providers** no painel do Supabase.

### 🟡 7. Requisitos da senha da conta — PARCIALMENTE CORRIGIDO
**Onde:** `app/login/page.tsx` — `minLength` subiu de `6` para `10` caracteres.

O que dá pra corrigir em código foi corrigido. O resto depende do painel do Supabase e continua pendente:
- **Leaked password protection** (bloqueia senhas vazadas conhecidas, via HIBP) em Authentication → Settings.
- **Rate limiting / CAPTCHA (hCaptcha/Turnstile)** no login e signup.

**Ação necessária (fora do código):** ativar as duas proteções acima no painel do Supabase.

### ✅ 8. Nenhuma validação de tamanho/formato no que é gravado no banco — CORRIGIDO
**Onde:** `supabase/schema.sql`

Adicionei `check constraints` limitando o tamanho de `label`, `username`, `password_iv`, `password_ciphertext`, `notes_iv` e `notes_ciphertext`. O script já tem um bloco `do $$ ... $$` que aplica os mesmos limites via `ALTER TABLE` caso as tabelas já existam (idempotente, seguro rodar de novo).

> ⚠️ **Ação necessária:** assim como no achado #1, isso só passa a valer depois que você rodar `supabase/schema.sql` de novo no SQL Editor do Supabase.

---

## 🟡 Prioridade Baixa / Informativo

### 9. Senha copiada fica na área de transferência do sistema — NÃO CORRIGIDO (limitação de plataforma)
**Onde:** `components/PasswordCard.tsx`

Continua como estava: o app limpa a área de transferência 30s depois de copiar, mas isso não alcança gerenciadores de histórico de área de transferência do sistema operacional. Não é algo que dá pra resolver só em código — é uma limitação da plataforma que qualquer gerenciador de senhas web enfrenta.

### ✅ 10. Leve viés estatístico no gerador de senha aleatória — CORRIGIDO
**Onde:** `components/AddPasswordModal.tsx`

Troquei `n % chars.length` sobre um `Uint32Array` (viés de módulo tecnicamente mensurável) por *rejection sampling* byte a byte: descarta valores que cairiam fora do maior múltiplo de `chars.length` que cabe em 0–255, eliminando o viés por completo.

### ✅ 11. Campo de senha ao adicionar item era visível por padrão — CORRIGIDO
**Onde:** `components/AddPasswordModal.tsx`

O campo de senha agora começa oculto (`type="password"`) com um botão "Mostrar/Ocultar" ao lado, reduzindo o risco de "shoulder surfing" ao digitar. Ao usar "Gerar", o campo abre automaticamente revelado (pra você poder conferir a senha gerada).

### 12. Sem trilha de auditoria / log de acessos — NÃO IMPLEMENTADO
Não há registro de quando um item foi visualizado/copiado, nem histórico de alterações. Não implementei por ser uma funcionalidade nova (não um ajuste de um problema existente) — fica como sugestão para uma iteração futura, caso queira rastrear uso indevido de credenciais de altíssimo valor.

---

## Resumo priorizado das correções

| # | Achado | Severidade | Status |
|---|---|---|---|
| 1 | PBKDF2 abaixo do recomendado | Alta | ✅ Corrigido (600k, por perfil) |
| 2 | Sem exigência real de força para senha mestra | Alta | ✅ Corrigido |
| 3 | Sem CSP / cabeçalhos de segurança | Alta | ✅ Corrigido |
| 4 | Next.js desatualizado (1 CVE crítica) | Alta | ✅ Corrigido (14.2.35) |
| 5 | Sem bloqueio automático por inatividade | Média | ✅ Corrigido (5 min) |
| 6 | Sem MFA na conta | Média | ⏳ Pendente — config. no painel Supabase |
| 7 | Senha de conta fraca + proteções Supabase não confirmadas | Média | 🟡 Parcial — código ok, config. Supabase pendente |
| 8 | Sem limites de tamanho no schema | Média | ✅ Corrigido |
| 9 | Persistência de clipboard no SO | Baixa | — Limitação de plataforma, não corrigível em código |
| 10 | Viés de módulo no gerador de senha | Baixa | ✅ Corrigido |
| 11 | Campo de senha visível por padrão no formulário | Baixa | ✅ Corrigido |
| 12 | Sem trilha de auditoria | Informativo | Não implementado (funcionalidade nova, fora de escopo) |

---

## ⚠️ Ações manuais pendentes (fora do código, precisam de você)

1. **Rodar `supabase/schema.sql` de novo** no SQL Editor do seu projeto Supabase — adiciona a coluna `iterations` (achado #1) e os `check constraints` de tamanho (achado #8). É idempotente, seguro rodar mesmo já tendo dados.
2. **Habilitar MFA (TOTP)** em Authentication → Providers no painel do Supabase (achado #6).
3. **Habilitar "Leaked password protection"** em Authentication → Settings (achado #7).
4. **Configurar rate limiting / CAPTCHA** (hCaptcha ou Cloudflare Turnstile) no login/signup, também em Authentication → Settings (achado #7).
5. **Redefinir sua senha mestra atual** (ou recriar o perfil) se quiser que seu cofre já existente passe a usar 600k iterações em vez de 250k — sem isso, ele continua protegido, só que com a margem antiga (achado #1).

---

## Rebranding e identidade visual (fora do escopo de segurança, feito na mesma sessão)

A pedido, também apliquei a identidade visual a partir das imagens em `img/`:

- **Ícones:** `public/icons/icon-192.png` e `icon-512.png` regenerados a partir de `img/icon.png`; `app/icon.png`, `app/apple-icon.png` e `app/favicon.ico` adicionados (convenção de arquivo do Next.js App Router — não precisam ser referenciados manualmente em lugar nenhum, o Next detecta e injeta as tags `<link>` sozinho).
- **Screenshots do manifest:** as 4 imagens de tela (`img/*-screen.png`) foram copiadas para `public/screenshots/` e referenciadas no novo campo `screenshots` do `manifest.json` (melhora a tela de instalação do PWA em navegadores compatíveis).
- **Cores da marca:** `manifest.json` atualizado com `theme_color: "rgb(245, 223, 78)"` (dourado, cor de destaque do ícone) e `background_color: "rgb(17, 20, 24)"` (fundo escuro, já era a cor de fundo do app). O manifest só tem esses dois campos de cor — o branco `rgb(255, 255, 255)` que você passou não tem um campo equivalente no manifest (ele já é usado como cor de texto no app via `vault-text`/Tailwind). `app/layout.tsx` (viewport `themeColor`) foi ajustado pra usar a mesma cor dourada do manifest.
- **Meta tag depreciada:** adicionado `<meta name="mobile-web-app-capable" content="yes">` (via `metadata.other` em `app/layout.tsx`, já que o app usa o App Router e não tem HTML estático). Mantive `apple-mobile-web-app-capable` junto, pois o Safari/iOS ainda depende dela.
- **Fonte Poppins:** troquei a fonte padrão (`font-sans`, usada em todo o app exceto campos de senha) de Inter para Poppins, via `next/font/google` — o que também tirou a dependência de `@import` do Google Fonts CDN no CSS, deixando a CSP mais restrita (não precisa mais liberar `fonts.googleapis.com`/`fonts.gstatic.com`). **Mantive a fonte monoespaçada (IBM Plex Mono) só nos campos de senha** (exibição/edição de senha), porque é uma escolha deliberada de legibilidade para diferenciar caracteres parecidos (`0`/`O`, `1`/`l`/`I`) — mudar isso pra Poppins tornaria senhas mais difíceis de conferir visualmente. Se você quiser Poppins ali também, é só avisar.
- **Ícone na barra do cofre:** adicionado à esquerda do texto "Cofre" em `app/vault/page.tsx`.

> **Nota sobre o teste local:** ao testar no seu ambiente, o download das fontes do Google (Poppins/IBM Plex Mono) falhou por um erro de certificado TLS (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`) — provavelmente algum proxy/antivírus interceptando HTTPS na rede local. O Next.js cai automaticamente pra fonte padrão do sistema nesse caso (não quebra o build nem a aplicação), mas a Poppins pode não aparecer visualmente até isso ser resolvido localmente (ex: checar se antivírus/VPN está inspecionando TLS) — em produção (deploy na Vercel) isso não deve ocorrer, já que o build roda na infraestrutura da Vercel, fora dessa rede.

---

## Conclusão

O projeto acerta no que mais importa estruturalmente: **criptografia de ponta a ponta genuína, com primitivas corretas e chave que nunca sai do dispositivo do usuário**. Isso já coloca o app à frente da maioria dos projetos pessoais desse tipo, que costumam errar justamente nos fundamentos (ex: mandar senha mestra pro servidor, reusar IV, guardar chave em `localStorage`).

Todos os achados de prioridade Alta, e a maior parte dos de prioridade Média que dependiam só de código, foram corrigidos nesta sessão (build de produção validado, sem erros de tipo/lint). Os itens que restam pendentes (MFA, leaked password protection, rate limiting) dependem de configuração manual no painel do Supabase — não são coisas que eu consiga aplicar pelo código — e estão listados no checklist acima.

Com as correções aplicadas **e** o checklist de ações manuais concluído, considero o app **adequado para uso pessoal com segredos sensíveis, incluindo senhas de banco, cartão e servidores**, com a ressalva permanente de que qualquer solução auto-hospedada e não auditada por terceiros carrega um risco residual maior do que um produto comercial maduro e continuamente testado por uma equipe de segurança dedicada.
