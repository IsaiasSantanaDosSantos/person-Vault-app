# Modelos de e-mail do Supabase Auth — em português

13 modelos completos, com a paleta visual do Cofre (fundo escuro, dourado, mesmo ícone do app), estrutura em **tabelas HTML** (o padrão mais compatível entre clientes de e-mail — o Outlook desktop em particular renderiza com o motor do Word, que não suporta bem `flexbox`/`grid` mas suporta `<table>` desde sempre), CSS inline em cada elemento, e as mesmas variáveis `{{ .Algo }}` dos modelos originais, sem nenhuma alteração.

## Onde colar cada um

No painel do Supabase: **Authentication → Emails → Modelos** (a tela de abas que você já usou pra ativar o SMTP). Cada aba tem um campo de **Assunto** e um de **Corpo da mensagem** — cole o HTML do arquivo correspondente no corpo, e o assunto sugerido abaixo (opcional, mas ajuda).

| Arquivo | Modelo no Supabase | Assunto sugerido |
|---|---|---|
| `01-confirm-signup.html` | Confirm signup | Confirme seu e-mail — Cofre |
| `02-invite-user.html` | Invite user | Você foi convidado pro Cofre |
| `03-magic-link.html` | Magic Link | Seu link de acesso ao Cofre |
| `04-change-email.html` | Change Email Address | Confirme seu novo e-mail — Cofre |
| `05-reset-password.html` | Reset Password | Redefinir sua senha — Cofre |
| `06-reauthentication-otp.html` | Reauthentication | Seu código de verificação — Cofre |
| `07-password-changed.html` | Password changed | Sua senha foi alterada — Cofre |
| `08-email-changed.html` | Email changed | Seu e-mail foi alterado — Cofre |
| `09-phone-changed.html` | Phone changed | Seu telefone foi alterado — Cofre |
| `10-signin-method-linked.html` | Sign-in method linked | Novo método de login vinculado — Cofre |
| `11-signin-method-removed.html` | Sign-in method removed | Método de login removido — Cofre |
| `12-verification-method-added.html` | Verification method added | Novo método de verificação — Cofre |
| `13-verification-method-removed.html` | Verification method removed | Método de verificação removido — Cofre |

## Modelos que este app usa hoje

Só **`01-confirm-signup`** (cadastro) e **`05-reset-password`** (esqueci minha senha) são realmente enviados pelo fluxo atual. Os outros 11 não têm nenhum gatilho no código hoje (magic link, convite, MFA por e-mail, etc.) — mas já ficam prontos, traduzidos e com a identidade visual certa, caso algum dia sejam usados.

## Decisões de design

- **Paleta exata** do `tailwind.config.ts`: fundo `#0E1113`, painel `#161A1D`, borda `#262B2F`, dourado `#F5DF4E`, texto `#E7E9EA`, texto apagado `#8A9096`, alerta `#C4634F`.
- **Fonte:** Arial/Helvetica (fonte do sistema) em vez da Poppins do app — fontes customizadas não têm suporte confiável em e-mail, então usar uma fonte do sistema garante consistência visual em todos os clientes.
- **Logo:** `https://pessoal-vault-app-flax.vercel.app/icons/icon-512.png` — URL absoluta (obrigatório em e-mail, URL relativa não funciona).
- **Botões:** técnica de "botão à prova de bugs" — uma célula de tabela com a cor de fundo, não um `<a>` com padding solto, que o Outlook costuma bagunçar.
- **Modelos de alerta de segurança** (senha/e-mail/telefone alterados, método de login vinculado/removido) têm uma caixa com borda vermelha e link direto (`mailto:`) pro e-mail de suporte (`lib/constants.ts` → `SUPPORT_EMAIL`) — se esse e-mail mudar no app, atualize aqui também, é texto fixo, não uma variável.
- **`05-reset-password`** tem uma nota extra explicando que isso troca só a senha da **conta**, não a senha **mestra** — evita confusão, já que é a dúvida mais comum sobre o app.
- Todos incluem a linha "O Cofre nunca vai te pedir sua senha mestra ou a senha da conta por e-mail" no rodapé — mensagem anti-phishing, prática padrão de qualquer gerenciador de senhas sério.

## Limitação conhecida

Não testei a renderização real em clientes de e-mail (Gmail, Outlook, Apple Mail, etc.) — validei a estrutura HTML e abri os arquivos num navegador, mas não tenho como simular como cada webmail específico processa o CSS. Se algo ficar estranho em algum cliente específico, me avise com um print que eu ajusto.
