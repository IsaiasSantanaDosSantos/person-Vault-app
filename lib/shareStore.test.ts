import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "./supabaseClient";
import { createShare, getShare, listMyShares, revokeShare } from "./shareStore";

/**
 * Builder falso e encadeável que imita o PostgrestFilterBuilder do
 * supabase-js: todo método intermediário devolve `this`, e o builder é
 * "thenable" (resolve pra { data, error } quando `await`ado), do mesmo
 * jeito que o builder real do supabase-js funciona sem precisar chamar
 * nenhum ".then()" explícito no código de produção.
 */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const methods = ["select", "eq", "gt", "order", "insert", "delete", "update", "single", "maybeSingle"];
  const builder: Record<string, unknown> = {};
  for (const method of methods) {
    builder[method] = vi.fn(() => builder);
  }
  (builder as any).then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<typeof result>;
}

const fromMock = supabase.from as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => {
  fromMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getShare", () => {
  it("retorna null quando o item já expirou, mesmo que a query 'devolva' a linha", async () => {
    // Simula exatamente o cenário do dono logado: a policy de RLS dele não
    // checa expires_at, então o banco devolveria a linha mesmo expirada —
    // getShare() precisa barrar isso no próprio código, não só confiar no RLS.
    const expired = {
      id: "abc",
      owner_id: "owner-1",
      label: "Notebook Vaio - DRM",
      username: null,
      password_iv: "iv",
      password_ciphertext: "cipher",
      created_at: "2026-08-13T00:00:00.000Z",
      expires_at: "2026-08-14T22:49:40.000Z",
    };
    vi.setSystemTime(new Date("2026-08-15T00:00:00.000Z"));
    fromMock.mockReturnValue(makeBuilder({ data: expired, error: null }));

    const result = await getShare("abc");
    expect(result).toBeNull();
  });

  it("retorna o item quando ainda está dentro da validade", async () => {
    const valid = {
      id: "abc",
      owner_id: "owner-1",
      label: "Notebook Vaio - DRM",
      username: null,
      password_iv: "iv",
      password_ciphertext: "cipher",
      created_at: "2026-08-13T00:00:00.000Z",
      expires_at: "2026-08-20T00:00:00.000Z",
    };
    vi.setSystemTime(new Date("2026-08-15T00:00:00.000Z"));
    fromMock.mockReturnValue(makeBuilder({ data: valid, error: null }));

    const result = await getShare("abc");
    expect(result).toEqual(valid);
  });

  it("retorna null quando não existe nenhuma linha", async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await getShare("nao-existe");
    expect(result).toBeNull();
  });

  it("propaga o erro do Supabase em vez de engolir", async () => {
    const boom = new Error("falha de rede");
    fromMock.mockReturnValue(makeBuilder({ data: null, error: boom }));
    await expect(getShare("abc")).rejects.toBe(boom);
  });
});

describe("listMyShares", () => {
  it("filtra por owner_id e por expires_at no futuro", async () => {
    const builder = makeBuilder({ data: [], error: null });
    fromMock.mockReturnValue(builder);

    await listMyShares("owner-1");

    expect(fromMock).toHaveBeenCalledWith("shared_items");
    expect(builder.eq).toHaveBeenCalledWith("owner_id", "owner-1");
    expect(builder.gt).toHaveBeenCalledWith("expires_at", expect.any(String));
  });

  it("devolve [] quando data vem null", async () => {
    fromMock.mockReturnValue(makeBuilder({ data: null, error: null }));
    const result = await listMyShares("owner-1");
    expect(result).toEqual([]);
  });

  it("propaga erro do Supabase", async () => {
    const boom = new Error("falha de rede");
    fromMock.mockReturnValue(makeBuilder({ data: null, error: boom }));
    await expect(listMyShares("owner-1")).rejects.toBe(boom);
  });
});

describe("revokeShare", () => {
  it("deleta pelo id", async () => {
    const builder = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    await revokeShare("abc");

    expect(fromMock).toHaveBeenCalledWith("shared_items");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "abc");
  });

  it("propaga erro do Supabase", async () => {
    const boom = new Error("falha de rede");
    fromMock.mockReturnValue(makeBuilder({ data: null, error: boom }));
    await expect(revokeShare("abc")).rejects.toBe(boom);
  });
});

describe("createShare", () => {
  it("envia os campos esperados pro insert", async () => {
    const created = { id: "new-id" };
    const builder = makeBuilder({ data: created, error: null });
    fromMock.mockReturnValue(builder);

    const expiresAt = new Date("2026-08-20T00:00:00.000Z");
    const result = await createShare({
      ownerId: "owner-1",
      label: "Site X",
      username: "user@example.com",
      password: { iv: "iv", ciphertext: "cipher" },
      expiresAt,
    });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        owner_id: "owner-1",
        label: "Site X",
        username: "user@example.com",
        password_iv: "iv",
        password_ciphertext: "cipher",
        expires_at: expiresAt.toISOString(),
      })
    );
    expect(result).toBe(created);
  });

  it("propaga erro do Supabase", async () => {
    const boom = new Error("falha de rede");
    fromMock.mockReturnValue(makeBuilder({ data: null, error: boom }));
    await expect(
      createShare({
        ownerId: "owner-1",
        label: "Site X",
        username: null,
        password: { iv: "iv", ciphertext: "cipher" },
        expiresAt: new Date(),
      })
    ).rejects.toBe(boom);
  });
});
