"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { buttonClass, inputClass } from "@/components/study-ui";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function RedefinirSenhaPage() {
  const router = useRouter(); const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-8"><Brand /><section className="mt-16"><h1 className="text-3xl font-semibold">Criar nova senha</h1><form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); if (password.length < 8) { setMessage("Use pelo menos 8 caracteres."); return; } if (password !== confirm) { setMessage("As senhas não coincidem."); return; } setBusy(true); setMessage(""); try { const { error } = await getSupabaseClient().auth.updateUser({ password }); if (error) throw error; setMessage("Senha atualizada."); setTimeout(() => router.push("/dashboard"), 600); } catch { setMessage("O link expirou ou a sessão de recuperação não é válida. Solicite outro link."); } finally { setBusy(false); } }}><label className="block text-sm text-secondary">Nova senha<input type="password" required minLength={8} autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="block text-sm text-secondary">Confirmar senha<input type="password" required minLength={8} autoComplete="new-password" className={inputClass} value={confirm} onChange={(e) => setConfirm(e.target.value)} /></label><button disabled={busy} className={buttonClass}>{busy ? "Salvando…" : "Salvar nova senha"}</button></form><p role="status" className="mt-4 text-sm text-accent">{message}</p></section></main>;
}
