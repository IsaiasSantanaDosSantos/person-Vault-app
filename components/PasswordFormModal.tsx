"use client";

import { useState } from "react";
import { addItem, updateItem, VaultItem } from "@/lib/vaultStore";
import { encryptText } from "@/lib/crypto";
import { getKey } from "@/lib/keyStore";

export interface EditingItem {
  item: VaultItem;
  password: string; // já descriptografada pelo chamador (PasswordCard)
}

export default function PasswordFormModal({
  userId,
  editing,
  onClose,
  onSaved,
}: {
  userId: string;
  editing: EditingItem | null;
  onClose: () => void;
  onSaved: (item: VaultItem) => void;
}) {
  const [label, setLabel] = useState(editing?.item.label ?? "");
  const [username, setUsername] = useState(editing?.item.username ?? "");
  const [password, setPassword] = useState(editing?.password ?? "");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(!!editing);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const key = getKey();
    if (!key) return;
    setLoading(true);
    try {
      const encryptedPassword = await encryptText(key, password);
      const saved = editing
        ? await updateItem(editing.item.id, {
            label,
            username: username || null,
            password: encryptedPassword,
          })
        : await addItem({
            user_id: userId,
            label,
            username: username || null,
            password: encryptedPassword,
            notes: null,
          });
      onSaved(saved);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  function generateRandomPassword() {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    // Rejection sampling: descarta bytes que cairiam fora do maior múltiplo
    // de chars.length que cabe em 0-255, pra não introduzir viés de módulo.
    const max = 256 - (256 % chars.length);
    const result: string[] = [];
    const byte = new Uint8Array(1);
    while (result.length < 20) {
      crypto.getRandomValues(byte);
      if (byte[0] < max) result.push(chars[byte[0] % chars.length]);
    }
    setPassword(result.join(""));
    setShowPassword(true);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
      <div className="bg-vault-panel border border-vault-border rounded-t-xl sm:rounded-xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-sm mb-4">{editing ? "Editar senha" : "Nova senha"}</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            autoFocus
            placeholder="serviço (ex: Gmail)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
          />
          <input
            placeholder="usuário / e-mail (opcional)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
          />
          <div className="flex gap-2">
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex-1 min-w-0 bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-vault-steel"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="shrink-0 border border-vault-border hover:border-vault-steel rounded-md px-3 text-xs transition"
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? "Ocultar" : "Mostrar"}
            </button>
            <button
              type="button"
              onClick={generateRandomPassword}
              className="shrink-0 border border-vault-border hover:border-vault-steel rounded-md px-3 text-xs transition"
              title="Gerar senha aleatória"
            >
              Gerar
            </button>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-vault-border rounded-md py-2 text-sm transition hover:border-vault-muted"
            >
              Cancelar
            </button>
            <button
              disabled={loading}
              className="flex-1 bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Salvando..." : editing ? "Salvar alterações" : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
