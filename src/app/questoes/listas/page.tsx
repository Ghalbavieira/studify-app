"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, secondaryButtonClass, timeLabel } from "@/components/study-ui";
import { useStudyData } from "@/lib/study-store";
import { startQuestionRun, useQuestionCollections } from "@/lib/question-collections";
export default function ListsPage() {
  const { data, mode } = useStudyData();
  const collections = useQuestionCollections();
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function start(id: string, parent: string | null = null, wrong = false) {
    if (busy) return; setBusy(true); setError("");
    try { router.push(`/questoes/tentativa?id=${await startQuestionRun(id, parent, wrong)}`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Tente novamente."); }
    finally { setBusy(false); }
  }
  return <AppShell><div className="mx-auto max-w-4xl"><header className="border-b border-line pb-6"><Link href="/questoes" className="text-accent">← Questões</Link><h1 className="mt-3 text-3xl font-semibold">Minhas listas e simulados</h1><p className="mt-2 text-muted">Cada execução é uma nova tentativa. Seu histórico é preservado.</p><Link href="/questoes?create=1" className={`${buttonClass} mt-4 inline-block`}>Criar lista ou simulado</Link></header><div className="flex flex-wrap gap-2 py-4">{[["all","Todos"],["list","Listas"],["simulation","Simulados"]].map(([value,label]) => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={secondaryButtonClass}>{label}</button>)}</div>
  {mode !== "cloud" && <p className="py-5 text-muted">Entre na conta para guardar suas listas e continuar no Web ou no Mobile.</p>}
  {collections.loading && <p role="status">Carregando listas…</p>}
  {(error || collections.error) && <p role="alert" className="py-4 text-error">{error || collections.error}<button onClick={() => void collections.refresh()} className="ml-3 text-accent">Tentar novamente</button></p>}
  {!collections.loading && !collections.error && mode === "cloud" && !collections.sets.length && <p className="py-6 text-muted">Você ainda não criou listas. Escolha os filtros em Questões para gerar a primeira.</p>}
  {collections.sets.filter(set => set.goal_id === data.goal?.id && (filter === "all" || set.kind === filter)).map(set => <section key={set.id} className="border-b border-line py-6"><div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs text-accent">{set.kind === "simulation" ? "Simulado" : "Lista"} · {set.question_ids.length} questões</p><h2 className="mt-1 text-xl font-semibold">{set.title}</h2></div><button disabled={busy} onClick={() => void start(set.id)} className={buttonClass}>Nova tentativa</button></div><ol className="mt-4 divide-y divide-line">{collections.runs.filter(run => run.set_id === set.id).sort((a,b) => a.started_at.localeCompare(b.started_at)).map((run,index) => {
    const ids = new Set(collections.answers.filter(answer => answer.run_id === run.id).map(answer => answer.attempt_id));
    const attempts = data.attempts.filter(attempt => ids.has(attempt.id));
    const correct = attempts.filter(a => a.isCorrect).length;
    return <li key={run.id} className="py-4"><h3 className="font-medium">Tentativa {index + 1} · {run.completed_at ? "Concluída" : "Em andamento"}</h3><p className="mt-1 text-sm text-muted">{attempts.length}/{run.question_ids.length} respostas · {correct} acertos · {timeLabel(attempts.reduce((sum,a) => sum + (a.responseTimeSeconds ?? 0),0))}</p><div className="mt-3 flex flex-wrap gap-4"><Link href={`/questoes/tentativa?id=${run.id}`} className="text-sm text-accent">{run.completed_at ? "Ver resultado" : "Continuar"}</Link><button disabled={busy} onClick={() => void start(set.id,run.id)} className="text-sm text-accent">Refazer lista</button>{attempts.some(a => !a.isCorrect) && <button disabled={busy} onClick={() => void start(set.id,run.id,true)} className="text-sm text-accent">Refazer erradas</button>}</div></li>;
  })}</ol></section>)}
  </div></AppShell>;
}
