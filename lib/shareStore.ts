import { supabase } from "./supabaseClient";
import { EncryptedPayload } from "./crypto";

export interface SharedItem {
  id: string;
  owner_id: string;
  label: string;
  username: string | null;
  password_iv: string;
  password_ciphertext: string;
  created_at: string;
  expires_at: string;
}

export async function createShare(params: {
  ownerId: string;
  label: string;
  username: string | null;
  password: EncryptedPayload;
  expiresAt: Date;
}): Promise<SharedItem> {
  const { data, error } = await supabase
    .from("shared_items")
    .insert({
      owner_id: params.ownerId,
      label: params.label,
      username: params.username,
      password_iv: params.password.iv,
      password_ciphertext: params.password.ciphertext,
      expires_at: params.expiresAt.toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Usado pela página pública (/share/[id]). A policy pública de RLS já barra
 * quem não é dono depois de expirado, mas o dono tem uma policy própria de
 * select (sem checar expires_at, pra poder ver o histórico) — então, se o
 * link for aberto no mesmo navegador em que o dono está logado, o RLS sozinho
 * deixaria passar mesmo expirado. Por isso o expires_at é checado aqui também.
 */
export async function getShare(id: string): Promise<SharedItem | null> {
  const { data, error } = await supabase.from("shared_items").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  if (new Date(data.expires_at).getTime() <= Date.now()) return null;
  return data;
}

export async function listMyShares(ownerId: string): Promise<SharedItem[]> {
  const { data, error } = await supabase
    .from("shared_items")
    .select("*")
    .eq("owner_id", ownerId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function revokeShare(id: string): Promise<void> {
  const { error } = await supabase.from("shared_items").delete().eq("id", id);
  if (error) throw error;
}
