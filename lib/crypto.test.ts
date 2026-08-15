import { describe, expect, it } from "vitest";
import {
  DEFAULT_PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS,
  decryptText,
  deriveKey,
  encryptText,
  generateSalt,
  makeVerifier,
  verifyKey,
} from "./crypto";

describe("generateSalt", () => {
  it("gera saltos diferentes a cada chamada", () => {
    const a = generateSalt();
    const b = generateSalt();
    expect(a).not.toBe(b);
  });

  it("gera base64 válido", () => {
    expect(() => atob(generateSalt())).not.toThrow();
  });
});

describe("encryptText / decryptText", () => {
  it("faz round-trip corretamente", async () => {
    const salt = generateSalt();
    const key = await deriveKey("senha-mestra-de-teste", salt, 1000);
    const payload = await encryptText(key, "um segredo qualquer");
    const plain = await decryptText(key, payload);
    expect(plain).toBe("um segredo qualquer");
  });

  it("usa um IV diferente a cada chamada, mesmo com o mesmo texto", async () => {
    const salt = generateSalt();
    const key = await deriveKey("senha-mestra-de-teste", salt, 1000);
    const a = await encryptText(key, "repetido");
    const b = await encryptText(key, "repetido");
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it("não decifra com uma chave derivada de senha diferente", async () => {
    const salt = generateSalt();
    const key = await deriveKey("senha-correta", salt, 1000);
    const wrongKey = await deriveKey("senha-errada", salt, 1000);
    const payload = await encryptText(key, "segredo");
    await expect(decryptText(wrongKey, payload)).rejects.toThrow();
  });
});

describe("makeVerifier / verifyKey", () => {
  it("retorna true para a chave certa", async () => {
    const salt = generateSalt();
    const key = await deriveKey("senha-mestra", salt, 1000);
    const verifier = await makeVerifier(key);
    expect(await verifyKey(key, verifier)).toBe(true);
  });

  it("retorna false para uma chave derivada de outra senha", async () => {
    const salt = generateSalt();
    const key = await deriveKey("senha-mestra", salt, 1000);
    const otherKey = await deriveKey("outra-senha", salt, 1000);
    const verifier = await makeVerifier(key);
    expect(await verifyKey(otherKey, verifier)).toBe(false);
  });

  it("retorna false para um ciphertext adulterado", async () => {
    const salt = generateSalt();
    const key = await deriveKey("senha-mestra", salt, 1000);
    const verifier = await makeVerifier(key);
    const tampered = { ...verifier, ciphertext: verifier.ciphertext.slice(0, -4) + "abcd" };
    expect(await verifyKey(key, tampered)).toBe(false);
  });
});

describe("iterations", () => {
  it("chaves derivadas com LEGACY_PBKDF2_ITERATIONS e DEFAULT_PBKDF2_ITERATIONS não são intercambiáveis", async () => {
    const salt = generateSalt();
    const legacyKey = await deriveKey("mesma-senha", salt, LEGACY_PBKDF2_ITERATIONS);
    const defaultKey = await deriveKey("mesma-senha", salt, DEFAULT_PBKDF2_ITERATIONS);
    const verifier = await makeVerifier(legacyKey);
    expect(await verifyKey(defaultKey, verifier)).toBe(false);
  });
});
