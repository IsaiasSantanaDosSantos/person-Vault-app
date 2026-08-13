# Documentação Técnica — Cofre de Senhas Pessoal

**Versão do documento:** 1.0
**Data:** 2026-08-13
**Versão da aplicação:** `cofre-pessoal@1.0.0`

Este documento reúne, num só lugar, o que a aplicação é, como foi construída, o que foi testado, o que foi auditado e — a pergunta que mais importa — **qual o nível de senha que é seguro guardar nela**. Ele complementa (não substitui) os dois relatórios de auditoria já existentes no projeto:

- [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md) — primeira auditoria completa (arquitetura, criptografia, RLS, dependências).
- [AUDITORIA_SEGURANCA_V2.md](AUDITORIA_SEGURANCA_V2.md) — segunda auditoria (sessão persistente, edição de itens, resposta direta sobre "100% seguro").

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

### 3.4 Fluxo de leitura/escrita de um item

- **Criar/editar:** o texto da senha é cifrado no navegador (`encryptText`, gera um IV aleatório novo a cada operação) e só o par `{iv, ciphertext}` em base64 é enviado ao Supabase.
- **Listar:** a lista trazida do Supabase contém só ciphertext — nada é decifrado até o usuário pedir.
- **Ver/copiar:** só nesse momento o item específico é decifrado, sob demanda, usando a chave em memória.

---

## 4. Funcionalidades

- Criar conta / entrar (e-mail + senha, via Supabase Auth).
- Definir senha mestra na primeira vez (com medidor de força e mínimo de 12 caracteres).
- Destravar o cofre com a senha mestra em sessões seguintes.
- Listar, buscar (por serviço ou usuário) os itens salvos.
- **Adicionar** um novo item (serviço, usuário opcional, senha — com gerador de senha aleatória embutido).
- **Editar** um item existente (novo nesta rodada — reencriptografa com IV novo ao salvar).
- **Excluir** um item (com confirmação).
- **Ver** a senha de um item (com ocultação automática após 20s).
- **Copiar** a senha pra área de transferência (com limpeza automática após 30s).
- Sessão persiste ao recarregar a página — só a senha mestra é pedida de novo.
- Botão de logoff (dentro do cofre e também na etapa de senha mestra).
- Bloqueio automático do cofre após 5 minutos sem interação.
- Instalável como PWA (ícone, splash screen, tela cheia) no Android/iOS/desktop.

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

---

## 6. Testes realizados

**O que foi feito:**

- `npm run build` (compilação de produção completa — TypeScript, lint do Next.js, geração de páginas estáticas) rodado e validado **sem erros** após cada rodada de mudanças (correções de segurança, rebranding, sessão persistente, edição de itens, correção do overflow do botão "Gerar").
- `npm audit` rodado antes e depois da atualização do Next.js, confirmando a eliminação da CVE crítica e das falhas altas aplicáveis a este app.
- Verificação manual no navegador (via ferramentas de automação) de: carregamento sem erros de console, ausência de violações de CSP, requisições de rede retornando `200 OK` (ícones, fontes, chunks), estrutura da árvore de acessibilidade da tela de login (confirmando a troca do ícone), e o layout do modal de editar/adicionar senha em diferentes estados (com e sem a correção do `min-w-0`).
- Teste isolado do componente `PasswordFormModal` numa rota temporária (sem autenticação), criado especificamente pra confirmar visualmente a correção do botão "Gerar" saltando pra fora do modal — a rota foi **removida** depois do teste, não faz parte do app.

**O que NÃO foi feito (limitações do processo de teste):**

- **Nenhum teste automatizado** (unitário, de integração ou end-to-end) existe no projeto — não há Jest, Playwright, Cypress ou similar configurado. Toda verificação foi manual/exploratória.
- **Não testei o fluxo real de login/criação de conta** contra o seu projeto Supabase de produção — isso criaria dados de teste reais na sua base de usuários, o que eu não faria sem pedir autorização primeiro.
- **Não houve teste de penetração (pentest)** formal, nem por ferramenta automatizada (ex: OWASP ZAP, Burp Suite) nem por terceiros independentes.
- **Não houve teste de carga/performance**, nem teste em múltiplos navegadores reais (Safari, Firefox) além do Chromium usado nas verificações.
- **Não houve teste do fluxo de instalação como PWA** num dispositivo móvel real.

