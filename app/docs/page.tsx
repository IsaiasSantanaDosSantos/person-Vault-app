import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Documentação técnica — Cofre",
  description: "Documentação técnica completa do Cofre de senhas pessoal.",
};

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-semibold text-vault-text mt-12 mb-4 pb-2 border-b border-vault-border">
        {number}. {title}
      </h2>
      {children}
    </section>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h3 className="text-base font-semibold text-vault-text mb-3">{title}</h3>
      {children}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-vault-muted leading-relaxed mb-4">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return (
    <ul className="list-disc list-outside pl-5 space-y-2 text-sm text-vault-muted mb-4 marker:text-vault-steel">
      {children}
    </ul>
  );
}

function OL({ children }: { children: React.ReactNode }) {
  return (
    <ol className="list-decimal list-outside pl-5 space-y-2 text-sm text-vault-muted mb-4 marker:text-vault-steel">
      {children}
    </ol>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="bg-vault-bg border border-vault-border rounded px-1.5 py-0.5 text-xs font-mono text-vault-text">
      {children}
    </code>
  );
}

function Block({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-vault-border bg-vault-panel">
      <pre className="p-4 text-[11px] leading-relaxed font-mono text-vault-text whitespace-pre">
        {children}
      </pre>
    </div>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: React.ReactNode[][];
}) {
  return (
    <div className="overflow-x-auto my-4 rounded-lg border border-vault-border">
      <table className="w-full text-sm border-collapse min-w-[560px]">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left font-medium text-vault-text bg-vault-panel px-3 py-2 border-b border-vault-border"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className="px-3 py-2 border-b border-vault-border align-top text-vault-muted"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const toc = [
  ["intro", "O que é a aplicação"],
  ["tecnologias", "Tecnologias usadas"],
  ["arquitetura", "Arquitetura e fluxo de dados"],
  ["funcionalidades", "Funcionalidades"],
  ["seguranca", "Modelo de segurança em detalhe"],
  ["testes", "Testes realizados"],
  ["auditorias", "Auditorias realizadas"],
  ["nivel", "Quão segura é, e para quais níveis de senha"],
  ["comercial", "Caminho para um produto comercial"],
  ["limitacoes", "Limitações conhecidas"],
  ["pendencias", "Ações manuais pendentes"],
  ["estrutura", "Estrutura de arquivos"],
  ["cicd", "CI/CD, testes automatizados e operação"],
];

export default function DocsPage() {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 bg-vault-bg/90 backdrop-blur border-b border-vault-border px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" width={24} height={24} className="w-6 h-6 rounded-md" />
          <span className="font-semibold text-sm tracking-tight">Cofre — Documentação</span>
        </div>
        <Link href="/" className="text-xs text-vault-muted hover:text-vault-text transition">
          Voltar ao app
        </Link>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <p className="text-xs uppercase tracking-wide text-vault-muted mb-2">
          Documentação técnica · v1.1 · 2026-08-14
        </p>
        <h1 className="text-2xl font-semibold text-vault-text mb-4">
          Documentação Técnica — Cofre de Senhas Pessoal
        </h1>
        <P>
          Este documento reúne, num só lugar, o que a aplicação é, como foi construída, o que foi
          testado, o que foi auditado e — a pergunta que mais importa — qual o nível de senha que
          é seguro guardar nela.
        </P>
        <p className="text-xs text-vault-muted mb-6">
          Não é técnico? Veja o{" "}
          <a href="/ajuda" className="text-vault-steel hover:text-vault-steelBright">
            guia de uso passo a passo
          </a>
          , com prints de tela.
        </p>

        <div className="bg-vault-panel border border-vault-border rounded-lg p-4 mb-8">
          <p className="text-xs font-medium text-vault-text mb-2">Sumário</p>
          <ol className="text-sm space-y-1.5 list-decimal list-inside">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-vault-steel hover:text-vault-steelBright transition">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <Section id="intro" number="1" title="O que é a aplicação">
          <P>
            Um cofre de senhas pessoal, de uso individual, instalável como PWA (Progressive Web
            App — funciona como app no celular/desktop a partir do navegador). Guarda credenciais
            (serviço, usuário/e-mail, senha) de forma{" "}
            <strong className="text-vault-text">
              criptografada no próprio dispositivo do usuário antes de qualquer dado ser enviado
              ao servidor
            </strong>{" "}
            — o backend (Supabase) nunca tem acesso às senhas em texto puro, só ao resultado
            cifrado.
          </P>
          <P>
            Hoje é um projeto de uso pessoal, construído com o mesmo rigor técnico que se
            aplicaria a um sistema em produção. Ainda não passou pelos processos que caracterizam
            um produto comercial (auditoria de segurança por terceiros, conformidade regulatória,
            suporte formal, infraestrutura dedicada) — o caminho pra chegar lá está detalhado na{" "}
            <a href="#comercial" className="text-vault-steel hover:text-vault-steelBright">
              seção 9
            </a>
            , como um upgrade futuro.
          </P>
        </Section>

        <Section id="tecnologias" number="2" title="Tecnologias usadas">
          <Table
            headers={["Camada", "Tecnologia", "Versão", "Papel"]}
            rows={[
              ["Framework web", "Next.js", "14.2.35", "App Router, renderização, roteamento, build"],
              ["Biblioteca de UI", "React", "^18.3.1", "Componentes da interface"],
              ["Linguagem", "TypeScript", "^5.5.3 (resolvido em 5.9.3)", "Tipagem estática em todo o código"],
              ["Estilo", "Tailwind CSS", "^3.4.4", "Utilitários de CSS"],
              [
                "Fonte",
                "Poppins (texto) + IBM Plex Mono (senhas)",
                "via next/font/google",
                "Tipografia, self-hosted (sem CDN externo em runtime)",
              ],
              [
                "Backend-as-a-Service",
                "Supabase",
                "@supabase/supabase-js ^2.45.4",
                "Autenticação (e-mail/senha) + banco de dados Postgres",
              ],
              ["Banco de dados", "PostgreSQL (gerenciado pelo Supabase)", "—", "Armazena perfis e itens do cofre, sempre cifrados"],
              ["Criptografia", "Web Crypto API (nativa do navegador)", "—", "PBKDF2 (derivação de chave) + AES-256-GCM (cifra)"],
              ["PWA", "Web App Manifest + Service Worker", "—", "Instalação como app, ícone, splash screen"],
              ["Hospedagem recomendada", "Vercel", "—", "Deploy com HTTPS automático (obrigatório pra Web Crypto API)"],
            ]}
          />
          <P>
            <strong className="text-vault-text">Por que essa combinação:</strong> Next.js +
            Supabase é a dupla mais comum pra apps pessoais rápidos de construir com autenticação
            e banco prontos; a escolha crítica de segurança não está nessas peças, e sim em{" "}
            <strong className="text-vault-text">onde a criptografia acontece</strong> — que é 100%
            no navegador (<Code>lib/crypto.ts</Code>), usando a Web Crypto API nativa (não uma
            biblioteca JS de terceiros para a cifra em si, o que reduz superfície de bugs de
            implementação).
          </P>
        </Section>

        <Section id="arquitetura" number="3" title="Arquitetura e fluxo de dados">
          <Sub title="3.1 Visão geral (zero-knowledge)">
            <P>
              "Zero-knowledge" aqui significa:{" "}
              <strong className="text-vault-text">
                o servidor (Supabase) nunca tem, em nenhum momento, acesso a uma senha em texto
                puro nem à chave capaz de decifrá-la.
              </strong>{" "}
              Só o navegador do usuário tem essa capacidade, e só enquanto a aba está aberta e a
              senha mestra foi digitada naquela sessão.
            </P>
            <Block>{`Navegador (cliente)
─────────────────────────────────────────────
Senha mestra (digitada)
   │
   ▼
PBKDF2-HMAC-SHA256 (250k ou 600k iterações + salt único por usuário)
   │
   ▼
Chave AES-256 (CryptoKey, não-exportável, só em RAM)
   │
   ├──► encrypt(senha do item) ──► { iv, ciphertext } ──┐
   │                                                     │
   └──► decrypt({ iv, ciphertext }) ──► senha em texto   │
                                                          │
                                                          ▼
                                    Supabase (Postgres + Auth)
                                    ─────────────────────────────
                                    vault_profiles: salt,
                                      verifier_iv/ciphertext,
                                      iterations

                                    vault_items: label,
                                      username (texto puro),
                                      password_iv/ciphertext
                                      (SEMPRE cifrado)

                                    Row Level Security: cada
                                    usuário só lê/escreve as
                                    próprias linhas`}</Block>
          </Sub>

          <Sub title="3.2 Dois segredos, dois comportamentos diferentes">
            <Table
              headers={["", "Senha da conta", "Senha mestra"]}
              rows={[
                ["Gerenciada por", "Supabase Auth", "100% pelo app, no navegador"],
                ["Onde fica validada", "Servidor (Supabase)", "Só localmente, contra um \"verificador\" cifrado"],
                [
                  "Persiste ao recarregar?",
                  "Sim (token de sessão em localStorage)",
                  <strong key="n" className="text-vault-text">Não — precisa ser redigitada sempre</strong>,
                ],
                [
                  "O que protege",
                  "Acesso à sua conta/API (ver a lista de itens cifrados, apagar, etc.)",
                  "A capacidade de ler o conteúdo dos itens (decifrar)",
                ],
                [
                  "Se for esquecida",
                  "Dá pra recuperar por e-mail (fluxo padrão do Supabase Auth)",
                  <strong key="r" className="text-vault-text">Não há recuperação — perder a senha mestra é perder acesso a tudo cifrado com ela</strong>,
                ],
              ]}
            />
          </Sub>

          <Sub title="3.3 Fluxo de login (com persistência de sessão)">
            <OL>
              <li>Usuário abre o app → verifica se já existe uma sessão Supabase válida.</li>
              <li><strong className="text-vault-text">Sem sessão:</strong> vai pra /login, mostra e-mail + senha da conta.</li>
              <li><strong className="text-vault-text">Com sessão</strong> (ex: reload de página): /login detecta automaticamente e pula direto pra "digite sua senha mestra".</li>
              <li>Com a sessão validada, o app busca o perfil de criptografia (salt, verificador, iterações).</li>
              <li>A senha mestra digitada + o salt + o número de iterações salvo (por perfil, não uma constante global) geram a chave AES via PBKDF2.</li>
              <li>Essa chave tenta decifrar o verificador. Se der certo, a chave fica em memória e o cofre abre; se falhar, mostra "Senha mestra incorreta" sem revelar mais nada.</li>
            </OL>
            <P>
              Se o MFA estiver ativado (<Code>lib/features.ts</Code> → <Code>MFA_ENABLED</Code>) e
              o usuário tiver um fator cadastrado, uma etapa extra entra entre o passo 3 e o passo
              4: o app pede o código de 6 dígitos do autenticador antes de buscar o perfil de
              criptografia. Ver seção 5.7.
            </P>
          </Sub>

          <Sub title="3.4 Fluxo de leitura/escrita de um item">
            <UL>
              <li><strong className="text-vault-text">Criar/editar:</strong> a senha é cifrada no navegador (IV novo a cada operação) — só {"{iv, ciphertext}"} vai pro Supabase.</li>
              <li><strong className="text-vault-text">Listar:</strong> a lista trazida contém só ciphertext — nada é decifrado até o usuário pedir.</li>
              <li><strong className="text-vault-text">Ver/copiar:</strong> só nesse momento o item específico é decifrado, sob demanda, usando a chave em memória.</li>
            </UL>
          </Sub>

          <Sub title="3.5 Fluxo de compartilhamento de uma senha por link">
            <P>
              Diferente do resto do app, aqui existe uma exceção deliberada ao "zero-knowledge":
              pra alguém sem a senha mestra conseguir ler uma senha específica através de um link,
              é preciso que essa senha específica seja legível sem a senha mestra — mas só ela, só
              enquanto o link durar.
            </P>
            <OL>
              <li>Ao compartilhar, o navegador gera uma chave AES-256 nova e aleatória (<Code>lib/shareCrypto.ts</Code>), sem nenhuma relação com a senha mestra ou com a chave do cofre.</li>
              <li>A senha é cifrada de novo com essa chave nova.</li>
              <li>O ciphertext, o rótulo, o usuário (texto puro) e a data de expiração vão pra uma tabela nova (<Code>shared_items</Code>) — nunca a chave.</li>
              <li>A chave vai só no fragmento da URL (depois do <Code>#</Code>), que o navegador nunca envia a nenhum servidor: <Code>.../share/ID#k=CHAVE</Code>.</li>
              <li>Quem abre o link (<Code>app/share/[id]/page.tsx</Code>, pública, sem login) busca o registro pelo ID e decifra no próprio navegador, com a chave que veio na URL.</li>
              <li>Expiração é garantida em dois lugares: na interface (10 min a 24h) e no banco (constraint na tabela, teto de 24h independente do que o cliente mandar).</li>
              <li>Revogar simplesmente apaga a linha — sem ela, o link para de funcionar, mesmo antes de expirar.</li>
            </OL>
            <P>
              Comprometer um link comprometido só expõe a senha daquele compartilhamento
              específico, só até expirar ou ser revogado — nunca a senha mestra, a chave do cofre,
              nem qualquer outro item.
            </P>
          </Sub>
        </Section>

        <Section id="funcionalidades" number="4" title="Funcionalidades">
          <UL>
            <li>Criar conta / entrar (e-mail + senha, via Supabase Auth).</li>
            <li>Definir senha mestra na primeira vez (com medidor de força e mínimo de 12 caracteres).</li>
            <li>Destravar o cofre com a senha mestra em sessões seguintes.</li>
            <li>Listar, buscar (por serviço ou usuário) os itens salvos.</li>
            <li><strong className="text-vault-text">Adicionar</strong> um novo item, com gerador de senha aleatória embutido.</li>
            <li><strong className="text-vault-text">Editar</strong> um item existente — reencriptografa com IV novo ao salvar.</li>
            <li><strong className="text-vault-text">Excluir</strong> um item (com confirmação).</li>
            <li><strong className="text-vault-text">Ver</strong> a senha de um item, com ocultação automática após 20s.</li>
            <li><strong className="text-vault-text">Copiar</strong> a senha pra área de transferência, com limpeza automática após 30s.</li>
            <li><strong className="text-vault-text">Mostrar/ocultar</strong> o que está sendo digitado em qualquer campo de senha (ícone de olho), inclusive na senha da conta e na senha mestra.</li>
            <li><strong className="text-vault-text">Compartilhar uma senha por link</strong> — chave própria por link, expiração obrigatória de até 24h escolhida por quem compartilha, revogável a qualquer momento. Quem recebe não precisa de conta nem vê a senha em texto, só copia.</li>
            <li><strong className="text-vault-text">Esqueci minha senha</strong> (da conta, por e-mail) — não afeta nem recupera a senha mestra.</li>
            <li><strong className="text-vault-text">Excluir todos os dados do cofre</strong> (confirmação por palavra-chave) — apaga senhas e perfil de criptografia, mantém a conta.</li>
            <li>Pedido de <strong className="text-vault-text">exclusão completa da conta</strong> por e-mail direto ao suporte.</li>
            <li><strong className="text-vault-text">Autenticação em dois fatores (MFA/TOTP)</strong> — implementada e ativada. Ver seção 5.7.</li>
            <li>Sessão persiste ao recarregar — só a senha mestra (ou o MFA, se ativado) é pedido de novo.</li>
            <li>Botão de logoff (dentro do cofre e também nas etapas de senha mestra/MFA).</li>
            <li>Bloqueio automático do cofre após 5 minutos sem interação.</li>
            <li>Instalável como PWA (ícone, splash screen, tela cheia) no Android/iOS/desktop.</li>
            <li>Meta tags de compartilhamento (Open Graph/Twitter) — o link do app mostra título, descrição e ícone ao ser compartilhado.</li>
          </UL>
        </Section>

        <Section id="seguranca" number="5" title="Modelo de segurança em detalhe">
          <Sub title="5.1 Criptografia">
            <UL>
              <li><strong className="text-vault-text">Derivação de chave:</strong> PBKDF2-HMAC-SHA256, com salt aleatório de 128 bits único por usuário.</li>
              <li><strong className="text-vault-text">Cifra:</strong> AES-256-GCM (autenticada — detecta adulteração do ciphertext), com IV aleatório de 96 bits a cada operação, nunca reutilizado.</li>
              <li><strong className="text-vault-text">Chave não-exportável:</strong> a CryptoKey derivada é <Code>extractable: false</Code> — o próprio código não consegue extrair os bytes crus, só usá-la via encrypt/decrypt.</li>
              <li><strong className="text-vault-text">Verificador de senha mestra:</strong> o app cifra uma string fixa conhecida com a chave derivada; "acertar" a senha mestra é conseguir decifrar essa string de volta. A senha mestra em si nunca é enviada nem armazenada, nem cifrada.</li>
            </UL>
          </Sub>
          <Sub title="5.2 Controle de acesso (Row Level Security)">
            <P>
              Todo acesso ao banco passa por políticas de Row Level Security: cada linha das
              tabelas <Code>vault_profiles</Code> e <Code>vault_items</Code> só é visível/editável
              por quem tem <Code>auth.uid() = user_id</Code> — aplicado automaticamente pelo banco
              em toda consulta, independente do que o cliente pedir. Cobre select, insert, update
              e delete. A política de update não define uma cláusula <Code>WITH CHECK</Code>{" "}
              separada, então o Postgres usa a própria condição do <Code>USING</Code> como
              verificação também da linha depois da alteração — o que impede um usuário de "roubar"
              um item de outro trocando o <Code>user_id</Code> numa edição.
            </P>
          </Sub>
          <Sub title="5.3 Custo do PBKDF2 é por usuário, não uma constante global">
            <P>
              Perfis criados originalmente usam 250.000 iterações; perfis criados após a correção
              de segurança usam 600.000 (recomendação OWASP 2023+). Esse número fica salvo em{" "}
              <Code>vault_profiles.iterations</Code> — não é uma constante fixa no código —
              justamente porque mudar o número de iterações muda por completo a chave derivada de
              uma mesma senha mestra, o que quebraria a decifração de tudo que já foi salvo se não
              fosse versionado por perfil.
            </P>
          </Sub>
          <Sub title="5.4 Cabeçalhos HTTP e Content-Security-Policy">
            <P>
              <Code>middleware.ts</Code> gera uma CSP com um nonce aleatório por requisição,
              restringindo de onde scripts podem ser carregados/executados. <Code>next.config.mjs</Code>{" "}
              adiciona Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options,
              Referrer-Policy e Permissions-Policy. É a principal defesa contra o pior cenário
              técnico possível pra este app: um XSS que tentasse ler a chave em memória ou os
              tokens de sessão.
            </P>
          </Sub>
          <Sub title="5.5 O que o servidor consegue ver, e o que não consegue">
            <Table
              headers={["Dado", "O servidor (Supabase) vê?"]}
              rows={[
                ["Seu e-mail e senha da conta", "Sim (é o próprio provedor de autenticação)"],
                ["Sua senha mestra", <strong key="1" className="text-vault-text">Nunca</strong>],
                ["A chave de criptografia derivada", <strong key="2" className="text-vault-text">Nunca</strong>],
                ["Salt do seu perfil", "Sim (não é segredo — de nada serve sem a senha mestra)"],
                ["Nome do serviço e usuário/e-mail salvos", "Sim, em texto puro (deliberado — não são segredos críticos)"],
                ["A senha de cada item", <strong key="3" className="text-vault-text">Nunca em texto puro</strong>],
              ]}
            />
          </Sub>
          <Sub title="5.6 Compartilhamento de senha por link">
            <P>Cobertura de RLS na tabela <Code>shared_items</Code>:</P>
            <UL>
              <li>O dono só mexe nos próprios compartilhamentos (<Code>auth.uid() = owner_id</Code>) — cria, lista (inclusive expirados) e revoga quando quiser.</li>
              <li>Uma política separada permite leitura pública só enquanto <Code>expires_at &gt; now()</Code> — a única exceção "pública" do banco inteiro, necessária porque quem abre o link não está autenticado como o dono. O segredo real não é a sessão, é o UUID do link (praticamente impossível de adivinhar) somado à chave que só existe na URL.</li>
              <li>Teto de 24h garantido por uma constraint na própria tabela, não só na interface — mesmo manipulando a chamada, não dá pra criar um link que dure mais que isso.</li>
              <li>Excluir todos os dados do cofre também revoga qualquer compartilhamento ativo, por consistência.</li>
            </UL>
          </Sub>
          <Sub title="5.7 Autenticação em dois fatores (MFA) — implementada e ativada">
            <P>
              Detalhamento completo em <Code>MFA.md</Code>, na raiz do projeto. Resumo:
            </P>
            <UL>
              <li>Usa o MFA/TOTP nativo do Supabase Auth — o segredo do autenticador nunca é visto nem guardado por este app, só pelo Supabase internamente.</li>
              <li>Controlado por uma única constante (<Code>lib/features.ts</Code> → <Code>MFA_ENABLED</Code>, hoje <Code>true</Code>). Correção em relação ao que se achava antes: só o MFA por SMS exige o plano Pro do Supabase — o TOTP (o tipo usado aqui) já está disponível no plano gratuito.</li>
              <li>Decisão deliberada de <strong className="text-vault-text">não implementar códigos de backup próprios</strong>: o Supabase não expõe um jeito seguro de elevar a sessão pra "segundo fator validado" a partir de uma verificação nossa por fora do fluxo deles. A recomendação é cadastrar mais de um autenticador (a tela já suporta) e, se perder todos, pedir remoção manual do MFA pelo mesmo canal de e-mail já usado pra exclusão de conta.</li>
            </UL>
          </Sub>
        </Section>

        <Section id="testes" number="6" title="Testes realizados">
          <Sub title="O que foi feito">
            <UL>
              <li><strong className="text-vault-text">48 testes unitários automatizados</strong> (Vitest) cobrindo toda a lógica de <Code>lib/</Code>: round-trip de criptografia (<Code>crypto.ts</Code>, <Code>shareCrypto.ts</Code>), força da senha mestra, a chave em memória (<Code>keyStore.ts</Code>), o rate limiting de borda, e o acesso a dados do Supabase (<Code>shareStore.ts</Code>, <Code>vaultStore.ts</Code>, com o cliente mockado) — inclui um teste dedicado que trava a regressão da expiração de link corrigida na seção 7 (v3). Roda automaticamente em toda alteração via CI (seção 13).</li>
              <li><Code>npm run build</Code> (compilação de produção completa — TypeScript, lint, geração de páginas estáticas) validado sem erros após cada rodada de mudanças, e agora também em todo push/PR via CI.</li>
              <li><Code>npm audit</Code> rodado antes e depois da atualização do Next.js, confirmando a eliminação da CVE crítica e das falhas altas aplicáveis a este app.</li>
              <li>Verificação manual no navegador: ausência de erros de console, ausência de violações de CSP, requisições retornando 200 OK, estrutura de acessibilidade da tela de login, layout do modal de senha em diferentes estados.</li>
              <li>Teste isolado de componentes (modal de edição, cabeçalho do cofre com 4 itens) em rotas temporárias sem autenticação, pra confirmar correções de layout — rotas removidas depois de cada teste.</li>
              <li>Lógica de criptografia do compartilhamento validada isoladamente no console do navegador: gerar chave → cifrar → exportar em base64url → reimportar só a partir da string → decifrar — confirmado que bate com o texto original.</li>
              <li>Página pública <Code>/share/[id]</Code> testada com um link inexistente contra o Supabase real, confirmando que mostra "link inválido" sem quebrar.</li>
              <li><strong className="text-vault-text">MFA testado e confirmado ponta a ponta</strong> contra o Supabase real: sem autenticador cadastrado, o login segue normal; ao cadastrar um em "Duplo fator", o código de 6 dígitos passa a ser exigido em todo login seguinte, logo após a conta autenticar e antes da senha mestra (ver <Code>MFA.md</Code>).</li>
            </UL>
          </Sub>
          <Sub title="O que NÃO foi feito">
            <UL>
              <li><strong className="text-vault-text">Sem testes de integração ou ponta a ponta</strong> (Playwright, Cypress) nem testes de componente React — a cobertura automatizada de hoje é só unitária, sobre a lógica de <Code>lib/</Code>, não sobre as telas.</li>
              <li><strong className="text-vault-text">Não testei o fluxo real de login/criação de conta</strong> contra o projeto Supabase de produção, pra não criar dados de teste reais sem autorização.</li>
              <li><strong className="text-vault-text">Sem teste de penetração formal</strong>, nem automatizado (OWASP ZAP, Burp Suite) nem por terceiros — o Semgrep (seção 13) é SAST estático, não substitui um pentest.</li>
              <li>Sem teste de carga/performance, nem em navegadores reais além do Chromium usado nas verificações.</li>
              <li>Sem teste do fluxo de instalação como PWA num dispositivo móvel real.</li>
            </UL>
          </Sub>
        </Section>

        <Section id="auditorias" number="7" title="Auditorias realizadas — histórico consolidado">
          <Table
            headers={["Rodada", "Data", "Foco", "Resultado"]}
            rows={[
              [
                "v1",
                "2026-08-13",
                "Arquitetura completa: criptografia, RLS, dependências, cabeçalhos, força de senha",
                "5 achados Altos e 4 Médios corrigidos em código; itens de configuração do Supabase documentados como pendentes",
              ],
              [
                "v2",
                "2026-08-13",
                "Sessão persistente, botão de logoff, edição de itens, ícone de marca",
                "Confirmado que a sessão persistente não enfraquece a segurança; RLS de UPDATE verificada; nenhum novo achado de risco",
              ],
              [
                "v2.1",
                "2026-08-13",
                "Correção de layout (overflow do botão \"Gerar\")",
                "Corrigido com min-w-0 — puramente visual, sem implicação de segurança",
              ],
              [
                "v2.2",
                "2026-08-14",
                "Compartilhamento de senha por link, MFA (feature-flagged), recuperação de senha, exclusão de dados/conta",
                "Revisão de segurança feita durante a própria implementação: chave de compartilhamento com escopo confirmado, teto de 24h em duas camadas, MFA isolado atrás de um flag sem chamadas em produção enquanto desativado",
              ],
              [
                "v3",
                "2026-08-15",
                "Fix da expiração de link compartilhado, testes automatizados, CI/CD, SAST, Dependabot, rate limiting de borda, monitoramento externo",
                "Corrigido um bypass real de RLS (dono logado conseguia abrir o próprio link já expirado); 48 testes travam as invariantes de criptografia; todo push passa por lint+tipos+testes+build antes de main; SAST e Dependabot rodam em toda PR. Ver comparativo detalhado e tabela de prós/contras em AUDITORIA_SEGURANCA_V3.md",
              ],
            ]}
          />
          <Sub title="Achados corrigidos ao longo das auditorias">
            <OL>
              <li>PBKDF2 abaixo do recomendado → 600k iterações (por perfil, com compatibilidade retroativa)</li>
              <li>Sem exigência de força pra senha mestra → mínimo 12 caracteres + medidor de força + bloqueio de senhas comuns</li>
              <li>Sem CSP/cabeçalhos de segurança → CSP com nonce + HSTS + demais headers</li>
              <li>Next.js com CVE crítica → atualizado para versão corrigida</li>
              <li>Sem bloqueio por inatividade → trava automática após 5 min</li>
              <li>Sem limites de tamanho no banco → check constraints adicionados</li>
              <li>Viés estatístico no gerador de senha aleatória → corrigido via rejection sampling</li>
              <li>Campo de senha visível por padrão → oculto por padrão, com botão mostrar/ocultar</li>
              <li>Link compartilhado expirado continuava acessível pro dono logado (RLS de select do dono não checa <Code>expires_at</Code>, de propósito, pra ele ver histórico) → <Code>getShare()</Code> agora valida a expiração explicitamente no código, não só via RLS</li>
            </OL>
          </Sub>
        </Section>

        <Section id="nivel" number="8" title="Quão segura é a aplicação, e para quais níveis de senha">
          <Sub title="8.1 Resposta direta">
            <P>
              <strong className="text-vault-text">
                Não existe "100% seguro" em software — isso vale pra qualquer aplicação, comercial
                ou pessoal.
              </strong>{" "}
              O que posso afirmar com base nas auditorias feitas:
            </P>
            <UL>
              <li>Nenhuma vulnerabilidade conhecida e não mitigada foi encontrada no código revisado, nas duas rodadas de auditoria.</li>
              <li>A arquitetura (zero-knowledge, chave nunca sai do dispositivo, RLS por linha, criptografia autenticada) é estruturalmente correta e segue práticas atuais recomendadas (OWASP).</li>
              <li>As camadas de defesa em profundidade que normalmente faltam em projetos pessoais desse tipo (CSP, cabeçalhos, política de senha forte, bloqueio por inatividade) foram implementadas.</li>
            </UL>
          </Sub>
          <Sub title="8.2 Por nível de senha">
            <Table
              headers={["Tipo de senha", "Recomendação", "Por quê"]}
              rows={[
                [
                  "Contas pessoais comuns (redes sociais, streaming, fóruns)",
                  "✅ Seguro guardar aqui",
                  "Risco baixo mesmo em caso de comprometimento; proteção bem acima do que a maioria das pessoas usa",
                ],
                [
                  "E-mail principal",
                  "✅ Seguro, com senha mestra forte e checklist da seção 11 completo",
                  "O e-mail principal costuma ser a chave-mestra de recuperação de tudo mais",
                ],
                [
                  "Cartão de crédito / dados de pagamento",
                  "✅ Seguro do ponto de vista técnico da criptografia",
                  "AES-256-GCM protege esse dado tão bem quanto qualquer outro texto guardado",
                ],
                [
                  "Banco (senha de acesso à conta, app bancário)",
                  "✅ Seguro com o checklist da seção 11 completo (especialmente MFA + senha mestra forte)",
                  "Vale garantir que TODAS as camadas, não só a criptografia, estejam ativas",
                ],
                [
                  "Servidores de produção / infraestrutura crítica",
                  "🟡 Avalie o risco com atenção antes",
                  "Ver seção 8.3 — um app sem auditoria de terceiros carrega mais risco residual",
                ],
              ]}
            />
          </Sub>
          <Sub title="8.3 Sobre auditoria independente">
            <P>
              As duas auditorias deste documento foram feitas internamente, a pedido do
              proprietário — não por uma empresa de segurança terceirizada. Isso é diferente do
              histórico de escrutínio público que produtos maduros como Bitwarden, 1Password ou
              KeePass acumulam ao longo de anos, incluindo programas de recompensa por
              vulnerabilidades (bug bounty) abertos a pesquisadores externos. Isso não significa
              que o app seja inseguro — significa que a confiança nele hoje vem de revisões
              pontuais, não de um histórico contínuo de validação externa. Para segredos de
              altíssima criticidade onde um erro é catastrófico e irreversível, essa diferença deve
              pesar na decisão. A{" "}
              <a href="#comercial" className="text-vault-steel hover:text-vault-steelBright">
                seção 9
              </a>{" "}
              detalha o que fecharia essa lacuna.
            </P>
          </Sub>
        </Section>

        <Section id="comercial" number="9" title="Caminho para um produto comercial (upgrade futuro)">
          <P>
            Esta seção existe pra responder: <strong className="text-vault-text">"o que faltaria
            pra transformar isso num produto real, vendável, com usuários que não sejam só eu?"</strong>{" "}
            Nada aqui é urgente pro uso pessoal atual — é um roteiro de melhorias pra quando/se
            esse for o objetivo.
          </P>
          <Sub title="9.1 Segurança e conformidade">
            <UL>
              <li>Auditoria de segurança por empresa terceirizada independente, incluindo pentest formal — o passo mais importante pra fechar a lacuna da seção 8.3.</li>
              <li>Programa de bug bounty, aberto a pesquisadores de segurança externos.</li>
              <li>Migrar a derivação de chave de PBKDF2 para Argon2id.</li>
              <li>Gestão de segredos via KMS/HSM dedicado, em vez de depender só das variáveis de ambiente do provedor de hospedagem.</li>
              <li>Certificações formais conforme o público-alvo: SOC 2 Type II, ISO 27001.</li>
              <li>Conformidade com LGPD/GDPR: política de privacidade, termos de uso, contrato de processamento de dados (DPA), fluxo formal de exportação/exclusão de dados.</li>
              <li>Plano de resposta a incidentes e canal formal de divulgação de vulnerabilidades.</li>
            </UL>
          </Sub>
          <Sub title="9.2 Infraestrutura e operação">
            <UL>
              <li>Infraestrutura dedicada (hoje roda em plano gratuito do Supabase) com backups multi-região e plano de recuperação de desastre.</li>
              <li>✅ <strong className="text-vault-text">Implementado</strong> — monitoramento externo (UptimeRobot) e status page pública (detalhes e link em <Code>MONITORAMENTO.md</Code>). Fica explícito ali que é monitoramento informal, de melhor esforço — um <strong className="text-vault-text">SLA contratual formal</strong> de disponibilidade continua sendo item de produto comercial, não de projeto pessoal.</li>
              <li>✅ <strong className="text-vault-text">Implementado</strong> — pipeline de CI/CD (GitHub Actions): lint + checagem de tipos + os 48 testes automatizados + build de produção em toda alteração; SAST (Semgrep) e atualização automática de dependências (Dependabot) rodando em toda PR. Ver detalhes na seção 13.</li>
              <li>🟡 <strong className="text-vault-text">Parcialmente implementado</strong> — throttle de borda (Upstash) na rota pública <Code>/share/[id]</Code>, contra enumeração de links (seção 13). Proteção de DDoS dedicada em nível de infraestrutura (WAF, ex: Cloudflare) continua fora de escopo — e rate limiting/CAPTCHA no login em si depende do painel do Supabase (seção 11, item 4), não é algo que dê pra fazer só no código deste app.</li>
              <li>Processo formal de troca de senha mestra, com reencriptação automática de todos os itens existentes — deliberadamente deixado por último, pra avaliar prós e contras depois que o resto desta lista estivesse pronto.</li>
            </UL>
          </Sub>
          <Sub title="9.3 Produto e experiência">
            <UL>
              <li>Sincronização entre múltiplos dispositivos com resolução de conflitos.</li>
              <li>Extensão de navegador para autopreenchimento.</li>
              <li>Trilha de auditoria completa (log de acessos) e exportação/backup do cofre.</li>
              <li>Acessibilidade (WCAG) e internacionalização (hoje só em português).</li>
              <li>Fluxo de acesso de emergência/legado digital.</li>
            </UL>
          </Sub>
          <Sub title="9.4 Negócio e jurídico">
            <UL>
              <li>Constituição formal de empresa e seguro de responsabilidade civil/cibernético.</li>
              <li>Infraestrutura de cobrança e planos, com termos de serviço revisados por um advogado.</li>
              <li>Canal formal de suporte ao cliente.</li>
            </UL>
          </Sub>
        </Section>

        <Section id="limitacoes" number="10" title="Limitações conhecidas">
          <UL>
            <li>Sem campo de notas na UI (o banco já suporta a coluna, falta só o formulário).</li>
            <li>Sem trilha de auditoria/log de acessos.</li>
            <li>Sem exportação/backup do cofre.</li>
            <li>Clipboard: a senha copiada pode persistir em gerenciadores de histórico do sistema operacional além dos 30s que o app tenta limpar — limitação da plataforma.</li>
            <li>Sem tratamento de erro visível na interface se salvar/editar falhar por perda de conexão — não é falha de segurança, é robustez de UX pendente.</li>
            <li>Cofres criados antes da correção do PBKDF2 continuam em 250.000 iterações até a senha mestra ser redefinida.</li>
          </UL>
        </Section>

        <Section id="pendencias" number="11" title="Ações manuais pendentes">
          <P>
            Estas dependem de configuração no painel do Supabase ou de uma ação sua — não são
            coisas que o código sozinho resolve:
          </P>
          <OL>
            <li>Rodar <Code>supabase/schema.sql</Code> novamente no SQL Editor do Supabase (adiciona a coluna <Code>iterations</Code>, os limites de tamanho, e agora também a tabela <Code>shared_items</Code> do compartilhamento — idempotente). Sem isso, compartilhar por link não funciona.</li>
            <li>Habilitar "Leaked password protection" em Authentication → Settings.</li>
            <li>CAPTCHA (Cloudflare Turnstile) no login/criar conta/recuperar senha: código pronto (<Code>components/Turnstile.tsx</Code>, vira no-op sem a env var). Falta criar a conta grátis na Cloudflare, colocar <Code>NEXT_PUBLIC_TURNSTILE_SITE_KEY</Code> na Vercel, e habilitar a proteção no painel do Supabase (Authentication → Settings → CAPTCHA) — diferente do throttle de borda em <Code>/share/[id]</Code>, que já está 100% ativo (ver seção 13).</li>
            <li>Redefinir sua senha mestra atual, se quiser migrar de 250k pra 600k iterações de PBKDF2 (opcional).</li>
          </OL>
        </Section>

        <Section id="estrutura" number="12" title="Estrutura de arquivos">
          <Block>{`vault-app/
├── app/
│   ├── page.tsx                  # Redireciona pra /login ou /vault conforme sessão
│   ├── layout.tsx                # Layout raiz, fontes, metadata PWA/Open Graph
│   ├── icon.png, apple-icon.png, favicon.ico   # Ícones (convenção Next.js App Router)
│   ├── login/page.tsx            # Login, criação de conta, senha mestra, MFA, esqueci a senha
│   ├── reset-password/page.tsx   # Definir nova senha da conta (link vindo do e-mail)
│   ├── vault/page.tsx            # Tela principal do cofre
│   ├── share/[id]/page.tsx       # Página pública de quem recebe um link compartilhado
│   ├── docs/page.tsx             # Esta documentação, publicada em /docs
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
│   ├── rateLimit.ts              # Throttle de borda em /share/[id] (Upstash, no-op sem env vars)
│   ├── features.ts               # Interruptor MFA_ENABLED
│   ├── constants.ts              # E-mail de suporte pra pedidos de exclusão de conta
│   ├── supabaseClient.ts         # Cliente do Supabase (chave anon pública)
│   └── *.test.ts                 # 48 testes unitários (Vitest) — um por arquivo acima
├── supabase/
│   └── schema.sql                # Tabelas, RLS, constraints (rodar no SQL Editor)
├── .github/
│   ├── workflows/ci.yml              # Lint + tipos + testes + build em toda PR
│   ├── workflows/promote-to-main.yml # Promove pre-producao -> main quando o ci passa
│   ├── workflows/semgrep.yml         # SAST, roda em qualquer visibilidade de repo
│   └── dependabot.yml                # Atualização semanal de npm + github-actions
├── middleware.ts                 # CSP com nonce por requisição + rate limiting de /share/*
├── next.config.mjs               # Cabeçalhos de segurança (HSTS, X-Frame-Options, etc.)
├── vitest.config.mts             # Configuração dos testes unitários
├── .eslintrc.json                # Configuração do lint (usado pelo CI)
├── public/
│   ├── manifest.json             # Manifest do PWA (cores, ícones, screenshots)
│   ├── sw.js                     # Service worker
│   ├── icons/                    # Ícones do manifest (192px, 512px)
│   ├── screenshots/               # Screenshots do manifest
│   └── guide/                    # Prints usados no guia de uso (/ajuda)
├── AUDITORIA_SEGURANCA.md        # Primeira auditoria de segurança
├── AUDITORIA_SEGURANCA_V2.md     # Segunda auditoria de segurança
├── AUDITORIA_SEGURANCA_V3.md     # Terceira auditoria — testes, CI/CD, SAST, rate limiting, monitoramento
├── MFA.md                        # O que foi feito sobre Duplo fator e como ativar
├── MONITORAMENTO.md              # Uptime, alertas e status page pública (sem SLA formal)
├── DOCUMENTACAO.md               # Guia rápido de instalação/deploy
└── README.md                     # Documentação técnica completa (este conteúdo, em markdown)`}</Block>
        </Section>

        <Section id="cicd" number="13" title="CI/CD, testes automatizados e operação">
          <P>
            Implementado na v3 (seção 7), fechando boa parte do que a seção 9.2 listava como
            "caminho para um produto comercial" — adaptado ao que faz sentido pra um projeto
            pessoal, sem nenhum custo recorrente.
          </P>
          <Sub title="13.1 Fluxo de branches">
            <P>
              Desenvolvimento acontece em branches de feature → PR pra <Code>pre-producao</Code>{" "}
              (roda o check <Code>ci</Code>) → depois de mergeado, um segundo workflow abre
              automaticamente uma PR <Code>pre-producao → main</Code>, espera o mesmo check{" "}
              <Code>ci</Code> passar de novo, e mergeia sozinho — sem clique manual. A{" "}
              <Code>main</Code> é a branch que a Vercel usa pra produção.
            </P>
            <P>
              O merge automático não depende do recurso nativo "auto-merge" do GitHub (que em
              repositório privado só existe em plano pago) — o workflow espera o check terminar e
              chama o merge diretamente, então funciona igual num repositório privado gratuito.
              Autenticação do workflow via um Personal Access Token com escopo mínimo (permissão
              só de conteúdo + pull requests, restrito a este repositório).
            </P>
          </Sub>
          <Sub title="13.2 O que o CI verifica em toda alteração">
            <UL>
              <li><Code>next lint</Code> (ESLint).</li>
              <li><Code>tsc --noEmit</Code> (checagem de tipos).</li>
              <li>Os 48 testes unitários (Vitest).</li>
              <li><Code>next build</Code> (build de produção completo).</li>
              <li>Semgrep (SAST) com regras públicas de JavaScript/TypeScript/React/OWASP Top 10.</li>
            </UL>
          </Sub>
          <Sub title="13.3 Dependências">
            <P>
              Dependabot abre PRs semanais de atualização (npm e GitHub Actions), agrupando bumps
              de patch/minor numa PR só pra não gerar ruído excessivo. Alertas de vulnerabilidade
              em dependências habilitados no painel do repositório.
            </P>
          </Sub>
          <Sub title="13.4 Rate limiting de borda">
            <P>
              <Code>middleware.ts</Code> aplica um throttle (janela deslizante, via Upstash Redis)
              só na rota pública <Code>/share/[id]</Code>, como camada extra contra enumeração de
              links compartilhados. Falha aberta por design — se o Upstash não estiver configurado
              ou responder com erro, a requisição segue normalmente; isso é mitigação de abuso, não
              a fronteira de segurança real do app (essa continua sendo RLS + criptografia
              zero-knowledge, ver seção 5).
            </P>
          </Sub>
          <Sub title="13.5 Monitoramento">
            <P>
              Uptime externo (UptimeRobot, plano gratuito) verificando a aplicação e a borda do
              projeto Supabase a cada 5 minutos, com alerta por e-mail e uma status page pública.
              Detalhes completos, incluindo o link da status page, em <Code>MONITORAMENTO.md</Code>.
            </P>
          </Sub>
        </Section>
      </div>
    </div>
  );
}
