import { describe, expect, it } from "vitest";
import { MIN_MASTER_PASSWORD_LENGTH, checkMasterPasswordStrength } from "./passwordStrength";

describe("checkMasterPasswordStrength", () => {
  it("rejeita senha menor que o mínimo", () => {
    const short = "a".repeat(MIN_MASTER_PASSWORD_LENGTH - 1);
    const result = checkMasterPasswordStrength(short);
    expect(result.ok).toBe(false);
    expect(result.score).toBe(0);
  });

  it("aceita no limite exato de tamanho, se a variedade for suficiente", () => {
    const exact = "Ab1!Ab1!Ab1!".slice(0, MIN_MASTER_PASSWORD_LENGTH);
    expect(exact.length).toBe(MIN_MASTER_PASSWORD_LENGTH);
    const result = checkMasterPasswordStrength(exact);
    expect(result.ok).toBe(true);
  });

  it("rejeita senhas da lista de comuns, incluindo variação de maiúscula/minúscula", () => {
    // "administrador" tem 13 chars, então passa do filtro de comprimento e
    // cai exatamente no filtro de lista de senhas comuns.
    expect(checkMasterPasswordStrength("administrador").ok).toBe(false);
    expect(checkMasterPasswordStrength("Administrador").ok).toBe(false);
    expect(checkMasterPasswordStrength("ADMINISTRADOR").ok).toBe(false);
  });

  it("rejeita quando a variedade de caracteres é menor que 2", () => {
    const onlyLower = "abcdefghijklmnop";
    const result = checkMasterPasswordStrength(onlyLower);
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/letras, números e símbolos/);
  });

  it("aceita e aumenta o score conforme a senha fica mais forte", () => {
    const weak = checkMasterPasswordStrength("Abcdefgh12"); // 10 chars, curta demais
    expect(weak.ok).toBe(false);

    const decent = checkMasterPasswordStrength("Abcdefgh12!@");
    const strong = checkMasterPasswordStrength("Abcdefgh12!@#$%^&*ZZ");
    expect(decent.ok).toBe(true);
    expect(strong.ok).toBe(true);
    expect(strong.score).toBeGreaterThanOrEqual(decent.score);
  });
});
