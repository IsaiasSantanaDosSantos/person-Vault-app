/**
 * Interruptor do recurso de autenticação em dois fatores (MFA/TOTP).
 *
 * Correção: diferente do que a gente pensava antes, o MFA por TOTP
 * (app autenticador — Google Authenticator e afins) NÃO exige o plano
 * Pro do Supabase — só o MFA por SMS exige. O TOTP já vem habilitado
 * no projeto (Authentication → Multi-Factor → "TOTP (App
 * Authenticator)": Enabled), então dá pra ativar de graça.
 */
export const MFA_ENABLED = true;
