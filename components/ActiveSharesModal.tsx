"use client";

import { useEffect, useState } from "react";
import { listMyShares, revokeShare, SharedItem } from "@/lib/shareStore";

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "expirado";
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0) return `expira em ${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`;
  return `expira em ${minutes}min`;
}

export default function ActiveSharesModal({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const [shares, setShares] = useState<SharedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const list = await listMyShares(userId);
      setShares(list);
      setLoading(false);
    })();
  }, [userId]);

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await revokeShare(id);
      setShares((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-vault-bg/80 flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
      <div className="bg-vault-panel border border-vault-border rounded-t-xl sm:rounded-xl w-full max-w-sm p-5 max-h-[80vh] flex flex-col">
        <h2 className="font-semibold text-sm mb-4">Links compartilhados ativos</h2>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {loading && <p className="text-xs text-vault-muted">Carregando...</p>}
          {!loading && shares.length === 0 && (
            <p className="text-xs text-vault-muted">Nenhum link ativo no momento.</p>
          )}
          {shares.map((s) => (
            <div
              key={s.id}
              className="bg-vault-bg border border-vault-border rounded-md px-3 py-2 flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm truncate">{s.label}</p>
                <p className="text-xs text-vault-muted">{timeLeft(s.expires_at)}</p>
              </div>
              <button
                onClick={() => handleRevoke(s.id)}
                disabled={revokingId === s.id}
                className="shrink-0 text-xs text-vault-danger hover:opacity-80 transition disabled:opacity-50"
              >
                {revokingId === s.id ? "Revogando..." : "Revogar"}
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full border border-vault-border rounded-md py-2 text-sm transition hover:border-vault-muted mt-4"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
