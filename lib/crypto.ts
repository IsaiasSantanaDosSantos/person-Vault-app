/**
 * Toda a criptografia acontece aqui, no navegador.
 * A senha mestra NUNCA é enviada ao servidor — apenas a chave derivada
 * fica em memória (React state), e só o texto já criptografado
 * (ciphertext) é salvo no Supabase.
 *
 * Fluxo:
 *  1. deriveKey(senhaMestra, salt, iterations) -> CryptoKey (via PBKDF2)
 *  2. encrypt(chave, texto)                    -> { iv, ciphertext } em base64
 *  3. decrypt(chave, iv, cipher)                -> texto original
 *
 * O número de iterações é passado por parâmetro (não é mais uma
 * constante fixa) e fica salvo no perfil de cada usuário
 * (vault_profiles.iterations). Isso é essencial: a chave AES derivada
 * muda completamente se o número de iterações mudar, então um perfil
 * criado com um valor antigo TEM que continuar usando esse mesmo
 * valor para sempre — senão o verificador e todos os itens já
 * criptografados ficam ilegíveis. Perfis novos usam
 * DEFAULT_PBKDF2_ITERATIONS (600k, recomendação OWASP 2023+ para
 * PBKDF2-HMAC-SHA256); perfis antigos continuam no valor com que
 * foram criados (LEGACY_PBKDF2_ITERATIONS, 250k) até o usuário trocar
 * a senha mestra.
 */

export const DEFAULT_PBKDF2_ITERATIONS = 600_000;
export const LEGACY_PBKDF2_ITERATIONS = 250_000;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromBase64(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Gera um salt aleatório novo (usar um por usuário, salvo no perfil). */
export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return toBase64(salt.buffer);
}

/** Deriva a chave AES a partir da senha mestra + salt + custo do usuário. */
export async function deriveKey(
  masterPassword: string,
  saltBase64: string,
  iterations: number
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(saltBase64),
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false, // não exportável — nem o próprio app consegue extrair a chave crua
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedPayload {
  iv: string; // base64
  ciphertext: string; // base64
}

export async function encryptText(key: CryptoKey, plaintext: string): Promise<EncryptedPayload> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  return { iv: toBase64(iv.buffer), ciphertext: toBase64(ciphertext) };
}

export async function decryptText(key: CryptoKey, payload: EncryptedPayload): Promise<string> {
  const iv = fromBase64(payload.iv);
  const cipherBytes = fromBase64(payload.ciphertext);
  const plainBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
  return new TextDecoder().decode(plainBuffer);
}

/**
 * Cria um "verificador": criptografa uma string fixa conhecida.
 * Serve para checar se a senha mestra digitada está correta,
 * sem nunca guardar a senha mestra em si.
 */
const CHECK_STRING = "vault-check-ok";

export async function makeVerifier(key: CryptoKey): Promise<EncryptedPayload> {
  return encryptText(key, CHECK_STRING);
}

export async function verifyKey(key: CryptoKey, verifier: EncryptedPayload): Promise<boolean> {
  try {
    const result = await decryptText(key, verifier);
    return result === CHECK_STRING;
  } catch {
    return false; // decrypt falha = senha mestra errada
  }
}
