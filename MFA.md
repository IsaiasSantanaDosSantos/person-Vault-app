# Autenticação em Dois Fatores (MFA) — o que foi feito

**Status atual: ativado.** `lib/features.ts` → `MFA_ENABLED = true`.

---

## Correção importante (histórico)

Achávamos que o MFA por TOTP exigia o plano Pro do Supabase. **Isso estava errado.** Só o **MFA por SMS** exige Pro — o **TOTP (app autenticador)**, que é o que este app usa, já vem disponível no plano gratuito (confirmado em Authentication → Multi-Factor → "TOTP (App Authenticator)": Enabled, sem nenhum aviso de plano pago). A confusão aconteceu porque as duas opções ficam na mesma tela, mas são recursos independentes com regras de plano diferentes.

## O que foi implementado

| Peça | Arquivo | O que faz |
|---|---|---|
| Interruptor | `lib/features.ts` | Uma única constante, `MFA_ENABLED`. Controla se o recurso inteiro está ligado ou desligado. |
| Chamadas ao Supabase | `lib/mfaStore.ts` | Fina camada sobre `supabase.auth.mfa.*` — cadastrar fator, confirmar cadastro, verificar código no login, remover fator, checar se a sessão atual já passou pelo segundo fator. |
| Tela de cadastro/gestão | `components/MfaSettingsModal.tsx` | Cadastra um autenticador novo (nome → QR code + segredo → confirmar com código), lista os já cadastrados, remove. |
| Etapa no login | `app/login/page.tsx` | Uma nova etapa ("mfa"), entre e-mail/senha e a senha mestra, que só aparece se o usuário tiver algum fator cadastrado. |
| Botão no cofre | `app/vault/page.tsx` | "Duplo fator" no cabeçalho — agora clicável, abre a tela de cadastro/gestão. |

## Como funciona

1. No cabeçalho do cofre, toque em **"Duplo fator"** → **"Ativar"** → dê um nome pro autenticador (ex: "Celular") → escaneie o QR code com o Google Authenticator (ou qualquer outro app TOTP — Authy, Microsoft Authenticator, o gerador de TOTP do Bitwarden/1Password, todos funcionam igual, é um padrão aberto) → digite o código de 6 dígitos gerado pra confirmar.
2. Da próxima vez que entrar (e-mail + senha), aparece uma etapa nova pedindo esse código de 6 dígitos antes de ir pra senha mestra.
3. O segredo do TOTP nunca é visto nem guardado por este app — fica só dentro do Supabase, gerenciado internamente por eles. O app só manda o código de 6 dígitos pra eles validarem.

## Por que não tem "código de backup"

Cheguei a considerar implementar códigos de backup por conta própria (uma tabela nossa, com hash dos códigos), mas esbarra num problema técnico real: o Supabase não dá um jeito seguro de "avisar" que uma sessão deve ser tratada como se tivesse passado pelo segundo fator, a partir de uma validação nossa por fora — isso só acontece de verdade quando você valida um fator cadastrado neles mesmo. Forçar isso do nosso lado exigiria um servidor próprio só pra essa validação, complexidade grande pra um risco que dá pra resolver mais simples:

- **Cadastre mais de um autenticador** (o botão "Adicionar outro" já existe pra isso) — celular + notebook, por exemplo. Perdeu um, usa o outro.
- **Se perder todos:** peça pra remover o MFA da sua conta manualmente — o mesmo fluxo já existente pra pedir exclusão de conta (e-mail pro suporte, ver `lib/constants.ts` → `SUPPORT_EMAIL`), só que pedindo pra remover o segundo fator em vez de apagar tudo. Quem administra o Supabase (você, hoje) resolve em Authentication → Users → o usuário → Multi-Factor, sem precisar de nenhum código novo.

## ⚠️ Próximo passo — testar de verdade

Este fluxo **nunca tinha sido testado contra um Supabase real** até agora (o código foi escrito seguindo a documentação oficial da API, mas sem validação ponta a ponta, já que antes achávamos que precisava do plano Pro). Agora que está ativado:

1. Entre no app, cadastre um autenticador em "Duplo fator", confirme com o código de 6 dígitos.
2. Saia da conta e entre de novo — confirme que a etapa do código aparece e que o código do seu app autenticador realmente funciona.
3. Cadastre um **segundo** autenticador (outro dispositivo), pelo motivo explicado acima.

Se algo não funcionar como esperado nesse teste, me avisa com o que aconteceu (mensagem de erro, em que etapa travou) que eu ajusto.

## Reverter (se precisar desativar)

Troque `MFA_ENABLED` de volta pra `false` em `lib/features.ts`. A etapa de verificação some do login imediatamente; quem já tinha cadastrado um autenticador não é mais obrigado a usá-lo (mas o cadastro continua existindo no Supabase até ser removido manualmente).
