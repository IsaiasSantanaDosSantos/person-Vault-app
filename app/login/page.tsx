"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getProfile, createProfile } from "@/lib/vaultStore";
import {
  deriveKey,
  generateSalt,
  makeVerifier,
  verifyKey,
  DEFAULT_PBKDF2_ITERATIONS,
  LEGACY_PBKDF2_ITERATIONS,
} from "@/lib/crypto";
import { setKey, clearKey } from "@/lib/keyStore";
import { checkMasterPasswordStrength, MIN_MASTER_PASSWORD_LENGTH } from "@/lib/passwordStrength";

type Stage = "account" | "master";
type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [stage, setStage] = useState<Stage>("account");
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [masterPasswordConfirm, setMasterPasswordConfirm] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [needsNewProfile, setNeedsNewProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A sessão da conta (Supabase Auth) persiste ao recarregar a página —
  // só a chave derivada da senha mestra é que vive em memória e some
  // (lib/keyStore.ts, por design). Então, se já existe uma sessão válida,
  // pulamos direto pra etapa da senha mestra em vez de pedir e-mail/senha
  // de novo.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const uid = data.session.user.id;
        setUserId(uid);
        const profile = await getProfile(uid);
        setNeedsNewProfile(!profile);
        setStage("master");
      }
      setCheckingSession(false);
    })();
  }, []);

  async function handleSignOut() {
    clearKey();
    await supabase.auth.signOut();
    setStage("account");
    setMode("login");
    setUserId(null);
    setNeedsNewProfile(false);
    setEmail("");
    setAccountPassword("");
    setMasterPassword("");
    setMasterPasswordConfirm("");
    setError(null);
  }

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: accountPassword,
        });
        if (error) throw error;
        if (!data.session) {
          setError("Verifique seu e-mail para confirmar a conta e depois faça login.");
          setLoading(false);
          return;
        }
        setUserId(data.user!.id);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: accountPassword,
        });
        if (error) throw error;
        setUserId(data.user.id);
      }

      const uid = (await supabase.auth.getUser()).data.user!.id;
      const profile = await getProfile(uid);
      setNeedsNewProfile(!profile);
      setStage("master");
    } catch (err: any) {
      setError(traduzErro(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleMasterSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsNewProfile && masterPassword !== masterPasswordConfirm) {
      setError("As senhas mestras não coincidem.");
      return;
    }
    if (needsNewProfile) {
      const strength = checkMasterPasswordStrength(masterPassword);
      if (!strength.ok) {
        setError(strength.message);
        return;
      }
    }

    setLoading(true);
    try {
      const uid = userId ?? (await supabase.auth.getUser()).data.user!.id;

      if (needsNewProfile) {
        const salt = generateSalt();
        const key = await deriveKey(masterPassword, salt, DEFAULT_PBKDF2_ITERATIONS);
        const verifier = await makeVerifier(key);
        await createProfile(uid, salt, verifier, DEFAULT_PBKDF2_ITERATIONS);
        setKey(key);
      } else {
        const profile = await getProfile(uid);
        if (!profile) throw new Error("Perfil não encontrado.");
        const iterations = profile.iterations ?? LEGACY_PBKDF2_ITERATIONS;
        const key = await deriveKey(masterPassword, profile.salt, iterations);
        const ok = await verifyKey(key, {
          iv: profile.verifier_iv,
          ciphertext: profile.verifier_ciphertext,
        });
        if (!ok) {
          setError("Senha mestra incorreta.");
          setLoading(false);
          return;
        }
        setKey(key);
      }

      router.push("/vault");
    } catch (err: any) {
      setError(traduzErro(err.message));
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-vault-steel border-t-transparent animate-spin" />
      </div>
    );
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
          <h1 className="text-lg font-semibold tracking-tight">Cofre</h1>
          <p className="text-sm text-vault-muted mt-1">
            {stage === "account"
              ? "Acesse sua conta"
              : needsNewProfile
              ? "Defina sua senha mestra"
              : "Digite sua senha mestra"}
          </p>
        </div>

        {stage === "account" && (
          <form onSubmit={handleAccountSubmit} className="space-y-3">
            <div className="flex rounded-md border border-vault-border overflow-hidden text-sm mb-2">
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 py-2 transition ${
                  mode === "login" ? "bg-vault-panel text-vault-text" : "text-vault-muted"
                }`}
              >
                Entrar
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`flex-1 py-2 transition ${
                  mode === "signup" ? "bg-vault-panel text-vault-text" : "text-vault-muted"
                }`}
              >
                Criar conta
              </button>
            </div>
            <input
              type="email"
              required
              placeholder="e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
            />
            <input
              type="password"
              required
              minLength={10}
              placeholder="senha da conta"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
              className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
            />
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <button
              disabled={loading}
              className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        )}

        {stage === "master" && (
          <form onSubmit={handleMasterSubmit} className="space-y-3">
            {needsNewProfile && (
              <p className="text-xs text-vault-muted leading-relaxed mb-2">
                Essa senha criptografa tudo que você guardar aqui. Ela nunca é enviada
                ao servidor — se você esquecê-la, ninguém, nem você, consegue recuperar
                as senhas salvas. Use pelo menos {MIN_MASTER_PASSWORD_LENGTH} caracteres,
                misturando letras, números e símbolos.
              </p>
            )}
            <input
              type="password"
              required
              autoFocus
              minLength={needsNewProfile ? MIN_MASTER_PASSWORD_LENGTH : undefined}
              placeholder="senha mestra"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-vault-steel"
            />
            {needsNewProfile && masterPassword.length > 0 && (
              <StrengthMeter password={masterPassword} />
            )}
            {needsNewProfile && (
              <input
                type="password"
                required
                placeholder="confirme a senha mestra"
                value={masterPasswordConfirm}
                onChange={(e) => setMasterPasswordConfirm(e.target.value)}
                className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm font-mono outline-none focus:border-vault-steel"
              />
            )}
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <button
              disabled={loading}
              className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg disabled:opacity-50"
            >
              {loading ? "Abrindo..." : "Destravar cofre"}
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-center text-xs text-vault-muted hover:text-vault-text transition py-1"
            >
              Não é você? Sair da conta
            </button>
          </form>
        )}

        <p className="text-center mt-6">
          <Link href="/docs" className="text-xs text-vault-muted hover:text-vault-text transition">
            Documentação técnica
          </Link>
        </p>
      </div>
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const { score, message } = checkMasterPasswordStrength(password);
  const colors = ["bg-vault-danger", "bg-vault-danger", "bg-yellow-600", "bg-vault-steel", "bg-emerald-500"];
  return (
    <div className="flex items-center gap-2 -mt-1">
      <div className="flex-1 h-1 rounded-full bg-vault-border overflow-hidden flex gap-0.5">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`flex-1 h-full transition-colors ${i <= score ? colors[score] : "bg-transparent"}`}
          />
        ))}
      </div>
      <span className="text-[11px] text-vault-muted shrink-0">{message}</span>
    </div>
  );
}

function traduzErro(msg: string): string {
  if (msg?.includes("Invalid login credentials")) return "E-mail ou senha incorretos.";
  if (msg?.includes("already registered")) return "Este e-mail já tem conta.";
  return msg || "Algo deu errado.";
}
