import type { Metadata } from "next";
import Link from "next/link";
import Screenshot from "@/components/Screenshot";

export const metadata: Metadata = {
  title: "Como usar o Cofre",
  description: "Guia passo a passo, com prints de tela, pra quem nunca usou o Cofre antes.",
};

function Step({
  n,
  title,
  children,
  img,
  imgAlt,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  img?: string;
  imgAlt?: string;
}) {
  return (
    <div className="flex gap-4 mb-10">
      <div className="shrink-0 w-8 h-8 rounded-full bg-vault-steel text-vault-bg font-semibold text-sm flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-base font-semibold text-vault-text mb-2">{title}</h3>
        <div className="text-sm text-vault-muted leading-relaxed space-y-2">{children}</div>
        {img && <Screenshot src={img} alt={imgAlt || title} />}
      </div>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mt-14">
      <h2 className="text-xl font-semibold text-vault-text mb-6 pb-2 border-b border-vault-border">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-vault-panel border border-vault-steel/40 rounded-lg p-4 my-4">
      <p className="text-sm text-vault-text leading-relaxed">{children}</p>
    </div>
  );
}

function Warning({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-vault-panel border border-vault-danger/50 rounded-lg p-4 my-4">
      <p className="text-sm text-vault-text leading-relaxed">
        <strong className="text-vault-danger">Atenção: </strong>
        {children}
      </p>
    </div>
  );
}

const toc = [
  ["duas-senhas", "As duas senhas — qual é qual"],
  ["criar-conta", "Criar sua conta"],
  ["senha-mestra", "Definir sua senha mestra"],
  ["adicionar", "Adicionar uma senha"],
  ["ver-copiar", "Ver e copiar uma senha salva"],
  ["editar", "Editar uma senha"],
  ["excluir", "Excluir uma senha"],
  ["compartilhar", "Compartilhar uma senha com alguém"],
  ["esqueci", "Esqueci a senha da minha conta"],
  ["instalar", "Instalar no celular como um aplicativo"],
  ["duvidas", "Perguntas frequentes"],
  ["ajuda", "Precisa de ajuda?"],
];

