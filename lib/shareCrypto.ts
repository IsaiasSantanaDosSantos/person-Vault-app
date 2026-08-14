/**
 * Criptografia do recurso de compartilhar uma senha por link.
 *
 * Usa uma chave AES-256 nova e aleatória a cada compartilhamento — sem
 * nenhuma relação com a senha mestra ou com a chave do cofre
 * (lib/crypto.ts). Essa chave é exportável de propósito (ao contrário
 * da chave do cofre): ela precisa viajar dentro da URL do link, no
 * fragmento (depois do #), que o navegador NUNCA envia a nenhum
 * servidor. O Supabase só recebe e guarda o ciphertext — sem a chave,
 * ele é só ruído.
 *
 * Comprometer um link comprometido só expõe a senha daquele
 * compartilhamento específico, só até ele expirar ou ser revogado —
 * nunca a senha mestra, a chave do cofre, nem qualquer outro item.
 */

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(base64url: string): Uint8Array<ArrayBuffer> {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function generateShareKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

/** Exporta a chave crua em base64url — pronta pra ir no fragmento da URL. */
export async function exportShareKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey("raw", key);
  return toBase64Url(raw);
}

/** Reconstrói a chave a partir do valor lido do fragmento da URL. */
export async function importShareKey(base64url: string): Promise<CryptoKey> {
  const raw = fromBase64Url(base64url);
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
