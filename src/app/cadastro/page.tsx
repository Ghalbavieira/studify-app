"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import { GoalForm } from "@/components/goal-form";
import { buttonClass, inputClass } from "@/components/study-ui";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { useStudyData } from "@/lib/study-store";

export default function CadastroPage() {
  const router = useRouter();
  const { mode, ready, error } = useStudyData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const canSetGoal = ready && (mode === "local" || mode === "cloud");
  return <main className="mx-auto min-h-screen max-w-4xl px-5 py-8"><Brand /><section className="mx-auto mt-12 max-w-xl"><p className="text-sm text-accent">Comece pelo objetivo</p><h1 className="mt-2 text-3xl font-semibold">Um plano para o seu estudo.</h1><p className="mb-6 mt-3 text-sm text-muted">{canSetGoal ? "Defina sua prova e depois adicione matérias e tópicos." : "Crie sua conta para salvar e acompanhar sua execução."}</p>{canSetGoal ? <GoalForm onSaved={() => router.push("/materias")} /> : isSupabaseConfigured() ? <form className="space-y-4" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({ email, password, options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/cadastro` } });
      if (error) { setMessage("Não foi possível criar a conta. Confira os dados e tente novamente."); return; }
      if (!data.session) setMessage("Confira seu e-mail para confirmar a conta. Depois, entre para definir seu objetivo.");
    } catch { setMessage("Não foi possível conectar. Confira a configuração do Supabase."); }
    finally { setBusy(false); }
  }}><label className="block text-sm text-secondary">Nome<input required maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="block text-sm text-secondary">E-mail<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} /></label><label className="block text-sm text-secondary">Senha<input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className={inputClass} /><span className="text-xs text-muted">Pelo menos 8 caracteres.</span></label><button disabled={busy} className={buttonClass}>{busy ? "Criando…" : "Criar conta"}</button><p role="status" className="text-sm text-accent">{message}</p></form> : <p role="status" className="text-muted">Carregando…</p>}{error && <p role="alert" className="mt-4 text-sm text-attention">{error}</p>}<p className="mt-6 text-sm text-muted">Já tem conta? <Link href="/login" className="text-accent">Entrar</Link></p></section></main>;
}
