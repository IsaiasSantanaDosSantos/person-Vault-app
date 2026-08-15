import { describe, expect, it } from "vitest";
import { decryptText, encryptText } from "./crypto";
import { exportShareKey, generateShareKey, importShareKey } from "./shareCrypto";

describe("generateShareKey / exportShareKey", () => {
  it("exporta em base64url válido (sem +, / ou =)", async () => {
    const key = await generateShareKey();
    const exported = await exportShareKey(key);
    expect(exported).not.toMatch(/[+/=]/);
  });

  it("gera uma chave diferente a cada chamada", async () => {
    const a = await exportShareKey(await generateShareKey());
    const b = await exportShareKey(await generateShareKey());
    expect(a).not.toBe(b);
  });
});

describe("importShareKey", () => {
  it("faz round-trip: export -> import reconstrói a mesma chave", async () => {
    const original = await generateShareKey();
    const exported = await exportShareKey(original);
    const imported = await importShareKey(exported);

    const payload = await encryptText(original, "senha compartilhada");
    const plain = await decryptText(imported, payload);
    expect(plain).toBe("senha compartilhada");
  });

  it("é compatível com encryptText/decryptText de lib/crypto.ts nos dois sentidos", async () => {
    const key = await generateShareKey();
    const exported = await exportShareKey(key);
    const imported = await importShareKey(exported);

    const payload = await encryptText(imported, "outro segredo");
    const plain = await decryptText(key, payload);
    expect(plain).toBe("outro segredo");
  });
});
