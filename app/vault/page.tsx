"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { listItems, VaultItem } from "@/lib/vaultStore";
import { getKey, clearKey } from "@/lib/keyStore";
import PasswordCard from "@/components/PasswordCard";
import PasswordFormModal, { EditingItem } from "@/components/PasswordFormModal";
import DeleteAllDataModal from "@/components/DeleteAllDataModal";
import ShareModal from "@/components/ShareModal";
import ActiveSharesModal from "@/components/ActiveSharesModal";

const INACTIVITY_LIMIT_MS = 5 * 60 * 1000; // 5 minutos sem interação tranca o cofre

export default function VaultPage() {
  const router = useRouter();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [sharing, setSharing] = useState<{ item: VaultItem; password: string } | null>(null);
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [showActiveShares, setShowActiveShares] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace("/login");
        return;
      }
      // Se a chave não está em memória (ex: página recarregada),
      // manda voltar pro login pra redigitar a senha mestra.
      if (!getKey()) {
        router.replace("/login");
        return;
      }
      const uid = data.session.user.id;
      setUserId(uid);
      const list = await listItems(uid);
      setItems(list);
      setLoading(false);
    })();
  }, [router]);

  async function handleLogout() {
    clearKey();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleAllDataDeleted() {
    clearKey();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  // Trava o cofre (só a chave em memória, não a sessão da conta) depois
  // de um tempo sem interação — evita deixar tudo destravado se o
  // dispositivo for esquecido aberto. Ver AUDITORIA_SEGURANCA.md, achado #6.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function lock() {
      clearKey();
      router.replace("/login");
    }

    function resetTimer() {
      clearTimeout(timer);
      timer = setTimeout(lock, INACTIVITY_LIMIT_MS);
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [router]);

  const filtered = items.filter(
    (i) =>
      i.label.toLowerCase().includes(search.toLowerCase()) ||
      (i.username ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-vault-steel border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 bg-vault-bg/90 backdrop-blur border-b border-vault-border px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" width={24} height={24} className="w-6 h-6 rounded-md" />
          <h1 className="font-semibold text-sm tracking-tight">Cofre</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowActiveShares(true)}
            className="text-xs text-vault-muted hover:text-vault-text transition"
          >
            Compartilhamentos
          </button>
          <button
            onClick={() => setShowDeleteAll(true)}
            className="text-xs text-vault-muted hover:text-vault-danger transition"
          >
            Excluir dados
          </button>
          <button onClick={handleLogout} className="text-xs text-vault-muted hover:text-vault-text transition">
            Sair
          </button>
        </div>
      </header>

      <div className="px-4 py-3">
        <input
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-vault-panel border border-vault-border rounded-md px-3 py-2 text-sm outline-none focus:border-vault-steel"
        />
      </div>

      <div className="px-4 space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-vault-muted text-sm py-12">
            {items.length === 0 ? "Nenhuma senha guardada ainda." : "Nada encontrado."}
          </p>
        )}
        {filtered.map((item) => (
          <PasswordCard
            key={item.id}
            item={item}
            onDeleted={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
            onEdit={(item, password) => setEditing({ item, password })}
            onShare={(item, password) => setSharing({ item, password })}
          />
        ))}
      </div>

      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-vault-steel hover:bg-vault-steelBright text-vault-bg text-2xl font-light shadow-lg flex items-center justify-center transition"
        aria-label="Adicionar senha"
      >
        +
      </button>

      {(showAdd || editing) && userId && (
        <PasswordFormModal
          userId={userId}
          editing={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
          onSaved={(item) => {
            setItems((prev) =>
              editing
                ? prev.map((i) => (i.id === item.id ? item : i))
                : [item, ...prev]
            );
          }}
        />
      )}

      {showDeleteAll && userId && (
        <DeleteAllDataModal
          userId={userId}
          onClose={() => setShowDeleteAll(false)}
          onDeleted={handleAllDataDeleted}
        />
      )}

      {sharing && userId && (
        <ShareModal
          userId={userId}
          item={sharing.item}
          password={sharing.password}
          onClose={() => setSharing(null)}
        />
      )}

      {showActiveShares && userId && (
        <ActiveSharesModal userId={userId} onClose={() => setShowActiveShares(false)} />
      )}
    </div>
  );
}
