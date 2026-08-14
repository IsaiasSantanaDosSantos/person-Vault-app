# Documentação Técnica — Cofre de Senhas Pessoal

**Versão do documento:** 1.0
**Data:** 2026-08-13
**Versão da aplicação:** `cofre-pessoal@1.0.0`

Este documento reúne, num só lugar, o que a aplicação é, como foi construída, o que foi testado, o que foi auditado e — a pergunta que mais importa — **qual o nível de senha que é seguro guardar nela**. Ele complementa (não substitui) os dois relatórios de auditoria já existentes no projeto:

- [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md) — primeira auditoria completa (arquitetura, criptografia, RLS, dependências).
- [AUDITORIA_SEGURANCA_V2.md](AUDITORIA_SEGURANCA_V2.md) — segunda auditoria (sessão persistente, edição de itens, resposta direta sobre "100% seguro").
- [MFA.md](MFA.md) — o que foi implementado sobre autenticação em dois fatores e como ativar quando fizer sentido.
- [Guia para quem não é técnico](/ajuda) — passo a passo com prints de como usar o cofre no dia a dia.

---

## Sumário

1. [O que é a aplicação](#1-o-que-é-a-aplicação)
2. [Tecnologias usadas](#2-tecnologias-usadas)
3. [Arquitetura e fluxo de dados](#3-arquitetura-e-fluxo-de-dados)
4. [Funcionalidades](#4-funcionalidades)
5. [Modelo de segurança em detalhe](#5-modelo-de-segurança-em-detalhe)
6. [Testes realizados](#6-testes-realizados)
7. [Auditorias realizadas — histórico consolidado](#7-auditorias-realizadas--histórico-consolidado)
8. [Quão segura é a aplicação, e para quais níveis de senha](#8-quão-segura-é-a-aplicação-e-para-quais-níveis-de-senha)
9. [Caminho para um produto comercial (upgrade futuro)](#9-caminho-para-um-produto-comercial-upgrade-futuro)
10. [Limitações conhecidas](#10-limitações-conhecidas)
11. [Ações manuais pendentes](#11-ações-manuais-pendentes)
12. [Estrutura de arquivos](#12-estrutura-de-arquivos)

---

## 1. O que é a aplicação

Um cofre de senhas pessoal, de uso individual, instalável como PWA (Progressive Web App — funciona como app no celular/desktop a partir do navegador). Guarda credenciais (serviço, usuário/e-mail, senha) de forma **criptografada no próprio dispositivo do usuário antes de qualquer dado ser enviado ao servidor** — o backend (Supabase) nunca tem acesso às senhas em texto puro, só ao resultado cifrado.

Hoje é um projeto de uso pessoal, construído com o mesmo rigor técnico que se aplicaria a um sistema em produção. Ainda não passou pelos processos que caracterizam um produto comercial (auditoria de segurança por terceiros, conformidade regulatória, suporte formal, infraestrutura dedicada) — o caminho pra chegar lá está detalhado na [seção 9](#9-caminho-para-um-produto-comercial-upgrade-futuro), como um upgrade futuro.

---

## 2. Tecnologias usadas

| Camada                 | Tecnologia                                                                                                                                                       | Versão                          | Papel                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| Framework web          | [Next.js](https://nextjs.org)                                                                                                                                    | 14.2.35                         | App Router, renderização, roteamento, build                            |
| Biblioteca de UI       | [React](https://react.dev)                                                                                                                                       | ^18.3.1                         | Componentes da interface                                               |
| Linguagem              | [TypeScript](https://www.typescriptlang.org)                                                                                                                     | ^5.5.3 (resolvido em 5.9.3)     | Tipagem estática em todo o código                                      |
| Estilo                 | [Tailwind CSS](https://tailwindcss.com)                                                                                                                          | ^3.4.4                          | Utilitários de CSS                                                     |
| Fonte                  | [Poppins](https://fonts.google.com/specimen/Poppins) (texto) + [IBM Plex Mono](https://fonts.google.com/specimen/IBM+Plex+Mono) (senhas), via `next/font/google` | —                               | Tipografia, self-hosted (sem CDN externo em runtime)                   |
| Backend-as-a-Service   | [Supabase](https://supabase.com)                                                                                                                                 | `@supabase/supabase-js` ^2.45.4 | Autenticação (e-mail/senha) + banco de dados Postgres                  |
| Banco de dados         | PostgreSQL (gerenciado pelo Supabase)                                                                                                                            | —                               | Armazena perfis e itens do cofre, sempre cifrados                      |
| Criptografia           | [Web Crypto API](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API) (nativa do navegador)                                                                | —                               | PBKDF2 (derivação de chave) + AES-256-GCM (cifra)                      |
| PWA                    | Web App Manifest + Service Worker (`public/sw.js`)                                                                                                               | —                               | Instalação como app, ícone, splash screen                              |
| Hospedagem recomendada | [Vercel](https://vercel.com)                                                                                                                                     | —                               | Deploy com HTTPS automático (obrigatório pra Web Crypto API funcionar) |

**Por que essa combinação:** Next.js + Supabase é a dupla mais comum pra apps pessoais rápidos de construir com autenticação e banco prontos; a escolha crítica de segurança não está nessas peças, e sim em **onde a criptografia acontece** — que é 100% no navegador (`lib/crypto.ts`), usando a Web Crypto API nativa (não uma biblioteca JS de terceiros para a cifra em si, o que reduz superfície de bugs de implementação).

---

## 3. Arquitetura e fluxo de dados

### 3.1 Visão geral (zero-knowledge)

"Zero-knowledge" aqui significa: **o servidor (Supabase) nunca tem, em nenhum momento, acesso a uma senha em texto puro nem à chave capaz de decifrá-la.** Só o navegador do usuário tem essa capacidade, e só enquanto a aba está aberta e a senha mestra foi digitada naquela sessão.

```
┌─────────────────────────── Navegador (cliente) ───────────────────────────┐
│                                                                             │
│  Senha mestra (digitada)                                                   │
│         │                                                                  │
│         ▼                                                                  │
│  PBKDF2-HMAC-SHA256 (250k ou 600k iterações + salt único por usuário)      │
│         │                                                                  │
│         ▼                                                                  │
│  Chave AES-256 (CryptoKey, não-exportável, só em RAM)                      │
│         │                                                                  │
│         ├──► encrypt(senha do item) ──► { iv, ciphertext } ───┐            │
│         │                                                     │            │
│         └──► decrypt({ iv, ciphertext }) ──► senha em texto   │            │
│                                                                 │            │
└─────────────────────────────────────────────────────────────  │  ─────────┘
                                                                  ▼
                                              ┌──────────────────────────────┐
                                              │   Supabase (Postgres + Auth) │
                                              │                              │
                                              │  vault_profiles: salt,       │
                                              │   verifier_iv/ciphertext,    │
                                              │   iterations                 │
                                              │                              │
                                              │  vault_items: label,         │
                                              │   username (texto puro),     │
                                              │   password_iv/ciphertext     │
                                              │   (SEMPRE cifrado)           │
                                              │                              │
                                              │  Row Level Security: cada    │
                                              │  usuário só lê/escreve as    │
                                              │  próprias linhas             │
                                              └──────────────────────────────┘
```

### 3.2 Dois segredos, dois comportamentos diferentes

|                                  | Senha da **conta**                                                         | Senha **mestra**                                                                             |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Gerenciada por                   | Supabase Auth                                                              | 100% pelo app, no navegador                                                                  |
| Onde fica validada               | Servidor (Supabase)                                                        | Só localmente, contra um "verificador" cifrado                                               |
| Persiste ao recarregar a página? | Sim (token de sessão em `localStorage`)                                    | **Não** — precisa ser redigitada sempre                                                      |
| O que ela protege                | Acesso à sua conta/API (ver a lista de itens cifrados, poder apagar, etc.) | A capacidade de **ler o conteúdo** dos itens (decifrar)                                      |
| Se for esquecida                 | Dá pra recuperar por e-mail (fluxo padrão do Supabase Auth)                | **Não há recuperação.** Perder a senha mestra = perder acesso a tudo que foi cifrado com ela |

### 3.3 Fluxo de login (com a persistência de sessão adicionada na v2)

1. Usuário abre o app → `app/page.tsx` checa se já existe uma sessão Supabase válida.
2. **Sem sessão:** vai pra `/login`, mostra e-mail + senha da conta.
3. **Com sessão (ex: reload de página):** `/login` detecta a sessão automaticamente e pula direto pra "digite sua senha mestra" — não repete e-mail/senha.
4. Com a sessão validada, o app busca o perfil de criptografia (`vault_profiles`) do usuário: `salt`, `verifier_iv/ciphertext`, `iterations`.
5. A senha mestra digitada + o `salt` do perfil + o número de `iterations` salvo (importante: **cada perfil usa seu próprio número de iterações**, não uma constante global — ver seção 5.3) geram a chave AES via PBKDF2.
6. Essa chave tenta decifrar o `verifier` (uma string fixa conhecida, `"vault-check-ok"`). Se decifrar corretamente, a senha mestra está certa; a chave fica em memória (`lib/keyStore.ts`) e o usuário entra no cofre. Se falhar, mostra "Senha mestra incorreta" — sem revelar mais nada sobre o motivo.

Se o MFA estiver ativado (`lib/features.ts` → `MFA_ENABLED`) e o usuário tiver um fator cadastrado, uma etapa extra entra **entre o passo 3 e o passo 4**: o app pede o código de 6 dígitos do autenticador antes de buscar o perfil de criptografia. Ver seção 5.7.

### 3.4 Fluxo de leitura/escrita de um item

- **Criar/editar:** o texto da senha é cifrado no navegador (`encryptText`, gera um IV aleatório novo a cada operação) e só o par `{iv, ciphertext}` em base64 é enviado ao Supabase.
- **Listar:** a lista trazida do Supabase contém só ciphertext — nada é decifrado até o usuário pedir.
- **Ver/copiar:** só nesse momento o item específico é decifrado, sob demanda, usando a chave em memória.

### 3.5 Fluxo de compartilhamento de uma senha por link

Diferente do resto do app, aqui existe uma exceção deliberada ao "zero-knowledge": pra alguém sem a senha mestra conseguir ler uma senha específica através de um link, é preciso que ESSA senha específica seja legível sem a senha mestra — mas só ela, só enquanto o link durar.

1. Ao compartilhar, o navegador gera uma **chave AES-256 nova e aleatória** (`lib/shareCrypto.ts`), sem nenhuma relação com a senha mestra ou com a chave do cofre.
2. A senha é cifrada de novo com essa chave nova (`encryptText`, reaproveitado de `lib/crypto.ts`).
3. O ciphertext, o rótulo, o usuário (texto puro) e a data de expiração vão pra uma tabela nova (`shared_items`) — nunca a chave.
4. A chave vai só no **fragmento da URL** (depois do `#`), que o navegador nunca envia a nenhum servidor: `.../share/ID#k=CHAVE`.
5. Quem abre o link (`app/share/[id]/page.tsx`, pública, sem login) busca o registro pelo ID e decifra no próprio navegador, usando a chave que veio na URL.
6. Expiração é garantida em dois lugares: na interface (opções de 10 min a 24h) e no banco (`constraint` na tabela, teto de 24h independente do que o cliente mandar).
7. Revogação (`revokeShare`) simplesmente apaga a linha — sem a linha, o link para de funcionar, mesmo antes de expirar.

Comprometer um link comprometido só expõe a senha daquele compartilhamento específico, só até expirar ou ser revogado — nunca a senha mestra, a chave do cofre, nem qualquer outro item.

---

## 4. Funcionalidades

- Criar conta / entrar (e-mail + senha, via Supabase Auth).
- Definir senha mestra na primeira vez (com medidor de força e mínimo de 12 caracteres).
- Destravar o cofre com a senha mestra em sessões seguintes.
- Listar, buscar (por serviço ou usuário) os itens salvos.
- **Adicionar** um novo item (serviço, usuário opcional, senha — com gerador de senha aleatória embutido).
- **Editar** um item existente (reencriptografa com IV novo ao salvar).
- **Excluir** um item (com confirmação).
- **Ver** a senha de um item (com ocultação automática após 20s).
- **Copiar** a senha pra área de transferência (com limpeza automática após 30s).
- **Mostrar/ocultar** o que está sendo digitado em qualquer campo de senha (ícone de olho), inclusive na senha da conta e na senha mestra.
- **Compartilhar uma senha por link** — gera um link único (chave própria, sem relação com a senha mestra), com expiração obrigatória de até 24h escolhida por quem compartilha, revogável a qualquer momento. Quem recebe o link não precisa ter conta nem ver a senha em texto — só copiar.
- **Esqueci minha senha** (da conta, por e-mail) — não afeta nem recupera a senha mestra, que continua sem recuperação possível por design.
- **Excluir todos os dados do cofre** (com confirmação por palavra-chave) — apaga senhas e o perfil de criptografia, mantendo a conta de login.
- **Pedido de exclusão completa da conta** — link de e-mail direto pro suporte, já que apagar a conta em si exige acesso ao painel do Supabase.
- **Autenticação em dois fatores (MFA/TOTP)** — implementada, mas **desativada por padrão** (exige plano pago no Supabase). Ver [MFA.md](MFA.md).
- Sessão persiste ao recarregar a página — só a senha mestra é pedida de novo.
- Botão de logoff (dentro do cofre e também na etapa de senha mestra/MFA).
- Bloqueio automático do cofre após 5 minutos sem interação.
- Instalável como PWA (ícone, splash screen, tela cheia) no Android/iOS/desktop.
- Meta tags de compartilhamento (Open Graph/Twitter) — link do app mostra título, descrição e ícone ao ser compartilhado em redes/mensageiros.

---

## 5. Modelo de segurança em detalhe

### 5.1 Criptografia

- **Derivação de chave:** PBKDF2-HMAC-SHA256, com salt aleatório de 128 bits **único por usuário**.
- **Cifra:** AES-256-GCM (autenticada — detecta adulteração do ciphertext, não só confidencialidade), com IV (vetor de inicialização) aleatório de 96 bits gerado a cada operação de cifra, nunca reutilizado.
- **Chave não-exportável:** a `CryptoKey` derivada é marcada `extractable: false` na Web Crypto API — o próprio código do app não consegue extrair os bytes crus da chave, só usá-la via `encrypt`/`decrypt`.
- **Verificador de senha mestra:** em vez de guardar um hash da senha mestra, o app cifra uma string fixa conhecida com a chave derivada; "acertar" a senha mestra é conseguir decifrar essa string de volta pro valor esperado. A senha mestra em si nunca é enviada nem armazenada em lugar nenhum, nem cifrada.

### 5.2 Controle de acesso (Row Level Security)

Todo acesso ao banco (Postgres, via Supabase) passa por políticas de **Row Level Security**: cada linha das tabelas `vault_profiles` e `vault_items` só é visível/editável por quem tem `auth.uid() = user_id` — aplicado automaticamente pelo banco em toda consulta, independente do que o código do cliente pedir. Isso cobre `select`, `insert`, `update` e `delete`. A política de `update` não define uma cláusula `WITH CHECK` separada, então o Postgres usa a própria condição do `USING` como verificação também da linha _depois_ da alteração — o que impede, entre outras coisas, que um usuário "roube" um item de outro trocando o `user_id` numa edição.

### 5.3 Custo do PBKDF2 é por usuário, não uma constante global

Perfis criados originalmente usam 250.000 iterações; perfis criados após a correção de segurança usam 600.000 (recomendação OWASP 2023+). Esse número fica salvo em `vault_profiles.iterations` — **não é uma constante fixa no código** — justamente porque mudar o número de iterações muda por completo a chave derivada de uma mesma senha mestra, e isso quebraria a decifração de tudo que já foi salvo se não fosse versionado por perfil.

### 5.4 Cabeçalhos HTTP e Content-Security-Policy

`middleware.ts` gera uma CSP com um _nonce_ aleatório por requisição, restringindo de onde scripts podem ser carregados/executados (`script-src 'self' 'nonce-...' 'strict-dynamic'`, sem `unsafe-inline` em produção). `next.config.mjs` adiciona `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy`. Isso é a principal defesa contra o pior cenário técnico possível pra este app: um XSS (script malicioso rodando na mesma página) que tentasse ler a chave em memória ou os tokens de sessão.

### 5.5 O que o servidor consegue ver, e o que não consegue

| Dado                                                  | O servidor (Supabase) vê?                                                                                                                             |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seu e-mail e senha da conta                           | Sim (é o próprio provedor de autenticação)                                                                                                            |
| Sua senha mestra                                      | **Nunca**                                                                                                                                             |
| A chave de criptografia derivada                      | **Nunca**                                                                                                                                             |
| `salt` do seu perfil                                  | Sim (não é segredo — de nada serve sem a senha mestra)                                                                                                |
| Nome do serviço (ex: "Gmail") e usuário/e-mail salvos | Sim, em texto puro (decisão deliberada — não são segredos críticos, e ficam assim visíveis pra permitir listar/buscar sem decifrar tudo o tempo todo) |
| A senha de cada item                                  | **Nunca em texto puro** — só `{iv, ciphertext}`                                                                                                       |

### 5.6 Compartilhamento de senha por link

Cobertura de RLS na tabela `shared_items` (`supabase/schema.sql`):

- O dono só mexe nos próprios compartilhamentos (`auth.uid() = owner_id`) — cria, lista (inclusive expirados, pra ver o histórico) e revoga quando quiser.
- Uma política separada permite leitura pública **só enquanto `expires_at > now()`** — é a única exceção "pública" do banco inteiro, necessária porque quem abre o link não está autenticado como o dono. O segredo real não é a sessão, é o UUID do link (praticamente impossível de adivinhar) somado à chave que só existe na URL.
- Teto de 24h garantido por uma `constraint` na própria tabela (`expires_at <= created_at + interval '24 hours'`), não só na interface — mesmo manipulando a chamada, não dá pra criar um link que dure mais que isso.
- Excluir todos os dados do cofre (`deleteAllData`) também revoga qualquer compartilhamento ativo daquele usuário, por consistência.

### 5.7 Autenticação em dois fatores (MFA) — implementada, hoje desativada

Ver [MFA.md](MFA.md) para o detalhamento completo. Resumo:

- Usa o MFA/TOTP nativo do Supabase Auth (`supabase.auth.mfa.*`) — o segredo do autenticador nunca é visto nem guardado por este app, só pelo Supabase internamente.
- Controlado por uma única constante (`lib/features.ts` → `MFA_ENABLED`), hoje `false` porque o recurso exige o plano Pro do Supabase. Enquanto desativado, nenhuma chamada de MFA acontece em lugar nenhum do app — o botão "Duplo fator" fica visível, mas desativado.
- Decidimos **não implementar códigos de backup próprios**: o Supabase não expõe um jeito seguro de elevar a sessão pra "segundo fator validado" a partir de uma verificação nossa por fora do fluxo deles — só a verificação real, contra um fator cadastrado neles, faz isso. Em vez disso, a recomendação é cadastrar mais de um autenticador (a tela já suporta) e, no caso de perder todos, pedir remoção manual do MFA pelo mesmo canal de e-mail já usado pra exclusão de conta.

---

## 6. Testes realizados

**O que foi feito:**

- `npm run build` (compilação de produção completa — TypeScript, lint do Next.js, geração de páginas estáticas) rodado e validado **sem erros** após cada rodada de mudanças (correções de segurança, rebranding, sessão persistente, edição de itens, correção do overflow do botão "Gerar").
- `npm audit` rodado antes e depois da atualização do Next.js, confirmando a eliminação da CVE crítica e das falhas altas aplicáveis a este app.
- Verificação manual no navegador (via ferramentas de automação) de: carregamento sem erros de console, ausência de violações de CSP, requisições de rede retornando `200 OK` (ícones, fontes, chunks), estrutura da árvore de acessibilidade da tela de login (confirmando a troca do ícone), e o layout do modal de editar/adicionar senha em diferentes estados (com e sem a correção do `min-w-0`).
- Teste isolado de componentes (`PasswordFormModal`, cabeçalho do cofre com 4 itens) em rotas temporárias sem autenticação, pra confirmar visualmente correções de layout (overflow do botão "Gerar", largura do cabeçalho em 375px) — as rotas foram **removidas** depois de cada teste, não fazem parte do app.
- Lógica de criptografia do compartilhamento (`lib/shareCrypto.ts`) validada isoladamente no console do navegador: gerar chave → cifrar → exportar a chave em base64url → reimportar só a partir da string → decifrar — confirmado que bate exatamente com o texto original.
- Página pública `/share/[id]` testada com um link inexistente contra o Supabase real, confirmando que mostra "link inválido" sem quebrar (também serviu pra confirmar que a tabela `shared_items` precisa da migração do `schema.sql` — sem ela, o mesmo erro genérico aparece).

**O que NÃO foi feito (limitações do processo de teste):**

- **Nenhum teste automatizado** (unitário, de integração ou end-to-end) existe no projeto — não há Jest, Playwright, Cypress ou similar configurado. Toda verificação foi manual/exploratória.
- **Não testei o fluxo real de login/criação de conta** contra o seu projeto Supabase de produção — isso criaria dados de teste reais na sua base de usuários, o que eu não faria sem pedir autorização primeiro.
- **O fluxo de MFA nunca foi testado contra um Supabase real** — o plano atual do projeto não suporta o recurso. O código segue a documentação oficial da API, mas não tem validação end-to-end.
- **Não houve teste de penetração (pentest)** formal, nem por ferramenta automatizada (ex: OWASP ZAP, Burp Suite) nem por terceiros independentes.
- **Não houve teste de carga/performance**, nem teste em múltiplos navegadores reais (Safari, Firefox) além do Chromium usado nas verificações.
- **Não houve teste do fluxo de instalação como PWA** num dispositivo móvel real.

---

## 7. Auditorias realizadas — histórico consolidado

| Rodada                          | Data       | Foco                                                                                   | Resultado resumido                                                                                                                                                                                                                                            |
| ------------------------------- | ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [v1](AUDITORIA_SEGURANCA.md)    | 2026-08-13 | Arquitetura completa: criptografia, RLS, dependências, cabeçalhos HTTP, força de senha | 5 achados de prioridade Alta e 4 de Média corrigidos em código; itens de configuração do Supabase (MFA, leaked password protection, rate limiting) documentados como pendentes                                                                                |
| [v2](AUDITORIA_SEGURANCA_V2.md) | 2026-08-13 | Mudanças pós-v1: sessão persistente, botão de logoff, edição de itens, ícone de marca  | Confirmado que a sessão persistente não enfraquece a segurança (a fronteira real continua sendo a chave derivada da senha mestra); RLS de `UPDATE` verificada contra a documentação oficial do Postgres antes de declarar segura; nenhum novo achado de risco |
| v2.1                            | 2026-08-13 | Correção de layout (overflow do botão "Gerar")                                         | Corrigido com `min-w-0` no input — sem qualquer implicação de segurança, é puramente visual                                                                                                                                                                   |
| v2.2 (esta rodada)               | 2026-08-14 | Compartilhamento de senha por link, MFA (feature-flagged), recuperação de senha da conta, exclusão de dados/conta | Revisão de segurança feita durante a própria implementação (não um relatório separado): chave de compartilhamento nova por link com escopo confirmado, teto de 24h garantido em duas camadas, MFA isolado atrás de um flag sem nenhuma chamada em produção enquanto desativado |

**Achados corrigidos ao longo das duas auditorias (resumo):**

1. PBKDF2 abaixo do recomendado → 600k iterações (por perfil, com compatibilidade retroativa)
2. Sem exigência de força pra senha mestra → mínimo 12 caracteres + medidor de força + bloqueio de senhas comuns
3. Sem CSP/cabeçalhos de segurança → CSP com nonce + HSTS + demais headers
4. Next.js com CVE crítica → atualizado para versão corrigida
5. Sem bloqueio por inatividade → trava automática após 5 min
6. Sem limites de tamanho no banco → `check constraints` adicionados
7. Viés estatístico no gerador de senha aleatória → corrigido via rejection sampling
8. Campo de senha visível por padrão no formulário → oculto por padrão, com botão mostrar/ocultar

---

## 8. Quão segura é a aplicação, e para quais níveis de senha

### 8.1 Resposta direta

**Não existe "100% seguro" em software — isso vale pra qualquer aplicação, comercial ou pessoal.** O que posso afirmar com base nas duas auditorias feitas:

- **Nenhuma vulnerabilidade conhecida e não mitigada** foi encontrada no código revisado, nas duas rodadas de auditoria.
- A arquitetura (zero-knowledge, chave derivada nunca sai do dispositivo, RLS por linha, criptografia autenticada) é **estruturalmente correta** e segue práticas atuais recomendadas (OWASP).
- As camadas de defesa em profundidade que normalmente faltam em projetos pessoais desse tipo (CSP, cabeçalhos de segurança, política de senha forte, bloqueio por inatividade) **foram implementadas**.

### 8.2 Por nível de senha

| Tipo de senha                                                                        | Recomendação                                                                                                                                            | Por quê                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contas pessoais comuns** (redes sociais, streaming, fóruns, newsletters)           | ✅ Seguro guardar aqui                                                                                                                                  | Risco baixo mesmo em caso de comprometimento; a arquitetura já oferece proteção bem acima do que a maioria das pessoas usa (ex: reutilizar a mesma senha em vários sites)                                                                                                                                     |
| **E-mail principal**                                                                 | ✅ Seguro, **desde que** a senha mestra seja forte (12+ caracteres, sem padrão óbvio) e você tenha completado o checklist de ações pendentes (seção 11) | O e-mail principal costuma ser a chave-mestra de recuperação de tudo mais — vale um cuidado extra na força da sua senha mestra especificamente pra esse caso                                                                                                                                                  |
| **Cartão de crédito / dados de pagamento** (se guardados como "senha"/nota, ex: CVV) | ✅ Seguro do ponto de vista técnico da criptografia                                                                                                     | O AES-256-GCM protege esse dado tão bem quanto qualquer outro texto guardado; o risco real nesse caso é mais operacional (ex: nunca compartilhar sua senha mestra, manter o dispositivo com antivírus/SO atualizado) do que da aplicação em si                                                                |
| **Banco (senha de acesso à conta, senha de app bancário)**                           | ✅ Seguro **com o checklist da seção 11 completo** (especialmente MFA na conta e senha mestra forte)                                                    | Mesmo raciocínio do e-mail: a aplicação protege bem, mas é o tipo de senha onde vale garantir que TODAS as camadas (não só a criptografia) estejam ativas                                                                                                                                                     |
| **Servidores de produção / infraestrutura crítica de trabalho**                      | 🟡 Avalie o risco com atenção antes                                                                                                                     | Tecnicamente a criptografia é a mesma para qualquer dado — mas pra esse nível de criticidade, a seção 8.3 abaixo pesa mais: um app sem auditoria de terceiros carrega mais risco residual do que uma solução corporativa dedicada (ex: um cofre de segredos com HSM, auditoria de acesso, rotação automática) |

### 8.3 Sobre auditoria independente

As duas auditorias deste documento foram feitas internamente, a pedido do proprietário — não por uma empresa de segurança terceirizada. Isso é diferente do histórico de escrutínio público que produtos maduros como Bitwarden, 1Password ou KeePass acumulam ao longo de anos, incluindo programas de recompensa por vulnerabilidades (bug bounty) abertos a pesquisadores externos. Isso não significa que o app seja inseguro — significa que a confiança nele hoje vem de revisões pontuais, não de um histórico contínuo de validação externa. Para segredos de altíssima criticidade onde um erro é catastrófico e irreversível (ex: a única credencial de acesso a um servidor de produção), essa diferença deve pesar na decisão. A seção 9 detalha o que fecharia essa lacuna.

---

## 9. Caminho para um produto comercial (upgrade futuro)

Esta seção existe pra responder: **"o que faltaria pra transformar isso num produto real, vendável, com usuários que não sejam só eu?"** Nada aqui é urgente pro uso pessoal atual — é um roteiro de melhorias pra quando/se esse for o objetivo.

### 9.1 Segurança e conformidade

- **Auditoria de segurança por empresa terceirizada independente**, incluindo teste de penetração (pentest) formal — o passo mais importante pra fechar a lacuna descrita na seção 8.3.
- **Programa de bug bounty**, aberto a pesquisadores de segurança externos.
- **Migrar a derivação de chave de PBKDF2 para Argon2id** — mais resistente a ataques com hardware dedicado (GPU/ASIC).
- **Gestão de segredos via KMS/HSM dedicado**, em vez de depender só das variáveis de ambiente do provedor de hospedagem.
- **Certificações formais**, conforme o público-alvo: SOC 2 Type II, ISO 27001.
- **Conformidade com LGPD/GDPR**: política de privacidade, termos de uso, contrato de processamento de dados (DPA), fluxo formal de exportação e exclusão de dados a pedido do titular.
- **Plano de resposta a incidentes** e canal formal de divulgação de vulnerabilidades (ex: um `security.txt`).

### 9.2 Infraestrutura e operação

- **Infraestrutura dedicada** (hoje roda em plano gratuito do Supabase) com backups multi-região e plano de recuperação de desastre.
- **Monitoramento, alertas e uma página de status pública**, com SLA de disponibilidade formal.
- **Pipeline de CI/CD com testes automatizados** (unitários, integração, ponta a ponta) e varredura de segurança automática (SAST/DAST, análise de dependências tipo Dependabot/Snyk) antes de cada deploy — hoje toda verificação é manual (seção 6).
- **Rate limiting e proteção contra DDoS em nível de infraestrutura** (WAF), além do que já existe no código.
- **Processo formal de troca de senha mestra**, com reencriptação automática de todos os itens existentes (hoje, trocar a senha mestra não é um fluxo implementado).

### 9.3 Produto e experiência

- **Sincronização entre múltiplos dispositivos** com resolução de conflitos.
- **Extensão de navegador para autopreenchimento** — recurso padrão esperado em qualquer gerenciador de senhas comercial.
- **Trilha de auditoria completa** (log de acessos) e exportação/backup do cofre.
- **Acessibilidade (WCAG)** e internacionalização (hoje o app é só em português).
- **Fluxo de acesso de emergência/legado digital** (ex: liberar acesso a um contato de confiança em caso de falecimento ou incapacidade).

### 9.4 Negócio e jurídico

- Constituição formal de empresa e contratação de seguro de responsabilidade civil/cibernético.
- Infraestrutura de cobrança e planos (ex: Stripe), com termos de serviço revisados por um advogado.
- Canal formal de suporte ao cliente.

---

## 10. Limitações conhecidas

- Sem campo de notas na UI (o banco já suporta a coluna, falta só o formulário).
- Sem trilha de auditoria/log de acessos (não registra quando um item foi visto/copiado).
- Sem exportação/backup do cofre.
- Clipboard: a senha copiada pode persistir em gerenciadores de histórico de área de transferência do sistema operacional além dos 30s que o app tenta limpar — limitação da plataforma, não da aplicação.
- Sem tratamento de erro visível na interface se salvar/editar falhar por perda de conexão (o botão "Salvando..." pode ficar preso até recarregar) — não é falha de segurança, é robustez de UX pendente.
- Cofres criados antes da correção do PBKDF2 continuam em 250.000 iterações até a senha mestra ser redefinida (não há hoje um fluxo de "trocar senha mestra" implementado).

---

## 11. Ações manuais pendentes

Estas dependem de configuração no painel do Supabase ou de uma ação sua — não são coisas que o código sozinho resolve:

1. **Rodar `supabase/schema.sql` novamente** no SQL Editor do Supabase (adiciona a coluna `iterations`, os limites de tamanho, e agora também a tabela `shared_items` do compartilhamento — idempotente, seguro rodar de novo). Sem isso, compartilhar uma senha por link não funciona.
2. **MFA (TOTP):** o código já está pronto ([MFA.md](MFA.md)) — só falta o upgrade pro plano Pro do Supabase e trocar `MFA_ENABLED` pra `true` em `lib/features.ts` quando fizer sentido.
3. **Habilitar "Leaked password protection"** em Authentication → Settings.
4. **Configurar rate limiting / CAPTCHA** (hCaptcha ou Cloudflare Turnstile) no login e signup.
5. **Redefinir sua senha mestra atual**, se quiser migrar seu cofre já existente de 250k pra 600k iterações de PBKDF2 (opcional).

---

## 12. Estrutura de arquivos

```
vault-app/
├── app/
│   ├── page.tsx                  # Redireciona pra /login ou /vault conforme sessão
│   ├── layout.tsx                # Layout raiz, fontes, metadata PWA/Open Graph
│   ├── icon.png, apple-icon.png, favicon.ico   # Ícones (convenção Next.js App Router)
│   ├── login/page.tsx            # Login, criação de conta, senha mestra, MFA, esqueci a senha
│   ├── reset-password/page.tsx   # Definir nova senha da conta (link vindo do e-mail)
│   ├── vault/page.tsx            # Tela principal do cofre
│   ├── share/[id]/page.tsx       # Página pública de quem recebe um link compartilhado
│   ├── docs/page.tsx             # Documentação técnica, publicada em /docs
│   └── ajuda/page.tsx            # Guia de uso pra quem não é técnico, publicado em /ajuda
├── components/
│   ├── PasswordCard.tsx          # Card de um item (ver/copiar/editar/excluir/compartilhar)
│   ├── PasswordFormModal.tsx     # Modal de criar OU editar um item
│   ├── PasswordInput.tsx         # Campo de senha com ícone de olho (mostrar/ocultar)
│   ├── DeleteAllDataModal.tsx    # Confirmação de excluir todos os dados do cofre
│   ├── ShareModal.tsx            # Gerar/copiar/revogar um link de compartilhamento
│   ├── ActiveSharesModal.tsx     # Lista e revoga links de compartilhamento ativos
│   ├── MfaSettingsModal.tsx      # Cadastrar/remover autenticadores (MFA)
│   └── ServiceWorkerRegister.tsx # Registra o service worker do PWA
├── lib/
│   ├── crypto.ts                 # PBKDF2 + AES-256-GCM (criptografia do cofre)
│   ├── shareCrypto.ts            # Chave nova e descartável por compartilhamento
│   ├── passwordStrength.ts       # Validação de força da senha mestra
│   ├── keyStore.ts               # Chave derivada em memória (nunca em disco)
│   ├── vaultStore.ts             # CRUD contra o Supabase (vault_profiles, vault_items)
│   ├── shareStore.ts             # CRUD contra o Supabase (shared_items)
│   ├── mfaStore.ts               # Camada sobre supabase.auth.mfa.*
│   ├── features.ts               # Interruptor MFA_ENABLED
│   ├── constants.ts              # E-mail de suporte pra pedidos de exclusão de conta
│   └── supabaseClient.ts         # Cliente do Supabase (chave anon pública)
├── supabase/
│   └── schema.sql                # Tabelas, RLS, constraints (rodar no SQL Editor)
├── middleware.ts                 # Content-Security-Policy com nonce por requisição
├── next.config.mjs               # Cabeçalhos de segurança (HSTS, X-Frame-Options, etc.)
├── public/
│   ├── manifest.json             # Manifest do PWA (cores, ícones, screenshots)
│   ├── sw.js                     # Service worker
│   ├── icons/                    # Ícones do manifest (192px, 512px)
│   ├── screenshots/               # Screenshots do manifest
│   └── guide/                    # Prints usados no guia de uso (/ajuda)
├── AUDITORIA_SEGURANCA.md        # Primeira auditoria de segurança
├── AUDITORIA_SEGURANCA_V2.md     # Segunda auditoria de segurança
├── MFA.md                        # O que foi feito sobre Duplo fator e como ativar
├── DOCUMENTACAO.md               # Guia rápido de instalação/deploy
└── README.md                     # Este arquivo
```
