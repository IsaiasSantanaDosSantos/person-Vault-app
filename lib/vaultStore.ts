import { supabase } from "./supabaseClient";
import { EncryptedPayload } from "./crypto";

export interface VaultProfile {
  user_id: string;
  salt: string;
  verifier_iv: string;
  verifier_ciphertext: string;
  iterations: number;
}

export interface VaultItem {
  id: string;
  user_id: string;
  label: string; // nome do site/serviço — fica em texto puro só para listar
  username: string | null; // login/e-mail — texto puro (não é segredo crítico)
  password_iv: string;
  password_ciphertext: string;
  notes_iv: string | null;
  notes_ciphertext: string | null;
  created_at: string;
}

export async function getProfile(userId: string): Promise<VaultProfile | null> {
  const { data, error } = await supabase
    .from("vault_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createProfile(
  userId: string,
  salt: string,
  verifier: EncryptedPayload,
  iterations: number
): Promise<void> {
  const { error } = await supabase.from("vault_profiles").insert({
    user_id: userId,
    salt,
    verifier_iv: verifier.iv,
    verifier_ciphertext: verifier.ciphertext,
    iterations,
  });
  if (error) throw error;
}

export async function listItems(userId: string): Promise<VaultItem[]> {
  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addItem(item: {
  user_id: string;
  label: string;
  username: string | null;
  password: EncryptedPayload;
  notes: EncryptedPayload | null;
}): Promise<VaultItem> {
  const { data, error } = await supabase
    .from("vault_items")
    .insert({
      user_id: item.user_id,
      label: item.label,
      username: item.username,
      password_iv: item.password.iv,
      password_ciphertext: item.password.ciphertext,
      notes_iv: item.notes?.iv ?? null,
      notes_ciphertext: item.notes?.ciphertext ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateItem(
  id: string,
  item: {
    label: string;
    username: string | null;
    password: EncryptedPayload;
  }
): Promise<VaultItem> {
  const { data, error } = await supabase
    .from("vault_items")
    .update({
      label: item.label,
      username: item.username,
      password_iv: item.password.iv,
      password_ciphertext: item.password.ciphertext,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteItem(id: string): Promise<void> {
  const { error } = await supabase.from("vault_items").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Apaga permanentemente todos os itens e o perfil de criptografia do
 * usuário (salt, verificador, iterations). Não apaga a conta de login
 * em si (auth.users) — isso exigiria a service_role key, que este app
 * não usa nem expõe no client por design.
 */
export async function deleteAllData(userId: string): Promise<void> {
  const { error: itemsError } = await supabase.from("vault_items").delete().eq("user_id", userId);
  if (itemsError) throw itemsError;
  const { error: profileError } = await supabase
    .from("vault_profiles")
    .delete()
    .eq("user_id", userId);
  if (profileError) throw profileError;
}
