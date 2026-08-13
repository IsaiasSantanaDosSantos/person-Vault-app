/**
 * A chave AES derivada da senha mestra vive só aqui, em memória (RAM),
 * pelo tempo da aba aberta. Ao recarregar a página ou fechar a aba,
 * some — e a senha mestra precisa ser digitada de novo. Isso é
 * proposital: é o que garante que a chave nunca toque disco.
 */
let currentKey: CryptoKey | null = null;

export function setKey(key: CryptoKey) {
  currentKey = key;
}

export function getKey(): CryptoKey | null {
  return currentKey;
}

export function clearKey() {
  currentKey = null;
}
