"use client";

import { useState } from "react";
import { encryptText } from "@/lib/crypto";
import { generateShareKey, exportShareKey } from "@/lib/shareCrypto";
import { createShare, revokeShare } from "@/lib/shareStore";
import { VaultItem } from "@/lib/vaultStore";

const EXPIRY_OPTIONS = [
  { label: "10 minutos", minutes: 10 },
  { label: "30 minutos", minutes: 30 },
  { label: "1 hora", minutes: 60 },
  { label: "3 horas", minutes: 180 },
  { label: "6 horas", minutes: 360 },
  { label: "12 horas", minutes: 720 },
  { label: "24 horas (máximo)", minutes: 1440 },
];

export default function ShareModal({
  userId,
  item,
  password,
  onClose,
}: {
  userId: string;
  item: VaultItem;
  password: string;
  onClose: () => void;
}) {
  const [minutes, setMinutes] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoked, setRevoked] = useState(false);

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    try {
      const key = await generateShareKey();
      const encrypted = await encryptText(key, password);
      const keyStr = await exportShareKey(key);
      const expiresAt = new Date(Date.now() + minutes * 60_000);

      const share = await createShare({
        ownerId: userId,
        label: item.label,
        username: item.username,
        password: encrypted,
        expiresAt,
      });

      const url = `${window.location.origin}/share/${share.id}#k=${keyStr}`;
      setShareId(share.id);
      setShareUrl(url);
    } catch (err: any) {
      setError(err.message || "Algo deu errado ao gerar o link.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleNativeShare() {
    if (!shareUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Senha: ${item.label}`, url: shareUrl });
      } catch {
        // usuário cancelou a folha de compartilhamento — sem problema
      }
    } else {
      handleCopy();
    }
  }

  async function handleRevoke() {
    if (!shareId) return;
    setLoading(true);
    try {
      await revokeShare(shareId);
      setRevoked(true);
    } catch (err: any) {
      setError(err.message || "Algo deu errado ao revogar.");
    } finally {
      setLoading(false);
    }
  }

  const whatsappUrl = shareUrl
    ? `https://wa.me/?text=${encodeURIComponent(`Aqui está o acesso a "${item.label}": ${shareUrl}`)}`
    : null;

  return (
    <div className="fixed inset-0 bg-vault-bg/80 flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
      <div className="bg-vault-panel border border-vault-border rounded-t-xl sm:rounded-xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-sm mb-1">Compartilhar "{item.label}"</h2>

        {!shareUrl && (
          <>
            <p className="text-xs text-vault-muted leading-relaxed mb-4 mt-2">
              Gera um link único, com uma chave própria — não usa nem expõe sua senha mestra.
              Quem abrir o link vê o serviço e o usuário, e pode copiar a senha, mas não vê ela em
              texto na tela. Você pode revogar o link a qualquer momento.
            </p>
            <label className="text-xs text-vault-muted block mb-1.5">
              Expira em (máximo 24 horas):
            </label>
            <select
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel mb-4"
            >
              {EXPIRY_OPTIONS.map((opt) => (
                <option key={opt.minutes} value={opt.minutes}>
                  {opt.label}
                </option>
              ))}
            </select>
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
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition disabled:opacity-50"
              >
                {loading ? "Gerando..." : "Gerar link"}
              </button>
            </div>
          </>
        )}

        {shareUrl && !revoked && (
          <>
            <p className="text-xs text-vault-muted leading-relaxed mb-3 mt-2">
              Link gerado — expira em {EXPIRY_OPTIONS.find((o) => o.minutes === minutes)?.label.toLowerCase()}.
            </p>
            <div className="bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-xs font-mono text-vault-muted truncate mb-3">
              {shareUrl}
            </div>
            {error && <p className="text-vault-danger text-xs mb-3">{error}</p>}
            <div className="space-y-2 mb-3">
              <button
                type="button"
                onClick={handleNativeShare}
                className="w-full bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition"
              >
                Compartilhar
              </button>
              <div className="flex gap-2">
                <a
                  href={whatsappUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center border border-vault-border hover:border-vault-steel rounded-md py-2 text-sm transition"
                >
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-1 border border-vault-border hover:border-vault-steel rounded-md py-2 text-sm transition"
                >
                  {copied ? "Copiado!" : "Copiar link"}
                </button>
              </div>
            </div>
            <div className="flex gap-2 pt-1 border-t border-vault-border mt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-xs text-vault-muted hover:text-vault-text transition py-2"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={handleRevoke}
                disabled={loading}
                className="flex-1 text-xs text-vault-danger hover:opacity-80 transition py-2 disabled:opacity-50"
              >
                {loading ? "Revogando..." : "Revogar agora"}
              </button>
            </div>
          </>
        )}

        {revoked && (
          <div className="text-center py-2">
            <p className="text-sm text-vault-text mb-4">Link revogado — não funciona mais.</p>
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
