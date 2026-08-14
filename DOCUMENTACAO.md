# Vault — Cofre pessoal

App pessoal de senhas. Toda a criptografia (AES-256-GCM) acontece no
navegador — o Supabase nunca vê uma senha em texto puro, só o
ciphertext. A "senha mestra" que você define nunca é enviada ao
servidor.

## 1. Criar o projeto no Supabase (grátis)

1. Crie uma conta em https://supabase.com e um novo projeto (free tier).
2. No painel, vá em **SQL Editor** e cole o conteúdo de
   `supabase/schema.sql`. Rode. Isso cria as tabelas `vault_profiles`
   e `vault_items`, já com Row Level Security ativado (cada usuário só
   enxerga os próprios dados).
3. Vá em **Authentication → Providers** e confirme que "Email" está
   habilitado (vem habilitado por padrão).
   - Opcional: em **Authentication → Settings**, você pode desativar
     "Confirm email" pra não precisar confirmar por e-mail toda vez
     que testar (reative depois se quiser mais segurança).
4. Vá em **Project Settings → API** e copie:
   - `Project URL`
   - `anon public` key

## 2. Configurar o projeto localmente

```bash
npm install
cp .env.local.example .env.local
```

Cole a URL e a chave anon no `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Rode local pra testar:

```bash
npm run dev
```

Abra http://localhost:3000 — crie uma conta (e-mail + senha da conta),
depois defina sua **senha mestra** (é diferente da senha da conta — é
ela que criptografa os dados).

## 3. Deploy no Vercel (grátis)

1. Suba este projeto num repositório no GitHub.
2. Em https://vercel.com, "New Project" → importe o repositório.
3. Em **Environment Variables**, adicione as mesmas duas variáveis do
   `.env.local` (`NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy. Pronto, seu app está no ar com HTTPS (obrigatório pra Web
   Crypto API funcionar).

## 4. Instalar como app no celular (PWA)

- **Android (Chrome)**: abra o link do Vercel → menu (⋮) → "Adicionar
  à tela inicial" / "Instalar app".
- **iPhone (Safari)**: abra o link → ícone de compartilhar → "Adicionar
  à Tela de Início".

O `manifest.json` e o service worker já estão configurados pra isso
funcionar sem passos extras.

## Como funciona a segurança, resumido

- Senha da **conta** (Supabase Auth): controla o login, é a
  autenticação padrão.
- Senha **mestra**: nunca sai do seu dispositivo. Dela é derivada (via
  PBKDF2, 250 mil iterações) uma chave AES-256 que fica só na memória
  RAM da aba aberta — não vai pra localStorage, cookie nem servidor.
- Cada senha salva é criptografada com essa chave antes de ir pro
  Supabase. O banco guarda só `iv` + `ciphertext` — dados ilegíveis
  sem a chave.
- Se você recarregar a página, a chave em memória some por design —
  você precisa redigitar a senha mestra. Isso evita que a chave fique
  "esquecida" em algum lugar acessível.
- **Se você esquecer a senha mestra, não tem como recuperar as senhas
  salvas.** Não existe um "esqueci minha senha" para ela — isso é o
  preço de garantir que nem o próprio backend consiga descriptografar
  seus dados.

## Limitações desta versão (pra evoluir depois)

- Sem campo de notas na UI (o banco já suporta, só falta o formulário).
- Sem 2FA na conta Supabase (dá pra ativar depois em
  Authentication → Providers).