export default function AjudaPage() {
  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 bg-vault-bg/90 backdrop-blur border-b border-vault-border px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" width={24} height={24} className="w-6 h-6 rounded-md" />
          <span className="font-semibold text-sm tracking-tight">Cofre — Como usar</span>
        </div>
        <Link href="/" className="text-xs text-vault-muted hover:text-vault-text transition">
          Voltar ao app
        </Link>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <h1 className="text-2xl font-semibold text-vault-text mb-4">Como usar o Cofre</h1>
        <p className="text-sm text-vault-muted leading-relaxed mb-2">
          Um guia simples, com prints de cada tela, pra quem nunca usou o Cofre antes. Não precisa
          entender nada de tecnologia — é só seguir os passos.
        </p>
        <p className="text-xs text-vault-muted mb-8">
          Prefere a versão técnica?{" "}
          <a href="/docs" className="text-vault-steel hover:text-vault-steelBright">
            Veja a documentação completa
          </a>
          .
        </p>

        <div className="bg-vault-panel border border-vault-border rounded-lg p-4 mb-4">
          <p className="text-xs font-medium text-vault-text mb-2">Nesta página</p>
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

        <Section id="duas-senhas" title="As duas senhas — qual é qual">
          <p className="text-sm text-vault-muted leading-relaxed mb-4">
            O Cofre usa <strong className="text-vault-text">duas senhas diferentes</strong>, e isso
            confunde todo mundo no início. Pensa assim:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
              <p className="text-sm font-semibold text-vault-text mb-1">🔑 Senha da conta</p>
              <p className="text-xs text-vault-muted leading-relaxed">
                É como a chave da porta de casa. Serve pra entrar no aplicativo. Se esquecer, dá
                pra pedir uma nova por e-mail, igual em qualquer outro site.
              </p>
            </div>
            <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
              <p className="text-sm font-semibold text-vault-text mb-1">🛡️ Senha mestra</p>
              <p className="text-xs text-vault-muted leading-relaxed">
                É a combinação do cofre lá dentro de casa. É ela que "tranca" e "destranca" todas
                as suas senhas guardadas.{" "}
                <strong className="text-vault-text">Se esquecer essa, ninguém consegue recuperar</strong>{" "}
                — nem a gente.
              </p>
            </div>
          </div>
          <Warning>
            Guarde sua senha mestra em algum lugar seguro fora do celular (um papel guardado, por
            exemplo). Não existe um "esqueci minha senha" pra ela — é assim de propósito, pra
            garantir que só você consiga ver suas senhas guardadas.
          </Warning>
        </Section>

        <Section id="criar-conta" title="Criar sua conta">
          <Step n={1} title="Abra o Cofre e escolha &quot;Criar conta&quot;" img="/guide/01-login.png" imgAlt="Tela de login do Cofre">
            <p>Na tela inicial, toque em "Criar conta" no topo do formulário.</p>
          </Step>
          <Step
            n={2}
            title="Preencha e-mail e uma senha da conta"
            img="/guide/02-criar-conta.png"
            imgAlt="Aba de criar conta, com campos de e-mail e senha"
          >
            <p>
              Use um e-mail que você acessa de verdade — é pra onde vai o link de confirmação.
              Escolha uma senha de conta com pelo menos 10 caracteres. Toque no ícone do olho pra
              ver o que está digitando, se quiser conferir.
            </p>
          </Step>
          <Step n={3} title="Confirme seu e-mail">
            <p>
              Você vai receber um e-mail (confira também a caixa de spam) com um link de
              confirmação. Depois de clicar nele, volte pro Cofre e entre normalmente.
            </p>
          </Step>
        </Section>

        <Section id="senha-mestra" title="Definir sua senha mestra">
          <Step
            n={1}
            title="Na primeira vez, o app pede pra você criar a senha mestra"
            img="/guide/03-senha-mestra-nova.png"
            imgAlt="Tela de definir a senha mestra pela primeira vez"
          >
            <p>
              Digite uma senha com pelo menos 12 caracteres, misturando letras, números e
              símbolos. Uma barrinha colorida mostra se ela está fraca ou forte. Digite de novo
              pra confirmar.
            </p>
          </Step>
          <Tip>
            Depois desse primeiro cadastro, toda vez que você abrir o Cofre de novo (ou recarregar
            a página), ele vai pedir só essa senha mestra — como mostra o próximo print.
          </Tip>
          <Screenshot src="/guide/04-senha-mestra-entrar.png" alt="Tela de digitar a senha mestra nos acessos seguintes" />
        </Section>

        <Section id="adicionar" title="Adicionar uma senha">
          <Step n={1} title="Toque no botão + no canto da tela" img="/guide/05-cofre-vazio.png" imgAlt="Cofre vazio, com o botão de adicionar em destaque">
            <p>Assim que entrar no cofre pela primeira vez, ele vai estar vazio. É só tocar no círculo com o "+" no canto inferior direito.</p>
          </Step>
          <Step n={2} title="Preencha os dados" img="/guide/06-nova-senha.png" imgAlt="Formulário de nova senha">
            <p>
              <strong className="text-vault-text">Serviço:</strong> o nome do site ou app (ex:
              "Gmail", "Banco Itaú"). <strong className="text-vault-text">Usuário:</strong> seu
              login ou e-mail nesse site (opcional). <strong className="text-vault-text">Senha:</strong>{" "}
              digite a senha, ou toque em "Gerar" pra criar uma bem forte na hora.
            </p>
          </Step>
          <Step n={3} title="Toque em &quot;Salvar&quot;">
            <p>Pronto — a senha já aparece na sua lista, guardada com segurança.</p>
          </Step>
        </Section>

        <Section id="ver-copiar" title="Ver e copiar uma senha salva">
          <Screenshot src="/guide/07-cofre-lista.png" alt="Lista de senhas salvas no cofre" />
          <p className="text-sm text-vault-muted leading-relaxed mb-4">
            Cada senha salva aparece como um cartão, com o nome do serviço e o usuário. Por
            segurança, a senha em si vem sempre escondida (uma fileira de pontinhos).
          </p>
          <Step n={1} title="Toque em &quot;Ver&quot; pra revelar a senha" img="/guide/08-senha-revelada.png" imgAlt="Card de senha com a senha revelada">
            <p>Ela some sozinha depois de 20 segundos, por segurança — não precisa se preocupar em escondê-la de novo.</p>
          </Step>
          <Step n={2} title="Ou toque em &quot;Copiar&quot;">
            <p>
              Copia a senha direto pra área de transferência do celular/computador — é só colar
              onde você precisa usá-la. Por segurança, o Cofre limpa a área de transferência
              sozinho depois de 30 segundos.
            </p>
          </Step>
        </Section>

        <Section id="editar" title="Editar uma senha">
          <Step
            n={1}
            title="Toque no ícone de lápis, no canto do card"
            img="/guide/09-editar.png"
            imgAlt="Formulário de edição de senha, já preenchido"
          >
            <p>
              Abre o mesmo formulário de quando você criou, já preenchido. Mude o que precisar
              (trocou a senha nesse site? é aqui que atualiza) e toque em "Salvar alterações".
            </p>
          </Step>
        </Section>

        <Section id="excluir" title="Excluir uma senha">
          <Step n={1} title="Toque no ícone de lixeira, no canto do card">
            <p>
              O app pede uma confirmação antes de apagar — depois de confirmado, não tem como
              desfazer, então confira se é o item certo antes.
            </p>
          </Step>
        </Section>

        <Section id="compartilhar" title="Compartilhar uma senha com alguém">
          <p className="text-sm text-vault-muted leading-relaxed mb-4">
            Às vezes você precisa passar uma senha pra alguém de confiança — um familiar, um
            colega de trabalho. Em vez de mandar a senha em texto puro por mensagem (o que não é
            nada seguro), o Cofre cria um link temporário só pra isso.
          </p>
          <Step
            n={1}
            title="Toque no ícone de compartilhar, no canto do card"
            img="/guide/10-compartilhar.png"
            imgAlt="Tela de compartilhar uma senha, com opções de expiração"
          >
            <p>Escolha por quanto tempo o link deve funcionar (de 10 minutos até no máximo 24 horas) e toque em "Gerar link".</p>
          </Step>
          <Step n={2} title="Envie o link">
            <p>
              Toque em "Compartilhar" pra abrir as opções do seu celular (WhatsApp, Mensagens,
              etc.), ou em "Copiar link" pra colar onde quiser.
            </p>
          </Step>
          <Step n={3} title="A pessoa que recebe só consegue copiar, não ver de cara">
            <p>
              Quando ela abrir o link, aparece o nome do serviço e um botão "Copiar" — a senha
              fica escondida até ela pedir pra ver. Não precisa ter conta no Cofre nem saber sua
              senha mestra.
            </p>
          </Step>
          <Tip>
            Mudou de ideia depois de compartilhar? Toque em "Compartilhamentos" no topo do cofre
            pra ver todos os links ativos e revogar (cancelar) quando quiser, mesmo antes de
            expirar.
          </Tip>
        </Section>

        <Section id="esqueci" title="Esqueci a senha da minha conta">
          <p className="text-sm text-vault-muted leading-relaxed mb-2">
            Isso é só pra senha da <strong className="text-vault-text">conta</strong> (a chave da
            porta), não pra senha mestra.
          </p>
          <Step n={1} title="Na tela de login, toque em &quot;Esqueci minha senha&quot;">
            <p>Digite seu e-mail e toque em enviar. Você vai receber um link por e-mail pra escolher uma senha de conta nova.</p>
          </Step>
          <Warning>
            Depois de trocar a senha da conta, você ainda vai precisar digitar sua senha mestra
            normalmente — ela não muda nesse processo, e continua sem recuperação se você a
            esquecer.
          </Warning>
        </Section>

        <Section id="instalar" title="Instalar no celular como um aplicativo">
          <p className="text-sm text-vault-muted leading-relaxed mb-4">
            O Cofre funciona no navegador, mas dá pra instalar como se fosse um app de verdade, com
            ícone na tela inicial.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
              <p className="text-sm font-semibold text-vault-text mb-1">Android (Chrome)</p>
              <p className="text-xs text-vault-muted leading-relaxed">
                Abra o link do Cofre → toque nos três pontinhos (⋮) no canto → "Adicionar à tela
                inicial" ou "Instalar app".
              </p>
            </div>
            <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
              <p className="text-sm font-semibold text-vault-text mb-1">iPhone (Safari)</p>
              <p className="text-xs text-vault-muted leading-relaxed">
                Abra o link do Cofre → toque no ícone de compartilhar (o quadrado com a seta pra
                cima) → "Adicionar à Tela de Início".
              </p>
            </div>
          </div>
        </Section>

        <Section id="duvidas" title="Perguntas frequentes">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-vault-text mb-1">E se eu esquecer a senha mestra?</p>
              <p className="text-sm text-vault-muted leading-relaxed">
                Infelizmente não tem como recuperar as senhas já salvas — é o preço de garantir que
                nem quem administra o Cofre consiga ver suas senhas. Por isso vale guardar essa
                senha em algum lugar seguro fora do celular.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-vault-text mb-1">É seguro guardar senha de banco aqui?</p>
              <p className="text-sm text-vault-muted leading-relaxed">
                Sim — toda senha é criptografada no seu próprio aparelho antes de qualquer coisa
                ser enviada. Quem quiser entender os detalhes técnicos pode ver a{" "}
                <a href="/docs#nivel" className="text-vault-steel hover:text-vault-steelBright">
                  documentação técnica
                </a>
                .
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-vault-text mb-1">Por que preciso digitar a senha mestra de novo às vezes?</p>
              <p className="text-sm text-vault-muted leading-relaxed">
                Se você recarregar a página ou ficar 5 minutos sem mexer no cofre, ele tranca
                sozinho por segurança — mesmo que você continue logado na sua conta. É só destravar
                de novo com a senha mestra.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-vault-text mb-1">Quero apagar minha conta de vez. Como faço?</p>
              <p className="text-sm text-vault-muted leading-relaxed">
                Na tela de login, tem um link "Quer apagar sua conta por completo?" que já abre um
                e-mail pronto pra pedir isso.
              </p>
            </div>
          </div>
        </Section>

        <Section id="ajuda" title="Precisa de ajuda?">
          <p className="text-sm text-vault-muted leading-relaxed">
            Alguma dúvida que este guia não respondeu? É só chamar quem administra o Cofre pra você.
          </p>
        </Section>
      </div>
    </div>
  );
}
