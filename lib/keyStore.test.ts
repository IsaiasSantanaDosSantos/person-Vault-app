import { beforeEach, describe, expect, it } from "vitest";
import { clearKey, getKey, setKey } from "./keyStore";

// O módulo mantém um singleton em memória — precisa limpar entre os testes
// deste arquivo pra um não vazar estado pro outro.
beforeEach(() => {
  clearKey();
});

describe("keyStore", () => {
  it("começa vazio", () => {
    expect(getKey()).toBeNull();
  });

  it("guarda e devolve a chave setada", () => {
    const fakeKey = { fake: true } as unknown as CryptoKey;
    setKey(fakeKey);
    expect(getKey()).toBe(fakeKey);
  });

  it("limpa a chave com clearKey", () => {
    setKey({ fake: true } as unknown as CryptoKey);
    clearKey();
    expect(getKey()).toBeNull();
  });
});