---

## 7. Auditorias realizadas — histórico consolidado

| Rodada                          | Data       | Foco                                                                                   | Resultado resumido                                                                                                                                                                                                                                            |
| ------------------------------- | ---------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [v1](AUDITORIA_SEGURANCA.md)    | 2026-08-13 | Arquitetura completa: criptografia, RLS, dependências, cabeçalhos HTTP, força de senha | 5 achados de prioridade Alta e 4 de Média corrigidos em código; itens de configuração do Supabase (MFA, leaked password protection, rate limiting) documentados como pendentes                                                                                |
| [v2](AUDITORIA_SEGURANCA_V2.md) | 2026-08-13 | Mudanças pós-v1: sessão persistente, botão de logoff, edição de itens, ícone de marca  | Confirmado que a sessão persistente não enfraquece a segurança (a fronteira real continua sendo a chave derivada da senha mestra); RLS de `UPDATE` verificada contra a documentação oficial do Postgres antes de declarar segura; nenhum novo achado de risco |
| Esta rodada (documentação)      | 2026-08-13 | Correção de layout (overflow do botão "Gerar")                                         | Corrigido com `min-w-0` no input — sem qualquer implicação de segurança, é puramente visual                                                                                                                                                                   |

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

1. **Rodar `supabase/schema.sql` novamente** no SQL Editor do Supabase (adiciona a coluna `iterations` e os limites de tamanho — idempotente, seguro rodar de novo).
2. **Habilitar MFA (TOTP)** em Authentication → Providers.
3. **Habilitar "Leaked password protection"** em Authentication → Settings.
4. **Configurar rate limiting / CAPTCHA** (hCaptcha ou Cloudflare Turnstile) no login e signup.
5. **Redefinir sua senha mestra atual**, se quiser migrar seu cofre já existente de 250k pra 600k iterações de PBKDF2 (opcional).

---

## 12. Estrutura de arquivos

```
vault-app/
├── app/
│   ├── page.tsx                 # Redireciona pra /login ou /vault conforme sessão
│   ├── layout.tsx                # Layout raiz, fontes (Poppins/IBM Plex Mono), metadata PWA
│   ├── icon.png, apple-icon.png, favicon.ico   # Ícones (convenção Next.js App Router)
│   ├── login/page.tsx            # Login, criação de conta, senha mestra
│   ├── vault/page.tsx            # Tela principal do cofre
│   └── docs/page.tsx             # Esta documentação, publicada em /docs
├── components/
│   ├── PasswordCard.tsx          # Card de um item (ver/copiar/editar/excluir)
│   ├── PasswordFormModal.tsx     # Modal de criar OU editar um item
│   └── ServiceWorkerRegister.tsx # Registra o service worker do PWA
├── lib/
│   ├── crypto.ts                 # PBKDF2 + AES-256-GCM (toda a criptografia)
│   ├── passwordStrength.ts       # Validação de força da senha mestra
│   ├── keyStore.ts               # Chave derivada em memória (nunca em disco)
│   ├── vaultStore.ts             # CRUD contra o Supabase (vault_profiles, vault_items)
│   └── supabaseClient.ts         # Cliente do Supabase (chave anon pública)
├── supabase/
│   └── schema.sql                # Tabelas, RLS, constraints (rodar no SQL Editor)
├── middleware.ts                 # Content-Security-Policy com nonce por requisição
├── next.config.mjs               # Cabeçalhos de segurança (HSTS, X-Frame-Options, etc.)
├── public/
│   ├── manifest.json             # Manifest do PWA (cores, ícones, screenshots)
│   ├── sw.js                     # Service worker
│   ├── icons/                    # Ícones do manifest (192px, 512px)
│   └── screenshots/               # Screenshots do manifest
├── AUDITORIA_SEGURANCA.md        # Primeira auditoria de segurança
├── AUDITORIA_SEGURANCA_V2.md     # Segunda auditoria de segurança
├── DOCUMENTACAO.md               # Este arquivo
└── README.md                     # Guia de instalação/deploy
```

# Cofre — senhas pessoais

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

## Para a documentação técnica:

- [DOCUMENTACAO.md](DOCUMENTACAO.md) — Documentação para instalação é uso.
