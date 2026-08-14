import { supabase } from "./supabaseClient";

/**
 * Fina camada sobre `supabase.auth.mfa.*` — o Supabase guarda o segredo
 * do TOTP internamente (nunca exposto de volta pro navegador depois do
 * cadastro) e valida o código do lado dele. Este app nunca vê nem
 * armazena esse segredo.
 */

export interface MfaFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export async function listFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data.totp;
}

export async function enrollFactor(friendlyName: string) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });
  if (error) throw error;
  return data; // { id, totp: { qr_code, secret, uri } }
}

/** Confirma o cadastro digitando o primeiro código gerado pelo app autenticador. */
export async function confirmEnrollment(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function cancelEnrollment(factorId: string): Promise<void> {
  // Um fator ainda não confirmado (unverified) pode ser removido do
  // mesmo jeito que um confirmado — usado quando o usuário cancela o
  // cadastro no meio do caminho.
  await unenrollFactor(factorId);
}

/**
 * Verifica o código no MOMENTO DO LOGIN (não do cadastro) — usado
 * quando o usuário já tem um fator ativo e precisa provar posse dele
 * de novo pra elevar a sessão de AAL1 pra AAL2.
 */
export async function verifyLoginChallenge(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError) throw challengeError;

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) throw verifyError;
}

export interface AssuranceLevel {
  currentLevel: string | null;
  nextLevel: string | null;
}

/** Diz se a sessão atual já satisfaz o segundo fator, ou se ainda precisa dele. */
export async function getAssuranceLevel(): Promise<AssuranceLevel> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}

/** true quando o usuário tem fator(es) cadastrado(s) e a sessão atual ainda não os validou. */
export function needsMfaChallenge(level: AssuranceLevel): boolean {
  return level.nextLevel === "aal2" && level.currentLevel === "aal1";
}
