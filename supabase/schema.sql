-- Rode este script no SQL Editor do seu projeto Supabase.

-- Perfil de criptografia: salt (público, não é segredo) + verificador
-- (uma string fixa criptografada, usada só para checar se a senha
-- mestra digitada está correta — nunca guarda a senha mestra em si).
create table if not exists vault_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  salt text not null,
  verifier_iv text not null,
  verifier_ciphertext text not null,
  -- Número de iterações do PBKDF2 usado para derivar a chave deste
  -- usuário. Fica fixo por perfil desde a criação: a chave muda por
  -- completo se esse número mudar, então nunca deve ser alterado sem
  -- reencriptar tudo (troca de senha mestra). Perfis criados antes
  -- dessa coluna existir assumem 250000 (default abaixo), que era a
  -- constante fixa usada no código até então.
  iterations integer not null default 250000,
  created_at timestamptz default now()
);

-- Backfill idempotente pra quem já rodou o script antes desta coluna existir.
alter table vault_profiles add column if not exists iterations integer not null default 250000;

-- Itens do cofre. label e username ficam em texto puro (não são segredo
-- crítico e facilitam listar/buscar); password e notes vão sempre
-- criptografados (iv + ciphertext em base64).
create table if not exists vault_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  username text check (char_length(username) <= 200),
  password_iv text not null check (char_length(password_iv) <= 64),
  password_ciphertext text not null check (char_length(password_ciphertext) <= 20000),
  notes_iv text check (char_length(notes_iv) <= 64),
  notes_ciphertext text check (char_length(notes_ciphertext) <= 20000),
  created_at timestamptz default now()
);

-- Se as tabelas já existiam antes dos limites de tamanho acima (CREATE
-- TABLE IF NOT EXISTS não altera tabelas existentes), os blocos abaixo
-- adicionam os mesmos limites via ALTER TABLE, sem erro se já existirem.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'vault_items_label_check') then
    alter table vault_items add constraint vault_items_label_check check (char_length(label) between 1 and 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_items_username_check') then
    alter table vault_items add constraint vault_items_username_check check (char_length(username) <= 200);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_items_password_iv_check') then
    alter table vault_items add constraint vault_items_password_iv_check check (char_length(password_iv) <= 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_items_password_ciphertext_check') then
    alter table vault_items add constraint vault_items_password_ciphertext_check check (char_length(password_ciphertext) <= 20000);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_items_notes_iv_check') then
    alter table vault_items add constraint vault_items_notes_iv_check check (char_length(notes_iv) <= 64);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'vault_items_notes_ciphertext_check') then
    alter table vault_items add constraint vault_items_notes_ciphertext_check check (char_length(notes_ciphertext) <= 20000);
  end if;
end $$;

-- Compartilhamento de uma senha por link. Cada compartilhamento usa uma
-- chave AES-256 nova e aleatória, gerada só pra ele — sem nenhuma
-- relação com a senha mestra ou com a chave do cofre. Essa chave nunca
-- é salva aqui nem em lugar nenhum do servidor: ela vive só no
-- fragmento da URL (depois do #), que o navegador nunca envia a
-- nenhum servidor. Esta tabela só guarda o ciphertext — inútil sem a
-- chave que só quem recebeu o link tem.
create table if not exists shared_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  label text not null check (char_length(label) between 1 and 200),
  username text check (char_length(username) <= 200),
  password_iv text not null check (char_length(password_iv) <= 64),
  password_ciphertext text not null check (char_length(password_ciphertext) <= 20000),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  -- Teto de segurança de 24h, garantido no banco (não só na interface).
  constraint shared_items_expires_at_range check (
    expires_at > created_at and expires_at <= created_at + interval '24 hours'
  )
);

alter table vault_profiles enable row level security;
alter table vault_items enable row level security;
alter table shared_items enable row level security;

-- Quem cria o compartilhamento só mexe nos próprios: cria, lista
-- (inclusive os já expirados, pra conseguir ver o histórico) e revoga
-- quando quiser.
drop policy if exists "shared: owner insert" on shared_items;
create policy "shared: owner insert" on shared_items
  for insert with check (auth.uid() = owner_id);

drop policy if exists "shared: owner select" on shared_items;
create policy "shared: owner select" on shared_items
  for select using (auth.uid() = owner_id);

drop policy if exists "shared: owner delete" on shared_items;
create policy "shared: owner delete" on shared_items
  for delete using (auth.uid() = owner_id);

-- Única exceção "pública" deste banco: quem abre o link do
-- compartilhamento não está logado como o dono, então precisa
-- conseguir ler pelo ID — mas só enquanto não tiver expirado. O ID
-- (UUID aleatório, praticamente impossível de adivinhar) + a chave na
-- URL são o segredo, não uma sessão de usuário.
drop policy if exists "shared: public read valid" on shared_items;
create policy "shared: public read valid" on shared_items
  for select using (expires_at > now());

-- Cada usuário só acessa as próprias linhas.
-- O DROP POLICY IF EXISTS antes de cada CREATE torna o script seguro
-- para rodar mais de uma vez (idempotente).
drop policy if exists "profile: select own" on vault_profiles;
create policy "profile: select own" on vault_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profile: insert own" on vault_profiles;
create policy "profile: insert own" on vault_profiles
  for insert with check (auth.uid() = user_id);

-- Necessária pro recurso de "excluir todos os dados" (apaga o perfil de
-- criptografia, sem apagar a conta de login em si).
drop policy if exists "profile: delete own" on vault_profiles;
create policy "profile: delete own" on vault_profiles
  for delete using (auth.uid() = user_id);

drop policy if exists "items: select own" on vault_items;
create policy "items: select own" on vault_items
  for select using (auth.uid() = user_id);

drop policy if exists "items: insert own" on vault_items;
create policy "items: insert own" on vault_items
  for insert with check (auth.uid() = user_id);

drop policy if exists "items: delete own" on vault_items;
create policy "items: delete own" on vault_items
  for delete using (auth.uid() = user_id);

drop policy if exists "items: update own" on vault_items;
create policy "items: update own" on vault_items
  for update using (auth.uid() = user_id);
