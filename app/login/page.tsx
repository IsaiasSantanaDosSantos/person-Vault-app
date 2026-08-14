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
import { SUPPORT_EMAIL } from "@/lib/constants";
import { MFA_ENABLED } from "@/lib/features";
import { getAssuranceLevel, needsMfaChallenge, listFactors, verifyLoginChallenge } from "@/lib/mfaStore";
import PasswordInput from "@/components/PasswordInput";

type Stage = "account" | "master" | "forgot" | "mfa";
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
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

  // Depois de confirmar e-mail/senha (e o segundo fator, se ativado),
  // decide se precisa criar um perfil de criptografia novo ou pedir a
  // senha mestra de um já existente.
  async function proceedPastAuth(uid: string) {
    const profile = await getProfile(uid);
    setNeedsNewProfile(!profile);
    setStage("master");
  }

  // A sessão da conta (Supabase Auth) persiste ao recarregar a página —
  // só a chave derivada da senha mestra é que vive em memória e some
  // (lib/keyStore.ts, por design). Então, se já existe uma sessão válida,
  // pulamos direto pra etapa da senha mestra (ou pro MFA, se pendente)
  // em vez de pedir e-mail/senha de novo.
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const uid = data.session.user.id;
        setUserId(uid);
        if (MFA_ENABLED) {
          const level = await getAssuranceLevel();
          if (needsMfaChallenge(level)) {
            const factors = await listFactors();
            setMfaFactorId(factors[0]?.id ?? null);
            setStage("mfa");
            setCheckingSession(false);
            return;
          }
        }
        await proceedPastAuth(uid);
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
    setMfaFactorId(null);
    setMfaCode("");
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

      if (MFA_ENABLED) {
        const level = await getAssuranceLevel();
        if (needsMfaChallenge(level)) {
          const factors = await listFactors();
          setMfaFactorId(factors[0]?.id ?? null);
          setStage("mfa");
          setLoading(false);
          return;
        }
      }

      await proceedPastAuth(uid);
    } catch (err: any) {
      setError(traduzErro(err.message));
    } finally {
      setLoading(false);
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mfaFactorId) {
      setError("Não encontramos seu autenticador. Tente entrar de novo.");
      return;
    }
    setLoading(true);
    try {
      await verifyLoginChallenge(mfaFactorId, mfaCode);
      const uid = (await supabase.auth.getUser()).data.user!.id;
      await proceedPastAuth(uid);
    } catch (err: any) {
      setError("Código inválido. Tente de novo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setForgotSent(true);
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
              : stage === "forgot"
              ? "Recuperar acesso à conta"
              : stage === "mfa"
              ? "Verificação em duas etapas"
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
            <PasswordInput
              required
              minLength={10}
              placeholder="senha da conta"
              value={accountPassword}
              onChange={setAccountPassword}
            />
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <button
              disabled={loading}
              className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg disabled:opacity-50"
            >
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotSent(false);
                  setError(null);
                  setStage("forgot");
                }}
                className="w-full text-center text-xs text-vault-muted hover:text-vault-text transition py-1"
              >
                Esqueci minha senha
              </button>
            )}
          </form>
        )}

        {stage === "forgot" && (
          <form onSubmit={handleForgotPassword} className="space-y-3">
            <p className="text-xs text-vault-muted leading-relaxed mb-2">
              Isso envia um link pro seu e-mail pra redefinir a senha da{" "}
              <strong className="text-vault-text">conta</strong> (o login). Sua senha{" "}
              <strong className="text-vault-text">mestra</strong> — a que criptografa os itens
              salvos — não muda e continua sendo necessária pra abrir o cofre depois. Se você
              esqueceu a senha mestra, infelizmente não há como recuperá-la nem os itens já
              salvos com ela.
            </p>
            {forgotSent ? (
              <p className="text-xs text-vault-text bg-vault-panel border border-vault-border rounded-md px-3 py-2 leading-relaxed">
                Link enviado. Verifique sua caixa de entrada (e o spam) em{" "}
                <strong>{forgotEmail}</strong>.
              </p>
            ) : (
              <input
                type="email"
                required
                autoFocus
                placeholder="e-mail da conta"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
              />
            )}
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            {!forgotSent && (
              <button
                disabled={loading}
                className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg disabled:opacity-50"
              >
                {loading ? "Enviando..." : "Enviar link de recuperação"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setStage("account");
                setError(null);
              }}
              className="w-full text-center text-xs text-vault-muted hover:text-vault-text transition py-1"
            >
              Voltar
            </button>
          </form>
        )}

        {stage === "mfa" && (
          <form onSubmit={handleMfaSubmit} className="space-y-3">
            <p className="text-xs text-vault-muted leading-relaxed mb-1">
              Digite o código de 6 dígitos do seu app autenticador.
            </p>
            <input
              autoFocus
              required
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              placeholder="código de 6 dígitos"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm font-mono text-center tracking-widest outline-none focus:border-vault-steel"
            />
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <button
              disabled={loading || mfaCode.length !== 6}
              className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Verificar"}
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
            <PasswordInput
              required
              autoFocus
              mono
              minLength={needsNewProfile ? MIN_MASTER_PASSWORD_LENGTH : undefined}
              placeholder="senha mestra"
              value={masterPassword}
              onChange={setMasterPassword}
            />
            {needsNewProfile && masterPassword.length > 0 && (
              <StrengthMeter password={masterPassword} />
            )}
            {needsNewProfile && (
              <PasswordInput
                required
                mono
                placeholder="confirme a senha mestra"
                value={masterPasswordConfirm}
                onChange={setMasterPasswordConfirm}
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

        <div className="text-center mt-6 space-y-1.5">
          <p>
            <Link href="/docs" className="text-xs text-vault-muted hover:text-vault-text transition">
              Documentação técnica
            </Link>
          </p>
          <p>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Excluir minha conta")}`}
              className="text-xs text-vault-muted hover:text-vault-text transition"
            >
              Quer apagar sua conta por completo? Escreva pra {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const { score, message } = checkMasterPasswordStrength(password);
  const colors = ["bg-vault-danger", "bg-vault-danger", "bg-vault-muted", "bg-vault-steel", "bg-vault-steelBright"];
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
  if (msg?.includes("Email not confirmed"))
    return "Confirme seu e-mail antes de entrar — veja o link que enviamos pra sua caixa de entrada.";
  if (msg?.includes("already registered")) return "Este e-mail já tem conta.";
  return msg || "Algo deu errado.";
}
