# Cofre — Gerenciador de Senhas Pessoal com Arquitetura Zero-Knowledge

## Sobre o projeto

O Cofre é um gerenciador de senhas pessoal que desenvolvi do zero, com um objetivo central: guardar credenciais sensíveis (de contas comuns a senhas de banco e servidores) sem que o servidor jamais tenha acesso a elas em texto plano. Toda a criptografia acontece no navegador do usuário — a senha mestra nunca é transmitida, e a chave derivada dela nunca sai da memória do dispositivo. É uma aplicação web progressiva (PWA), instalável em qualquer dispositivo, com todo o ciclo de vida de um produto real: pipeline de CI/CD, testes automatizados, varredura de segurança contínua e múltiplas rodadas de auditoria de segurança documentadas.

## Principais funcionalidades

- Cofre de senhas com criptografia ponta a ponta (zero-knowledge)
- Autenticação multifator (TOTP)
- Compartilhamento seguro de uma senha por link, com chave própria e expiração garantida
- Geração de senhas aleatórias criptograficamente seguras
- Medidor de força de senha mestra com bloqueio de senhas comuns
- Bloqueio automático do cofre por inatividade
- CAPTCHA (verificação humana) no login, criação de conta e recuperação de senha
- Instalável como PWA, com ícones, manifest e service worker
- Status page pública com monitoramento de disponibilidade

## Stack tecnológica

**Frontend**
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS
- Web Crypto API nativa do navegador (sem biblioteca de criptografia terceirizada)

**Backend / Dados**
- Supabase (PostgreSQL gerenciado + Auth + Row Level Security)
- Row Level Security (RLS) como camada de isolamento multi-tenant a nível de linha, sem lógica de autorização duplicada no backend

**Criptografia**
- PBKDF2-HMAC-SHA256 com 600.000 iterações (recomendação OWASP) para derivação de chave a partir da senha mestra
- AES-256-GCM (criptografia autenticada) para os dados do cofre, com IV aleatório único por operação
- Esquema de compartilhamento com chave simétrica descartável, gerada e trocada só via fragmento de URL (nunca trafega até o servidor)

**Segurança de aplicação**
- Content-Security-Policy estrita, com nonce por requisição e `strict-dynamic`
- Cabeçalhos de segurança HTTP completos (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy)
- CAPTCHA (Cloudflare Turnstile) integrado ao Supabase Auth nos fluxos de login, cadastro e recuperação de senha
- Rate limiting de borda (Upstash Redis) contra enumeração de recursos, implementado em middleware do Next.js (Edge Runtime)
- SAST (Semgrep) rodando em CI a cada alteração
- Atualização automatizada de dependências (Dependabot)

**Qualidade e testes**
- Vitest para testes unitários, cobrindo toda a camada de criptografia, regras de negócio e acesso a dados (com mocks)
- TypeScript em modo estrito

**CI/CD e infraestrutura**
- GitHub Actions: pipeline que roda lint, checagem de tipos, testes e build em toda alteração
- Fluxo de branches com promoção automática (branch de feature → pré-produção → produção), com merge condicionado à esteira de testes passar
- Deploy contínuo na Vercel
- Monitoramento externo de disponibilidade (UptimeRobot) com status page pública

## Destaques de arquitetura

**Modelo zero-knowledge de verdade.** A senha mestra é usada só para derivar uma chave AES-256 localmente, via PBKDF2. Essa chave nunca é enviada ao servidor nem persistida em disco — vive só em memória, e desaparece ao recarregar a página ou após um período de inatividade. O Supabase só recebe e armazena texto cifrado.

**Verificação de senha sem armazenar a senha.** Em vez de guardar a senha mestra (ou um hash dela) para validar o login, a aplicação cifra uma string fixa conhecida com a chave derivada e testa se a decriptação bate — um "verificador" que confirma a senha certa sem nunca precisar persisti-la.

**Compartilhamento de senha com escopo mínimo.** Ao compartilhar uma credencial por link, é gerada uma chave simétrica nova, sem nenhuma relação com a senha mestra do cofre, válida só para aquele item — com teto de expiração garantido em duas camadas (validação na aplicação e constraint no próprio banco).

**Pipeline com gate de qualidade real.** Nenhuma alteração chega à branch de produção sem passar por lint, checagem de tipos, suíte de testes e build completo — e sem que uma varredura de segurança estática (SAST) rode sobre o código.

## Processo de segurança

Conduzi múltiplas rodadas de auditoria de segurança interna ao longo do desenvolvimento, cada uma documentada por escrito: revisão da arquitetura de criptografia, das políticas de Row Level Security, dos cabeçalhos HTTP, das dependências (via `npm audit`) e do comportamento real da aplicação sob teste manual e automatizado. Achados corrigidos incluíram desde ajuste de parâmetros criptográficos até um bug real de controle de acesso (uma condição em que o dono de um link compartilhado conseguia acessá-lo mesmo após a expiração, por uma interação entre duas políticas de RLS corretas isoladamente) — corrigido e coberto por teste de regressão depois.

## O que esse projeto demonstra

- Implementação de criptografia client-side aplicada corretamente (não é trivial: geração de IV, gestão de chave em memória, prevenção de reuso, derivação de chave com custo computacional adequado)
- Desenho de um pipeline de CI/CD completo do zero, incluindo promoção automatizada entre ambientes
- Modelagem de segurança em profundidade: múltiplas camadas independentes (criptografia, RLS, CSP, CAPTCHA, rate limiting) em vez de um único ponto de controle
- Disciplina de engenharia: testes automatizados, documentação técnica viva, e um processo repetível de auditoria em vez de revisão pontual
- Capacidade de tomar decisões de trade-off conscientes (ex: rate limiting que falha aberto vs. CAPTCHA que falha fechado) e documentar o porquê
