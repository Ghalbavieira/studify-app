"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { buttonClass, timeLabel } from "@/components/study-ui";
import { useQuestionCollections } from "@/lib/question-collections";
import { useStudyData, refreshStudyData } from "@/lib/study-store";
import { getSupabaseClient } from "@/lib/supabase/client";
import { loadQuestions, type Question } from "@/lib/question-bank";
function RunContent() {
  const params = useSearchParams();
  const { data, mode } = useStudyData();
  const collections = useQuestionCollections();
  const run = collections.runs.find(r => r.id === params.get("id"));
  const set = collections.sets.find(s => s.id === run?.set_id);
  const [catalog, setCatalog] = useState<Question[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const request = useRef({ question: "", id: "", start: 0 });
  useEffect(() => { let active = true; if (mode === "cloud" && run) void loadQuestions("cloud", run.question_ids).then(rows => { if (active) setCatalog(rows); }).catch(() => { if (active) setError("Não foi possível carregar as questões desta tentativa."); }); return () => { active = false; }; }, [mode, run]);
  const answered = collections.answers.filter(a => a.run_id === run?.id);
  const nextId = run?.question_ids.find(id => !answered.some(a => a.question_id === id));
  const question = catalog.find(q => q.id === nextId);
  useEffect(() => { if (nextId) request.current = { question: nextId, id: crypto.randomUUID(), start: new Date().getTime() }; }, [nextId]);
  const ids = new Set(answered.map(a => a.attempt_id));
  const attempts = data.attempts.filter(a => ids.has(a.id));
  async function answer() {
    if (!question || !run || !selected || busy) return;
    setBusy(true); setError("");
    try {
      const { data: result, error } = await getSupabaseClient().rpc("answer_question_run", { p_run: run.id, p_question: question.id, p_option: selected, p_request: request.current.id, p_seconds: Math.min(86400, Math.max(0, Math.round((new Date().getTime() - request.current.start) / 1000))) });
      if (error) throw error;
      setFeedback(`${result.attempt.is_correct ? "Resposta correta." : "Resposta incorreta."} ${result.explanation ?? ""}`); setSelected("");
      await Promise.all([collections.refresh(), refreshStudyData()]);
    } catch { setError("Não foi possível registrar a resposta. Tente novamente; o mesmo envio não duplica a tentativa."); }
    finally { setBusy(false); }
  }
  return <AppShell><div className="mx-auto max-w-3xl"><Link href="/questoes/listas" className="text-accent">← Listas e simulados</Link><h1 className="mt-4 text-3xl font-semibold">{set?.title ?? "Tentativa"}</h1>{collections.loading && <p role="status">Carregando…</p>}{(error || collections.error) && <p role="alert" className="my-4 text-error">{error || collections.error}</p>}{!collections.loading && !run && <p className="my-6 text-muted">Esta tentativa não está disponível para sua conta. Abra uma lista para iniciar ou continuar.</p>}{run && <><p className="mt-3 text-sm text-muted">{answered.length}/{run.question_ids.length} respondidas · {timeLabel(attempts.reduce((sum,a) => sum + (a.responseTimeSeconds ?? 0),0))}</p>{feedback && <p role="status" className="my-5 border-l-2 border-accent pl-4 text-secondary">{feedback}</p>}{question ? <form className="mt-8" onSubmit={e => { e.preventDefault(); void answer(); }}><h2 className="text-xl leading-8">{question.statement}</h2><fieldset disabled={busy} className="mt-5 space-y-3"><legend className="sr-only">Alternativas</legend>{question.options.map(option => <label key={option.id} className="flex gap-3 rounded-md border border-line p-4"><input type="radio" name="answer" checked={selected === option.id} onChange={() => setSelected(option.id)} /><span>{option.label}. {option.text}</span></label>)}</fieldset><button disabled={!selected || busy} className={`${buttonClass} mt-5`}>{busy ? "Registrando…" : "Responder e avançar"}</button></form> : nextId ? <p className="mt-6">Carregando a próxima questão…</p> : <section className="mt-8"><h2 className="text-2xl font-semibold">Resultado</h2><p className="mt-3">{attempts.filter(a => a.isCorrect).length} acertos em {attempts.length} respostas{attempts.length > 0 && ` · ${Math.round(attempts.filter(a => a.isCorrect).length / attempts.length * 100)}%`}</p><Link href="/questoes/listas" className={`${buttonClass} mt-5 inline-block`}>Comparar tentativas e refazer</Link></section>}</>}</div></AppShell>;
}
export default function RunPage() { return <Suspense fallback={<p>Carregando tentativa…</p>}><RunContent /></Suspense>; }
