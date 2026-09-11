"use client";
import Link from "next/link";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { buttonClass, inputClass } from "@/components/study-ui";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState(""); const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  return <main className="mx-auto min-h-screen max-w-xl px-5 py-8"><Brand /><section className="mt-16"><h1 className="text-3xl font-semibold">Recuperar senha</h1><p className="mt-3 text-sm text-muted">Enviaremos um link para criar uma nova senha.</p><form className="mt-6 space-y-4" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMessage(""); try { const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` }); if (error) throw error; setMessage("Se a conta existir, o link de recuperação foi enviado."); } catch { setMessage("Não foi possível solicitar a recuperação agora."); } finally { setBusy(false); } }}><label className="block text-sm text-secondary">E-mail<input type="email" required autoComplete="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></label><button disabled={busy} className={buttonClass}>{busy ? "Enviando…" : "Enviar link"}</button></form><p role="status" className="mt-4 text-sm text-accent">{message}</p><Link href="/login" className="mt-6 inline-block text-sm text-accent">← Voltar ao login</Link></section></main>;
}
