"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // O link do e-mail de recuperação, ao ser aberto, faz o supabase-js
  // processar o token da URL e disparar o evento PASSWORD_RECOVERY —
  // só aí sabemos que essa sessão temporária é válida pra trocar a senha.
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Se o usuário já processou o link antes (ou recarregou a página),
    // o evento acima não dispara de novo — checa se já existe sessão.
    const timeout = setTimeout(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) setReady(true);
      else setInvalid(true);
    }, 2500);

    return () => {
      listener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    if (password.length < 10) {
      setError("Use pelo menos 10 caracteres.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err: any) {
      setError(err.message || "Algo deu errado.");
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm text-vault-muted mt-1">Definir nova senha da conta</p>
        </div>

        {invalid && (
          <p className="text-xs text-vault-danger leading-relaxed text-center">
            Link inválido ou expirado. Peça um novo link em "Esqueci minha senha" na tela de
            login.
          </p>
        )}

        {!invalid && !ready && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 rounded-full border-2 border-vault-steel border-t-transparent animate-spin" />
          </div>
        )}

        {ready && !done && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <p className="text-xs text-vault-muted leading-relaxed mb-2">
              Isso troca a senha da sua <strong className="text-vault-text">conta</strong> (o
              login). Sua senha <strong className="text-vault-text">mestra</strong> não muda.
            </p>
            <PasswordInput
              required
              autoFocus
              minLength={10}
              placeholder="nova senha da conta"
              value={password}
              onChange={setPassword}
            />
            <PasswordInput
              required
              minLength={10}
              placeholder="confirme a nova senha"
              value={confirm}
              onChange={setConfirm}
            />
            {error && <p className="text-vault-danger text-xs">{error}</p>}
            <button
              disabled={loading}
              className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg disabled:opacity-50"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </button>
          </form>
        )}

        {done && (
          <div className="text-center space-y-3">
            <p className="text-sm text-vault-text">Senha da conta atualizada.</p>
            <button
              onClick={() => router.replace("/login")}
              className="w-full bg-vault-steel hover:bg-vault-steelBright transition rounded-md py-2 text-sm font-medium text-vault-bg"
            >
              Ir para o login
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
