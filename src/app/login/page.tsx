"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buttonClass, inputClass } from "@/components/study-ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8"><Brand /><section className="my-auto grid items-center gap-12 py-12 lg:grid-cols-2"><div><p className="text-sm text-accent">Retome seu estudo</p><h1 className="mt-3 text-4xl font-semibold leading-tight">Seu próximo bloco começa aqui.</h1><p className="mt-4 text-secondary">Plano, execução e revisões no mesmo lugar.</p></div><div className="border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0"><h2 className="text-2xl font-semibold">Entrar</h2>{isSupabaseConfigured() ? <form className="mt-6 space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password }); if (error) { setMessage("Não foi possível entrar. Confira e-mail, senha e a confirmação da sua conta."); return; } router.push("/dashboard"); }
    catch { setMessage("Não foi possível conectar. Confira a configuração e tente novamente."); }
    finally { setBusy(false); }
  }}><label className="block text-sm text-secondary">E-mail<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label><label className="block text-sm text-secondary">Senha<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /></label><button disabled={busy} className={`${buttonClass} w-full`}>{busy ? "Entrando…" : "Entrar"}</button><p role="alert" className="text-sm text-attention">{message}</p></form> : <div className="mt-6"><p className="text-sm text-muted">O Supabase ainda não foi configurado. Você pode estudar no modo local, sem conta e sem sincronização.</p><Link href="/dashboard" className={`${buttonClass} mt-4 inline-block`}>Continuar neste navegador</Link></div>}<p className="mt-5 text-sm text-muted">Primeiro acesso? <Link href="/cadastro" className="text-accent">Começar</Link></p></div></section></main>;
}
