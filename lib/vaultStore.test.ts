import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabaseClient", () => ({
  supabase: { from: vi.fn() },
}));

import { supabase } from "./supabaseClient";
import {
  addItem,
  createProfile,
  deleteAllData,
  deleteItem,
  getProfile,
  listItems,
  updateItem,
} from "./vaultStore";

/** Mesmo builder falso encadeável/thenable usado em shareStore.test.ts. */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const methods = ["select", "eq", "order", "insert", "delete", "update", "single", "maybeSingle"];
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

describe("getProfile", () => {
  it("busca em vault_profiles filtrando por user_id", async () => {
    const builder = makeBuilder({ data: { user_id: "u1" }, error: null });
    fromMock.mockReturnValue(builder);

    await getProfile("u1");

    expect(fromMock).toHaveBeenCalledWith("vault_profiles");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("propaga erro do Supabase", async () => {
    const boom = new Error("falha de rede");
    fromMock.mockReturnValue(makeBuilder({ data: null, error: boom }));
    await expect(getProfile("u1")).rejects.toBe(boom);
  });
});

describe("createProfile", () => {
  it("envia salt/verifier/iterations pro insert em vault_profiles", async () => {
    const builder = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    await createProfile("u1", "salt-b64", { iv: "iv", ciphertext: "cipher" }, 600_000);

    expect(fromMock).toHaveBeenCalledWith("vault_profiles");
    expect(builder.insert).toHaveBeenCalledWith({
      user_id: "u1",
      salt: "salt-b64",
      verifier_iv: "iv",
      verifier_ciphertext: "cipher",
      iterations: 600_000,
    });
  });
});

describe("listItems", () => {
  it("filtra vault_items por user_id e devolve [] quando data é null", async () => {
    const builder = makeBuilder({ data: null, error: null });
    fromMock.mockReturnValue(builder);

    const result = await listItems("u1");

    expect(fromMock).toHaveBeenCalledWith("vault_items");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(result).toEqual([]);
  });
});

describe("addItem", () => {
  it("aceita notes nulo sem quebrar", async () => {
    const builder = makeBuilder({ data: { id: "item-1" }, error: null });
    fromMock.mockReturnValue(builder);

    await addItem({
      user_id: "u1",
      label: "Site",
      username: null,
      password: { iv: "iv", ciphertext: "cipher" },
      notes: null,
    });

    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ notes_iv: null, notes_ciphertext: null })
    );
  });
});

describe("updateItem", () => {
  it("atualiza pelo id", async () => {
    const builder = makeBuilder({ data: { id: "item-1" }, error: null });
    fromMock.mockReturnValue(builder);

    await updateItem("item-1", {
      label: "Novo nome",
      username: "user",
      password: { iv: "iv", ciphertext: "cipher" },
    });

    expect(builder.eq).toHaveBeenCalledWith("id", "item-1");
  });
});

describe("deleteItem", () => {
  it("propaga erro do Supabase", async () => {
    const boom = new Error("falha de rede");
    fromMock.mockReturnValue(makeBuilder({ data: null, error: boom }));
    await expect(deleteItem("item-1")).rejects.toBe(boom);
  });
});

describe("deleteAllData", () => {
  it("apaga shared_items, vault_items e vault_profiles do usuário, nessa ordem", async () => {
    const calls: string[] = [];
    fromMock.mockImplementation((table: string) => {
      calls.push(table);
      return makeBuilder({ data: null, error: null });
    });

    await deleteAllData("u1");

    expect(calls).toEqual(["shared_items", "vault_items", "vault_profiles"]);
  });

  it("para no primeiro erro e não continua pras tabelas seguintes", async () => {
    const boom = new Error("falha ao apagar shares");
    const calls: string[] = [];
    fromMock.mockImplementation((table: string) => {
      calls.push(table);
      if (table === "shared_items") return makeBuilder({ data: null, error: boom });
      return makeBuilder({ data: null, error: null });
    });

    await expect(deleteAllData("u1")).rejects.toBe(boom);
    expect(calls).toEqual(["shared_items"]);
  });
});
