"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useStudyData, refreshStudyData } from "@/lib/study-store";
import { useActiveStudy } from "@/lib/active-study";
import { usePlan } from "@/lib/use-plan";
import { getSupabaseClient } from "@/lib/supabase/client";
import { buttonClass, inputClass } from "./study-ui";
export function GoalSwitcher() {
  const { data, mode, userId, saving } = useStudyData();
  const active = useActiveStudy();
  const plan = usePlan();
  const [goals, setGoals] = useState<{id:string;title:string}[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { let alive=true; if(mode==="cloud" && userId) void getSupabaseClient().from("goals").select("id,title").eq("user_id",userId).order("created_at").then(result=>{if(!alive)return;if(result.error)setError("Não foi possível carregar seus objetivos.");else setGoals(result.data??[]);});return()=>{alive=false;};},[mode,userId,data.goal?.id]);
  async function activate(id:string,newTitle?:string) {
    if(busy||saving||active)return;
    setBusy(true);setError("");
    try { const result=await getSupabaseClient().rpc("activate_study_goal",{p_id:id,p_title:newTitle??null});if(result.error)throw result.error;await refreshStudyData();setTitle(""); }
    catch {setError("Não foi possível alterar o objetivo. Confira a conexão e o limite do seu plano.");}
    finally {setBusy(false);}
  }
  if(mode!=="cloud")return null;
  return <section className="mb-6 border-b border-line pb-6"><h2 className="text-xl font-semibold">Objetivos</h2><label className="mt-4 block text-sm text-secondary">Objetivo ativo<select disabled={busy||saving||Boolean(active)} value={data.goal?.id??""} onChange={e=>void activate(e.target.value)} className={inputClass}><option value="" disabled>Selecione</option>{goals.map(g=><option key={g.id} value={g.id}>{g.title}</option>)}</select></label>{active&&<p className="mt-2 text-sm text-muted">Finalize a sessão antes de trocar de objetivo.</p>}{plan.can("canCreateMultipleGoals")?<form className="mt-4 flex flex-wrap gap-3" onSubmit={e=>{e.preventDefault();void activate(crypto.randomUUID(),title.trim());}}><input aria-label="Novo objetivo" required maxLength={160} value={title} onChange={e=>setTitle(e.target.value)} className={`${inputClass} flex-1`} placeholder="Nome do novo objetivo"/><button disabled={busy||saving||Boolean(active)} className={buttonClass}>Criar objetivo</button></form>:<Link href="/planos" className="mt-3 inline-block text-sm text-accent">Múltiplos objetivos no Pro →</Link>}{error&&<p role="alert" className="mt-3 text-sm text-error">{error}</p>}</section>;
}
