"use client";

import { useEffect, useState } from "react";
import { getShare } from "@/lib/shareStore";
import { importShareKey } from "@/lib/shareCrypto";
import { decryptText } from "@/lib/crypto";

type State = "loading" | "invalid" | "ready";

export default function SharePage({ params }: { params: { id: string } }) {
  const [state, setState] = useState<State>("loading");
  const [label, setLabel] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const keyStr = new URLSearchParams(window.location.hash.slice(1)).get("k");
        if (!keyStr) {
          setState("invalid");
          return;
        }
        const share = await getShare(params.id);
        if (!share) {
          setState("invalid");
          return;
        }
        const key = await importShareKey(keyStr);
        const plain = await decryptText(key, {
          iv: share.password_iv,
          ciphertext: share.password_ciphertext,
        });
        setLabel(share.label);
        setUsername(share.username);
        setPassword(plain);
        setExpiresAt(share.expires_at);
        setState("ready");
      } catch {
        // chave errada/corrompida, ou o link já não existe/expirou
        setState("invalid");
      }
    })();
  }, [params.id]);

  async function handleCopy() {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/icons/icon-192.png"
            alt="Cofre"
            width={56}
            height={56}
            className="mx-auto mb-4 w-14 h-14 rounded-xl"
          />
          <h1 className="text-lg font-semibold tracking-tight">Senha compartilhada</h1>
        </div>

        {state === "loading" && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-vault-steel border-t-transparent animate-spin" />
          </div>
        )}

        {state === "invalid" && (
          <p className="text-xs text-vault-danger leading-relaxed text-center">
            Este link é inválido, já expirou ou foi revogado por quem compartilhou. Peça um link
            novo se ainda precisar do acesso.
          </p>
        )}

        {state === "ready" && (
          <div className="bg-vault-panel border border-vault-border rounded-lg p-4">
            <p className="font-medium text-sm truncate">{label}</p>
            {username && <p className="text-xs text-vault-muted truncate mt-0.5">{username}</p>}

            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 bg-vault-bg border border-vault-border rounded-md px-3 py-2 font-mono text-sm truncate">
                {revealed ? password : "••••••••••••"}
              </div>
              <button
                onClick={() => setRevealed((v) => !v)}
                className="shrink-0 border border-vault-border hover:border-vault-steel rounded-md px-3 py-2 text-xs transition"
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

            {expiresAt && (
              <p className="text-[11px] text-vault-muted mt-3 leading-relaxed">
                Este link deixa de funcionar em {new Date(expiresAt).toLocaleString("pt-BR")}. Não
                encaminhe pra mais ninguém.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
