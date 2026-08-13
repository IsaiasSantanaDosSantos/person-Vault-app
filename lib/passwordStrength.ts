/**
 * Checagem de força para a senha mestra. Sem essa validação, o custo do
 * PBKDF2 (lib/crypto.ts) não protege muito coisa: o verificador salvo no
 * Supabase permite tentativas offline ilimitadas, então a força real do
 * cofre depende quase inteiramente da entropia dessa senha.
 */

const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "password",
  "password1",
  "password123",
  "qwertyuiop",
  "letmein123",
  "iloveyou1",
  "administrador",
  "administrator",
  "senha12345",
  "senhasegura",
  "12345678910",
  "abcd1234",
  "abcdefgh",
  "trocarsenha",
]);

export const MIN_MASTER_PASSWORD_LENGTH = 12;

export interface StrengthResult {
  ok: boolean;
  score: 0 | 1 | 2 | 3 | 4;
  message: string;
}

export function checkMasterPasswordStrength(password: string): StrengthResult {
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    return {
      ok: false,
      score: 0,
      message: `Use pelo menos ${MIN_MASTER_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return { ok: false, score: 0, message: "Essa senha é comum demais — escolha outra." };
  }

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);
  const variety = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  const uniqueChars = new Set(password).size;
  const lengthScore = password.length >= 20 ? 2 : password.length >= 16 ? 1 : 0;
  const varietyScore = variety >= 3 ? 2 : variety === 2 ? 1 : 0;
  const rawScore = lengthScore + varietyScore + (uniqueChars >= 8 ? 1 : 0);
  const score = Math.min(4, Math.max(1, rawScore)) as StrengthResult["score"];

  if (variety < 2) {
    return {
      ok: false,
      score,
      message: "Combine letras, números e símbolos para uma senha mais forte.",
    };
  }

  const messages = ["", "Fraca", "Razoável", "Boa", "Forte"];
  return { ok: true, score, message: messages[score] };
}
