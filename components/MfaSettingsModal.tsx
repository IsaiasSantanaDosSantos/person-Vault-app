"use client";

import { useEffect, useState } from "react";
import {
  listFactors,
  enrollFactor,
  confirmEnrollment,
  cancelEnrollment,
  unenrollFactor,
  MfaFactor,
} from "@/lib/mfaStore";

type View = "loading" | "list" | "enroll-name" | "enroll-scan";

export default function MfaSettingsModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>("loading");
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [friendlyName, setFriendlyName] = useState("");
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");

  async function refresh() {
    setError(null);
    try {
      const list = await listFactors();
      setFactors(list.filter((f) => f.status === "verified"));
      setView("list");
    } catch (err: any) {
      setError(err.message || "Não foi possível carregar seus autenticadores.");
      setView("list");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEnroll() {
    setFriendlyName("");
    setError(null);
    setView("enroll-name");
  }

  async function handleStartScan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const data = await enrollFactor(friendlyName || "Autenticador");
      setEnrollingId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setCode("");
      setView("enroll-scan");
    } catch (err: any) {
      setError(err.message || "Não foi possível iniciar o cadastro.");
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollingId) return;
    setError(null);
    setBusy(true);
    try {
      await confirmEnrollment(enrollingId, code);
      setEnrollingId(null);
      setQrCode(null);
      setSecret(null);
      setCode("");
      await refresh();
    } catch (err: any) {
      setError(err.message || "Código inválido. Tente de novo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelEnroll() {
    if (enrollingId) {
      try {
        await cancelEnrollment(enrollingId);
      } catch {
        // se falhar, sem problema — o fator não confirmado fica órfão, inofensivo
      }
    }
    setEnrollingId(null);
    setQrCode(null);
    setSecret(null);
    setCode("");
    setError(null);
    setView("list");
  }

  async function handleRemove(factorId: string) {
    if (!confirm("Remover este autenticador? Você não vai mais poder usá-lo pra entrar.")) return;
    setBusy(true);
    try {
      await unenrollFactor(factorId);
      await refresh();
    } catch (err: any) {
      setError(err.message || "Não foi possível remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-vault-bg/80 flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
      <div className="bg-vault-panel border border-vault-border rounded-t-xl sm:rounded-xl w-full max-w-sm p-5">
        <h2 className="font-semibold text-sm mb-4">Autenticação em dois fatores</h2>

        {view === "loading" && <p className="text-xs text-vault-muted">Carregando...</p>}

        {view === "list" && (
          <>
            <p className="text-xs text-vault-muted leading-relaxed mb-4">
              Cadastre pelo menos dois autenticadores (ex: celular + outro dispositivo) — se
              perder o acesso a um, o outro continua funcionando. Perdendo todos, é preciso pedir
              pra remover o MFA manualmente por e-mail.
            </p>

            {factors.length === 0 && (
              <p className="text-xs text-vault-muted mb-3">Nenhum autenticador cadastrado ainda.</p>
            )}

            <div className="space-y-2 mb-4">
              {factors.map((f) => (
                <div
                  key={f.id}
                  className="bg-vault-bg border border-vault-border rounded-md px-3 py-2 flex items-center justify-between gap-2"
                >
                  <span className="text-sm truncate">{f.friendly_name || "Autenticador"}</span>
                  <button
                    onClick={() => handleRemove(f.id)}
                    disabled={busy}
                    className="shrink-0 text-xs text-vault-danger hover:opacity-80 transition disabled:opacity-50"
                  >
                    Remover
                  </button>
                </div>
              ))}
            </div>

            {error && <p className="text-vault-danger text-xs mb-3">{error}</p>}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-vault-border rounded-md py-2 text-sm transition hover:border-vault-muted"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={startEnroll}
                className="flex-1 bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition"
              >
                {factors.length === 0 ? "Ativar" : "Adicionar outro"}
              </button>
            </div>
          </>
        )}

        {view === "enroll-name" && (
          <form onSubmit={handleStartScan} className="space-y-3">
            <p className="text-xs text-vault-muted leading-relaxed mb-1">
              Dê um nome pra esse autenticador, pra reconhecer depois (ex: "Celular", "Notebook").
            </p>
            <input
              autoFocus
              required
              placeholder="nome do autenticador"
              value={friendlyName}
              onChange={(e) => setFriendlyName(e.target.value)}
              className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
            />
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setView("list")}
                className="flex-1 border border-vault-border rounded-md py-2 text-sm transition hover:border-vault-muted"
              >
                Cancelar
              </button>
              <button
                disabled={busy}
                className="flex-1 bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition disabled:opacity-50"
              >
                {busy ? "Gerando..." : "Continuar"}
              </button>
            </div>
          </form>
        )}

        {view === "enroll-scan" && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <p className="text-xs text-vault-muted leading-relaxed">
              Escaneie o QR code com o Google Authenticator (ou outro app de sua preferência) e
              digite o código de 6 dígitos gerado.
            </p>
            {qrCode && (
              <div className="bg-vault-bg border border-vault-border rounded-md p-3 flex justify-center">
                <img src={qrCode} alt="QR code do autenticador" width={160} height={160} />
              </div>
            )}
            {secret && (
              <p className="text-[11px] text-vault-muted leading-relaxed text-center">
                Não conseguiu escanear? Digite manualmente:{" "}
                <span className="font-mono text-vault-text break-all">{secret}</span>
              </p>
            )}
            <input
              autoFocus
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="código de 6 dígitos"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-vault-bg border border-vault-border rounded-md px-3 py-2 text-sm font-mono text-center tracking-widest outline-none focus:border-vault-steel"
            />
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelEnroll}
                className="flex-1 border border-vault-border rounded-md py-2 text-sm transition hover:border-vault-muted"
              >
                Cancelar
              </button>
              <button
                disabled={busy || code.length !== 6}
                className="flex-1 bg-vault-steel hover:bg-vault-steelBright text-vault-bg rounded-md py-2 text-sm font-medium transition disabled:opacity-50"
              >
                {busy ? "Confirmando..." : "Confirmar"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
