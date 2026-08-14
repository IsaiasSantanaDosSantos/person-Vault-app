/**
 * Interruptor do recurso de autenticação em dois fatores (MFA/TOTP).
 *
 * O código já está pronto e funcional (lib/mfaStore.ts,
 * components/MfaSettingsModal.tsx, e a etapa de verificação em
 * app/login/page.tsx) — só falta o plano Supabase Pro pra habilitar
 * MFA no projeto (é um recurso pago lá, não algo que o código resolva
 * sozinho).
 *
 * Quando fizer o upgrade do plano, troque esta constante pra `true`.
 * Nenhuma outra mudança de código é necessária — a tela de "Autenticação
 * em dois fatores" (hoje visível mas desativada) passa a funcionar, e
 * o login passa a exigir o segundo fator de quem tiver cadastrado.
 */
export const MFA_ENABLED = false;
