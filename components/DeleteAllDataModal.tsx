"use client";

import { useState } from "react";
import { deleteAllData } from "@/lib/vaultStore";
import { SUPPORT_EMAIL } from "@/lib/constants";

const CONFIRM_WORD = "EXCLUIR";

export default function DeleteAllDataModal({
  userId,
  onClose,
  onDeleted,
}: {
  userId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    setLoading(true);
    try {
      await deleteAllData(userId);
      onDeleted();
    } catch (err: any) {
      setError(err.message || "Algo deu errado ao excluir.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-vault-bg/80 flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
      <div className="bg-vault-panel border border-vault-border rounded-t-xl sm:rounded-xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-sm mb-2 text-vault-danger">Excluir todos os dados</h2>
        <p className="text-xs text-vault-muted leading-relaxed mb-4">
          Isso apaga permanentemente <strong className="text-vault-text">todas as senhas salvas</strong>{" "}
          e sua senha mestra atual. <strong className="text-vault-text">Não tem como desfazer.</strong> Sua
          conta de login continua existindo — se você quiser guardar senhas de novo, vai precisar
          definir uma nova senha mestra do zero.
        </p>
        <p className="text-xs text-vault-muted leading-relaxed mb-4">
          Quer apagar a conta de login também, por completo? Isso não dá pra fazer sozinho por
          aqui — escreva pra{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Excluir minha conta")}`}
            className="text-vault-steel hover:text-vault-steelBright"
          >
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
        <p className="text-xs text-vault-muted mb-2">
          Digite <strong className="text-vault-text font-mono">{CONFIRM_WORD}</strong> pra confirmar:
        </p>
        <input
          autoFocus
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-vault-steel mb-3"
        />
        {error && <p className="text-vault-danger text-xs mb-3">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 border border-vault-border rounded-md py-2 text-sm transition hover:border-vault-muted disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={confirmText !== CONFIRM_WORD || loading}
            className="flex-1 bg-vault-danger hover:opacity-90 text-vault-bg rounded-md py-2 text-sm font-medium transition disabled:opacity-40"
          >
            {loading ? "Excluindo..." : "Excluir tudo"}
          </button>
        </div>
      </div>
    </div>
  );
}
