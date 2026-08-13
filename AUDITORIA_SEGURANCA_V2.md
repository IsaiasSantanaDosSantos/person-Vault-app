# Auditoria de Segurança — Cofre de Senhas Pessoal (v2)

**Data:** 2026-08-13
**Relação com a primeira auditoria:** este documento **não substitui** [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md) — ele audita especificamente as mudanças feitas *depois* daquela primeira rodada (sessão persistente, botão de logoff, edição de itens, ícone em mais lugares) e reconfirma que as correções da v1 continuam de pé. Leia a v1 primeiro se quiser o histórico completo de achados e o que já tinha sido corrigido antes desta rodada.

---

## O que mudou desde a v1 (escopo desta auditoria)

| Mudança | Arquivos |
|---|---|
| Ícone do app substituindo o cadeado genérico (SVG) na tela de login | `app/login/page.tsx` |
| Sessão da conta passa a persistir ao recarregar — só a senha mestra é pedida de novo | `app/login/page.tsx` |
| Botão "Sair da conta" na etapa de senha mestra | `app/login/page.tsx` |
| Edição de itens salvos (antes só criar/excluir) | `components/PasswordFormModal.tsx` (novo, substitui `AddPasswordModal.tsx`), `components/PasswordCard.tsx`, `app/vault/page.tsx`, `lib/vaultStore.ts` (`updateItem`) |

---

## 1. Ícone em vez do cadeado genérico

**O que mudou:** o SVG `<LockIcon />` na tela de login foi trocado por `<img src="/icons/icon-192.png">`. Busquei em todo o código-fonte (`grep` por `<svg`, `LockIcon`, `icon.png`) e essa era a única imagem de marca "genérica" fora da barra de navegação (o `TrashIcon` do `PasswordCard.tsx` é um ícone funcional de "excluir", não de marca — mantive como estava).

**Análise de segurança:** nenhuma. É uma troca de asset estático servido do próprio domínio (`/icons/icon-192.png`, já coberto pelo `img-src 'self'` da CSP). Confirmei via `read_page`/`read_network_requests` no navegador que a imagem carrega com `200 OK` e nenhuma violação de CSP ocorre.

---

## 2. Sessão persistente ao recarregar (só a senha mestra é pedida de novo)

**Sua pergunta original:** "por que mesmo depois de logado, se recarregar a página pede pra logar de novo? É normal, é de segurança?"

**Resposta:** era **parcialmente** intencional e parcialmente uma folga na experiência que não tinha necessidade de existir. Dois segredos diferentes estão em jogo aqui, e cada um se comporta diferente ao recarregar:

1. **A sessão da sua conta** (login por e-mail/senha, gerenciada pelo Supabase Auth) — fica salva em `localStorage` pelo SDK do Supabase e **sobrevive** a um reload. Isso sempre foi assim.
2. **A chave de criptografia derivada da sua senha mestra** — vive só em memória RAM (`lib/keyStore.ts`) e **some** ao recarregar, por design: é isso que garante que a chave nunca toque disco. Essa parte é, sim, uma decisão de segurança deliberada, e eu a mantive exatamente como estava.

