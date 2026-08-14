# Autenticação em Dois Fatores (MFA) — o que foi feito e o que falta

**Status atual:** implementado no código, **desativado por padrão**. Não faz nada até você ativar — ver seção "Como ativar" abaixo.

---

## Por que está desativado

O MFA (TOTP) do Supabase Auth exige o plano **Pro** (a partir de US$ 25/mês) — não está disponível no plano gratuito. Como o uso hoje é pessoal, não fazia sentido pagar por isso agora. Em vez de deixar de implementar, o recurso inteiro foi construído e só fica esperando, atrás de um interruptor no código, pra não precisar reescrever nada quando fizer sentido pagar pelo upgrade.

## O que foi implementado

| Peça | Arquivo | O que faz |
|---|---|---|
| Interruptor | `lib/features.ts` | Uma única constante, `MFA_ENABLED`. Controla se o recurso inteiro está ligado ou desligado. |
| Chamadas ao Supabase | `lib/mfaStore.ts` | Fina camada sobre `supabase.auth.mfa.*` — cadastrar fator, confirmar cadastro, verificar código no login, remover fator, checar se a sessão atual já passou pelo segundo fator. |
| Tela de cadastro/gestão | `components/MfaSettingsModal.tsx` | Cadastra um autenticador novo (nome → QR code + segredo → confirmar com código), lista os já cadastrados, remove. |
| Etapa no login | `app/login/page.tsx` | Uma nova etapa ("mfa"), entre e-mail/senha e a senha mestra, que só aparece se o usuário tiver algum fator cadastrado. |
| Botão no cofre | `app/vault/page.tsx` | "Duplo fator" no cabeçalho — **visível, mas cinza/desativado** enquanto `MFA_ENABLED` for `false`, com uma dica explicando o motivo ao passar o mouse. |

### Como funciona (quando ativado)

1. Você entra em "Duplo fator" no cabeçalho do cofre → "Ativar" → dá um nome pro autenticador (ex: "Celular") → aparece um QR code → escaneia com o Google Authenticator (ou qualquer outro app TOTP — Authy, Microsoft Authenticator, o gerador de TOTP do Bitwarden/1Password, todos funcionam igual, é um padrão aberto) → digita o código de 6 dígitos gerado pra confirmar.
2. Da próxima vez que entrar (e-mail + senha), aparece uma etapa nova pedindo o código de 6 dígitos antes de ir pra senha mestra.
3. O segredo do TOTP nunca é visto nem guardado por este app — fica só dentro do Supabase, gerenciado internamente por eles. O app só manda o código de 6 dígitos pra eles validarem.

### Por que não tem "código de backup"

Cheguei a considerar implementar códigos de backup por conta própria (uma tabela nossa, com hash dos códigos), mas esbarra num problema técnico real: o Supabase não dá um jeito seguro de "avisar" que uma sessão deve ser tratada como se tivesse passado pelo segundo fator, a partir de uma validação nossa por fora — isso só acontece de verdade quando você valida um fator cadastrado neles mesmo. Forçar isso do nosso lado exigiria um servidor próprio só pra essa validação, complexidade grande pra um risco que dá pra resolver mais simples:

- **Cadastre mais de um autenticador** (o botão "Adicionar outro" já existe pra isso) — celular + notebook, por exemplo. Perdeu um, usa o outro.
- **Se perder todos:** peça pra remover o MFA da sua conta manualmente — o mesmo fluxo já existente pra pedir exclusão de conta (e-mail pro suporte, ver `lib/constants.ts` → `SUPPORT_EMAIL`), só que pedindo pra remover o segundo fator em vez de apagar tudo. Quem administra o Supabase (você, hoje) resolve em Authentication → Users → o usuário → Multi-Factor, sem precisar de nenhum código novo.

---

## Como ativar (quando fizer sentido)

1. **Faça o upgrade do projeto no Supabase** pro plano Pro.
2. No painel do Supabase, confirme em **Authentication → Multi-Factor** que o fator TOTP está habilitado (normalmente já vem habilitado assim que o plano permite).
3. Abra `lib/features.ts` e troque:
   ```ts
   export const MFA_ENABLED = false;
   ```
   para:
   ```ts
   export const MFA_ENABLED = true;
   ```
4. Publique (`git commit` + `git push` — o deploy na Vercel cuida do resto).
5. **Teste você mesmo antes de confiar nisso no dia a dia:** entre no app, cadastre um autenticador, saia, entre de novo e confirme que a etapa do código de 6 dígitos aparece e funciona. Esse fluxo nunca foi testado contra um projeto Supabase de verdade (o plano atual não permite), só validado lendo a documentação oficial da API — vale conferir com calma antes de depender dele.
6. Cadastre pelo menos **dois** autenticadores, em dispositivos diferentes, pelo motivo explicado acima.

Nenhum outro arquivo precisa mudar além do passo 3 — o resto já está pronto e só esperando o flag.

## Reverter (se precisar desativar de novo)

Troque `MFA_ENABLED` de volta pra `false`. A etapa de verificação some do login imediatamente; quem já tinha cadastrado um autenticador não é mais obrigado a usá-lo (mas o cadastro continua existindo no Supabase até ser removido manualmente, se um dia reativar volta a valer).
