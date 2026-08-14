"use client";

import { useState } from "react";
import { VaultItem, deleteItem } from "@/lib/vaultStore";
import { decryptText } from "@/lib/crypto";
import { getKey } from "@/lib/keyStore";

export default function PasswordCard({
  item,
  onDeleted,
  onEdit,
  onShare,
}: {
  item: VaultItem;
  onDeleted: (id: string) => void;
  onEdit: (item: VaultItem, currentPassword: string) => void;
  onShare: (item: VaultItem, currentPassword: string) => void;
}) {
  const [revealed, setRevealed] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleReveal() {
    if (revealed) {
      setRevealed(null);
      return;
    }
    const key = getKey();
    if (!key) return;
    setBusy(true);
    try {
      const plain = await decryptText(key, {
        iv: item.password_iv,
        ciphertext: item.password_ciphertext,
      });
      setRevealed(plain);
      setTimeout(() => setRevealed(null), 20000); // some sozinho após 20s
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    const key = getKey();
    if (!key) return;
    const plain =
      revealed ??
      (await decryptText(key, { iv: item.password_iv, ciphertext: item.password_ciphertext }));
    await navigator.clipboard.writeText(plain);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setTimeout(() => {
      // limpa a área de transferência depois de um tempo, por segurança
      navigator.clipboard.writeText("").catch(() => {});
    }, 30000);
  }

  async function handleDelete() {
    if (!confirm(`Excluir "${item.label}"?`)) return;
    await deleteItem(item.id);
    onDeleted(item.id);
  }

  async function handleEdit() {
    const key = getKey();
    if (!key) return;
    setBusy(true);
    try {
      const plain =
        revealed ??
        (await decryptText(key, { iv: item.password_iv, ciphertext: item.password_ciphertext }));
      onEdit(item, plain);
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    const key = getKey();
    if (!key) return;
    setBusy(true);
    try {
      const plain =
        revealed ??
        (await decryptText(key, { iv: item.password_iv, ciphertext: item.password_ciphertext }));
      onShare(item, plain);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{item.label}</p>
          {item.username && (
            <p className="text-xs text-vault-muted truncate mt-0.5">{item.username}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleShare}
            disabled={busy}
            className="text-vault-muted hover:text-vault-steel transition disabled:opacity-50"
            title="Compartilhar"
          >
            <ShareIcon />
          </button>
          <button
            onClick={handleEdit}
            disabled={busy}
            className="text-vault-muted hover:text-vault-text transition disabled:opacity-50"
            title="Editar"
          >
            <EditIcon />
          </button>
          <button
            onClick={handleDelete}
            className="text-vault-muted hover:text-vault-danger transition"
            title="Excluir"
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1 bg-vault-bg border border-vault-border rounded-md px-3 py-2 font-mono text-sm truncate">
          {revealed ?? "••••••••••••"}
        </div>
        <button
          onClick={handleReveal}
          disabled={busy}
          className="shrink-0 border border-vault-border hover:border-vault-steel rounded-md px-3 py-2 text-xs transition disabled:opacity-50"
        >
          {revealed ? "Ocultar" : "Ver"}
        </button>
        <button
          onClick={handleCopy}
          className="shrink-0 bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md px-3 py-2 text-xs font-medium transition"
        >
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6l6.8-3.9M8.6 13.4l6.8 3.9" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}