O problema era que a tela de login **não verificava** se a sessão (#1) já existia — sempre mostrava o formulário de e-mail/senha do zero, mesmo a sessão do Supabase já sendo válida. Ou seja, você era obrigado a redigitar e-mail+senha da conta *e* a senha mestra, quando só a segunda redigitação tinha motivo real de segurança.

**O que corrigi:** a tela de login agora checa se já existe uma sessão Supabase válida ao carregar (`supabase.auth.getSession()`) e, se existir, pula direto pra etapa "Digite sua senha mestra" — sem pedir e-mail/senha de novo. A senha mestra continua sendo exigida sempre, sem exceção.

**Isso enfraquece a segurança?** Não. O token de sessão do Supabase já estava em `localStorage` e já era válido para fazer requisições à API mesmo com a tela de login "escondendo" esse fato atrás de um formulário — ou seja, o formulário de e-mail/senha reaparecendo não adicionava proteção nenhuma contra um atacante que já tivesse acesso ao dispositivo ou ao `localStorage` (via XSS, por exemplo); só te incomodava. A fronteira de segurança real sempre foi, e continua sendo, a chave derivada da senha mestra — que nunca é persistida e sempre precisa ser redigitada. Considero essa mudança **puramente de UX, sem impacto negativo em segurança**, e ela também é coberta pela CSP (achado #3 da v1): se um atacante não consegue rodar script arbitrário na página, não consegue ler esse token de `localStorage` de qualquer forma.

---

## 3. Botão "Sair da conta" na etapa de senha mestra

Com a mudança acima, é possível cair direto na tela "Digite sua senha mestra" sem nunca ver a tela de e-mail/senha — inclusive se o dispositivo for compartilhado e outra pessoa abrir o app. Sem um jeito de sair dali, a única opção seria fechar a aba (a sessão Supabase continuaria válida). Adicionei um link "Não é você? Sair da conta", que chama `clearKey()` + `supabase.auth.signOut()` e volta pro formulário de e-mail/senha do zero.

**Análise de segurança:** positiva — reduz o risco de alguém ficar "preso" numa sessão alheia em dispositivo compartilhado. Sem efeitos colaterais negativos (é a mesma lógica do botão "Sair" que já existia dentro do cofre, em `app/vault/page.tsx`).

---

## 4. Edição de itens salvos

**Antes:** só era possível criar ou excluir um item — pra trocar uma senha, era preciso excluir e recriar (perdendo o histórico de `created_at` e correndo risco de erro).

**O que mudou:**
- `lib/vaultStore.ts`: nova função `updateItem(id, { label, username, password })`, que faz um `UPDATE` na tabela `vault_items`.
- `components/PasswordCard.tsx`: novo botão "Editar" — descriptografa a senha atual do item (reaproveitando a mesma chave em memória, do mesmo jeito que o botão "Ver" já fazia) e entrega pro componente pai.
- `components/PasswordFormModal.tsx` (renomeado de `AddPasswordModal.tsx`, que fazia só a parte de criar): agora aceita um modo de edição — pré-preenche os campos com os dados atuais (incluindo a senha já descriptografada) e, ao salvar, criptografa de novo (com um IV novo e aleatório, como sempre) e chama `updateItem` em vez de `addItem`.

**Pontos verificados nesta auditoria:**

- ✅ **RLS cobre `UPDATE` corretamente.** A política já existia desde a v1 (`supabase/schema.sql`): `create policy "items: update own" on vault_items for update using (auth.uid() = user_id);`. Como não há uma cláusula `WITH CHECK` explícita, o PostgreSQL usa a própria expressão do `USING` também como `WITH CHECK` — ou seja, mesmo sem eu precisar adicionar nada, o banco já impede tanto (a) atualizar uma linha que não é sua quanto (b) uma linha seguir pertencendo a você depois do update mas ser "roubada" trocando o `user_id`. Testei a lógica lendo a documentação oficial do Postgres sobre `CREATE POLICY` pra confirmar esse comportamento implícito antes de declarar isso seguro.
- ✅ **`updateItem` não manipula `user_id`.** O update só toca `label`, `username`, `password_iv`, `password_ciphertext` — mesmo que alguém tentasse adulterar a chamada no client, o RLS acima impediria a reatribuição de dono.
- ✅ **Sem aumento de exposição de texto plano.** A senha descriptografada pro formulário de edição fica só em estado do React (mesma memória onde já ficava ao clicar em "Ver"), nunca é persistida, e some quando o modal fecha (`setEditing(null)`).
- ✅ **IV sempre novo a cada edição.** Reencriptar o mesmo texto (mesmo se você não mudar a senha, só o rótulo) sempre gera um IV aleatório novo — AES-GCM exige isso, e o código já fazia isso corretamente desde a v1 (`encryptText`), então não há reuso de IV entre a versão antiga e a nova do item.
- 🟡 **Sem tratamento de erro na submissão do formulário** (`handleSubmit` em `PasswordFormModal.tsx`): se o `updateItem`/`addItem` falhar (ex: perda de conexão), o erro sobe como uma promise rejeitada sem mensagem pro usuário — o botão "Salvando..." pode ficar preso visualmente até você recarregar. **Isso não é uma falha de segurança** (nenhum dado é exposto ou corrompido), é uma lacuna de robustez de UX que já existia desde a v1 no fluxo de criar item — não é uma regressão desta mudança, só não foi corrigida. Fica como sugestão de melhoria futura, não bloqueante.

---

## Reconfirmação das correções da v1

Rodei `npm run build` de novo depois de todas essas mudanças (login, edição, ícone): compilação, checagem de tipos e lint passaram sem erros, e a rota de `middleware.ts` (CSP) continua presente no build. As correções da v1 que dependiam de código continuam intactas:

- PBKDF2 600k por perfil novo (com `iterations` salvo por usuário) — inalterado.
- CSP com nonce + headers de segurança (`middleware.ts`, `next.config.mjs`) — inalterado, e a tela de login (agora com um `useEffect` a mais) continua funcionando normalmente sob a política restrita.
- Next.js 14.2.35 — inalterado.
- Bloqueio por inatividade (5 min) na tela do cofre — inalterado; a nova checagem de sessão na tela de login não interfere nisso (são componentes/rotas diferentes).
- Limites de tamanho no schema — inalterado.
- Gerador de senha sem viés e campo de senha oculto por padrão — inalterado (o código de geração foi só copiado de `AddPasswordModal.tsx` pra `PasswordFormModal.tsx`, sem mudanças).

---

## Ações manuais pendentes (repetidas da v1 — ainda valem)

Se você ainda não fez isso desde a última auditoria, continuam pendentes:

1. Rodar `supabase/schema.sql` de novo no SQL Editor do Supabase (coluna `iterations` + limites de tamanho).
2. Habilitar MFA (TOTP) em Authentication → Providers.
3. Habilitar "Leaked password protection" em Authentication → Settings.
4. Configurar rate limiting / CAPTCHA no login e signup.
5. Redefinir a senha mestra do seu cofre atual, se quiser migrar de 250k pra 600k iterações de PBKDF2 (opcional — o cofre continua seguro em 250k, só com uma margem menor).

---

## A aplicação está "100% segura"?

Preciso responder isso com honestidade técnica: **não existe "100% seguro" em software — nem para produtos comerciais auditados por equipes inteiras, muito menos para qualquer app individual.** Dizer o contrário seria uma promessa que eu não posso garantir de forma responsável. O que posso afirmar, com base na revisão linha a linha feita nas duas rodadas desta auditoria:

- Não encontrei nenhuma vulnerabilidade **conhecida e não mitigada** no código revisado (criptografia, controle de acesso, cabeçalhos HTTP, dependências, e agora também os fluxos de sessão e edição).
- A arquitetura de ponta a ponta (zero-knowledge, chave nunca sai do dispositivo, RLS por linha) está correta e as primitivas criptográficas usadas (AES-256-GCM, PBKDF2-SHA256 com custo atualizado) seguem recomendações atuais.
- As camadas de defesa em profundidade que faltavam (CSP, cabeçalhos de segurança, força da senha mestra, bloqueio por inatividade) foram adicionadas.
- O que resta pendente (itens 1–5 acima) depende de ações fora do código — no painel do Supabase ou na sua própria rotina de uso (trocar a senha mestra) — e são as últimas peças pra fechar a margem de segurança que a v1 identificou.

Com o checklist de ações manuais concluído, considero esta aplicação **adequada para guardar senhas de qualquer nível de criticidade que você seria responsável por proteger sozinho de qualquer forma** (bancárias, cartão, servidores pessoais) — com o entendimento de que isso é diferente da garantia de um produto comercial com equipe de segurança dedicada, resposta a incidentes 24/7 e testes de penetração contínuos por terceiros independentes, que nenhuma auditoria única (feita por mim ou por qualquer pessoa) consegue substituir.
