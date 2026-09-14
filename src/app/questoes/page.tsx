"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, buttonClass, inputClass, secondaryButtonClass } from "@/components/study-ui";
import { answerQuestion, loadQuestions, startQuestionSession, type Question } from "@/lib/question-bank";
import { recordSession } from "@/lib/study-data";
import { useStudyData, updateStudyData, refreshStudyData } from "@/lib/study-store";

import { createQuestionSet, useQuestionCollections } from "@/lib/question-collections";
import { buildPriorityContext } from "@/lib/priority-engine";

type Answer = Awaited<ReturnType<typeof answerQuestion>>;
function QuestionsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const collections = useQuestionCollections();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(params.get("status") ?? "all");
  const [difficulty, setDifficulty] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState("");
  const [questionType, setQuestionType] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<"list" | "simulation">("list");
  const collectionId = useRef("");
  const { data, mode, ready, saving } = useStudyData();
  const [catalog, setCatalog] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subjectId, setSubjectId] = useState(params.get("subject") ?? "");
  const [topicFilter, setTopicFilter] = useState("");
  const [board, setBoard] = useState("");
  const [year, setYear] = useState("");
  const [limit, setLimit] = useState(params.get("limit") ?? "10");
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState("");
  const [result, setResult] = useState<Answer | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const requestId = useRef("");
  const sessionId = useRef("");
  const questionStart = useRef(0);
  const sessionStart = useRef(0);
  useEffect(() => {
    if (!ready || (mode !== "local" && mode !== "cloud")) return;
    let cancelled = false;
    loadQuestions(mode).then((questions) => { if (!cancelled) { setCatalog(questions); setLoading(false); } }).catch(() => { if (!cancelled) { setError("Não foi possível carregar o banco. Confira a conexão e as migrations de questões."); setLoading(false); } });
    return () => { cancelled = true; };
  }, [mode, ready]);
  const subject = data.subjects.find((subject) => subject.id === subjectId);
  const matchesSubject = (question: Question) => !subject || question.subjectId === subject.id || question.subjectLabel.toLocaleLowerCase() === subject.name.toLocaleLowerCase();
  const effectiveTopic = topicFilter || data.topics.find(t => t.id === params.get("topic"))?.title || "";
  const latest = new Map<string, typeof data.attempts[number]>();
  for (const attempt of [...data.attempts].sort((a,b) => a.answeredAt.localeCompare(b.answeredAt))) latest.set(attempt.questionId, attempt);
  const filtered = catalog.filter((question) => matchesSubject(question) && (!effectiveTopic || question.topicLabel === effectiveTopic) && (!board || question.board === board) && (!year || String(question.year) === year) && (!difficulty || question.difficulty === difficulty) && (!organization || question.organization === organization) && (!role || question.role === role) && (!questionType || question.questionType === questionType) && (!search || `${question.statement} ${question.topicLabel}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && (status === "all" || (status === "wrong" && latest.get(question.id)?.isCorrect === false) || (status === "correct" && latest.get(question.id)?.isCorrect === true) || (status === "solved" && latest.has(question.id)) || (status === "unsolved" && !latest.has(question.id)) || (status === "favorite" && collections.favorites.includes(question.id))));
  const priorities = buildPriorityContext(data).priorities.slice(0,3);
  const current = queue?.[index];
  const topics = [...new Set(catalog.filter(matchesSubject).map((question) => question.topicLabel).filter(Boolean))];
  async function submitAnswer() {
    if (!current || !selected || !subject || busy || result || (mode !== "local" && mode !== "cloud")) return;
    setBusy(true); setError("");
    const topicId = current.topicId ?? data.topics.find((topic) => topic.subjectId === subject.id && topic.title.toLocaleLowerCase() === current.topicLabel.toLocaleLowerCase())?.id ?? null;
    try {
      const answer = await answerQuestion({ mode, questionId: current.id, optionId: selected, requestId: requestId.current, subjectId: subject.id, topicId, studySessionId: sessionId.current, seconds: Math.min(86400, Math.max(0, Math.round((Date.now() - questionStart.current) / 1000))) });
      if (mode === "local") {
        const saved = await updateStudyData((state) => ({ ...state, attempts: state.attempts.some((attempt) => attempt.id === answer.attempt.id) ? state.attempts : [...state.attempts, answer.attempt] }));
        if (!saved) { setError("A resposta não foi salva. Tente novamente."); return; }
      } else await refreshStudyData();
      setResult(answer); setAnswers((existing) => [...existing, answer]);
    } catch { setError("Não foi possível registrar a resposta. Tente novamente; a tentativa não será duplicada."); }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!answers.length || !subject || busy) return;
    setBusy(true);
    const now = new Date();
    const seconds = Math.min(86400, Math.max(1, Math.floor((now.getTime() - sessionStart.current) / 1000)));
    const topicIds = [...new Set(answers.map((answer) => answer.attempt.topicId))];
    const block = data.blocks.find((block) => block.id === params.get("block") && block.subjectId === subject.id);
    const saved = await updateStudyData((state) => {
      const next = recordSession(state, { id: sessionId.current, subjectId: subject.id, topicId: topicIds.length === 1 ? topicIds[0] : null, blockId: block?.id ?? null, taskId: null, startedAt: new Date(sessionStart.current).toISOString(), endedAt: now.toISOString(), seconds, questions: 0, correct: 0, notes: `Sessão de questões: ${answers.length} respostas registradas individualmente.` }, () => crypto.randomUUID());
      return block && ((block.plannedQuestions > 0 && answers.length >= block.plannedQuestions) || seconds >= block.minutes * 60) ? { ...next, blocks: next.blocks.map((item) => item.id === block.id ? { ...item, done: true } : item) } : next;
    });
    if (saved) { setSummary(`${answers.filter((answer) => answer.attempt.isCorrect).length} acertos em ${answers.length} questões. Sessão e evidências registradas.`); setQueue(null); }
    else setError("Não foi possível finalizar a sessão. Suas respostas já registradas foram preservadas; tente novamente.");
    setBusy(false);
  }
  return <AppShell><div className="mx-auto max-w-4xl"><header className="border-b border-line pb-5"><p className="text-sm text-accent">Evidência de aprendizagem</p><h1 className="mt-1 text-3xl font-semibold">Questões</h1><p className="mt-2 text-sm text-muted">Resolva, corrija e use os erros para orientar o próximo estudo.</p></header>
    {!data.goal || !data.subjects.length ? <div className="mt-8"><EmptyState title="Associe as respostas ao seu estudo" description="Crie seu objetivo e adicione matérias para acompanhar acertos e tópicos frágeis." href={!data.goal ? "/cadastro" : "/materias"} action={!data.goal ? "Criar objetivo" : "Adicionar matérias"} /></div> : !queue ? <>
      <nav className="flex flex-wrap gap-3 border-b border-line py-4" aria-label="Áreas de questões"><Link href="/questoes/listas" className="text-accent">Minhas listas e simulados</Link><Link href="/revisoes" className="text-accent">Erros & Revisões</Link><button onClick={() => setStatus("favorite")} className="text-accent">Favoritas</button></nav>
      <section className="border-b border-line py-5"><h2 className="font-semibold">Questões recomendadas para você</h2><div className="mt-3 space-y-3">{priorities.map(priority => <div key={priority.subjectId}><button className="text-sm text-accent" onClick={() => { setSubjectId(priority.subjectId); setTopicFilter(""); setStatus("all"); }}>{priority.subject} →</button><p className="text-xs text-muted">{priority.reasons.slice(0,2).join(" ")}</p></div>)}</div></section>
      <form className="border-b border-line py-5" onSubmit={async (event) => {
        event.preventDefault(); if (!subject || !filtered.length || !data.goal || busy) return;
        setBusy(true); setError(""); sessionId.current = crypto.randomUUID(); sessionStart.current = Date.now();
        try {
          const block = data.blocks.find((block) => block.id === params.get("block") && block.subjectId === subject.id);
          if (mode === "cloud") await startQuestionSession({ id: sessionId.current, goalId: data.goal.id, subjectId: subject.id, topicId: null, blockId: block?.id ?? null, startedAt: new Date(sessionStart.current).toISOString() });
          setQueue(filtered.slice(0, Number(limit))); setIndex(0); setSelected(""); setResult(null); setAnswers([]); setSummary(null); requestId.current = crypto.randomUUID(); questionStart.current = Date.now();
        } catch { setError("Não foi possível iniciar a sessão. Confira a conexão e tente novamente."); }
        finally { setBusy(false); }
      }}><h2 className="mb-4 text-xl font-semibold">Buscar questões e criar lista</h2><label className="mb-4 block text-sm text-secondary">Buscar enunciado ou assunto<input value={search} onChange={e => setSearch(e.target.value)} className={inputClass} /></label><div className="mb-4 grid gap-3 sm:grid-cols-2"><label className="text-sm text-secondary">Situação<select value={status} onChange={e => setStatus(e.target.value)} className={inputClass}>{[["all","Todas"],["wrong","Questões erradas"],["correct","Acertadas"],["solved","Resolvidas"],["unsolved","Não resolvidas"],["favorite","Favoritas"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label><label className="text-sm text-secondary">Dificuldade<select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={inputClass}><option value="">Todas</option>{[...new Set(catalog.map(q => q.difficulty).filter(Boolean))].map(v => <option key={v!} value={v!}>{v}</option>)}</select></label>{([["Órgão",organization,setOrganization,"organization"],["Cargo",role,setRole,"role"],["Tipo",questionType,setQuestionType,"questionType"]] as const).map(([label,value,setValue,field]) => <label key={field} className="text-sm text-secondary">{label}<select value={value} onChange={e => setValue(e.target.value)} className={inputClass}><option value="">Todos</option>{[...new Set(catalog.map(q => q[field]).filter(Boolean))].map(v => <option key={v} value={v}>{v === "true_false" ? "Duas alternativas" : v === "multiple_choice" ? "Múltipla escolha" : v}</option>)}</select></label>)}</div><div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-secondary">Matéria<select required value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicFilter(""); }} className={inputClass}><option value="">Selecione uma matéria</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label className="text-sm text-secondary">Tópico<select value={effectiveTopic} onChange={(event) => setTopicFilter(event.target.value)} className={inputClass}><option value="">Todos os tópicos</option>{topics.map((topic) => <option key={topic}>{topic}</option>)}</select></label><label className="text-sm text-secondary">Banca<select value={board} onChange={(event) => setBoard(event.target.value)} className={inputClass}><option value="">Todas as bancas</option>{[...new Set(catalog.map((question) => question.board))].map((name) => <option key={name}>{name}</option>)}</select></label><label className="text-sm text-secondary">Ano<select value={year} onChange={(event) => setYear(event.target.value)} className={inputClass}><option value="">Todos os anos</option>{[...new Set(catalog.map((question) => question.year).filter(Boolean))].map((value) => <option key={value!}>{value}</option>)}</select></label></div><div className="mt-4 flex flex-wrap items-end gap-4"><label className="max-w-36 text-sm text-secondary">Quantidade<input type="number" required min={1} max={100} step={1} value={limit} onChange={(event) => setLimit(event.target.value)} className={inputClass} /></label><button disabled={loading || !subject || !filtered.length || saving || busy} className={buttonClass}>Iniciar sessão de questões</button><p className="py-2 text-xs text-muted">{loading ? "Carregando banco…" : `${filtered.length} questão(ões) disponível(is)`}</p></div></form>
      {mode === "cloud" && <section className="border-b border-line py-5"><h2 className="font-semibold">Salvar seleção como lista ou simulado</h2><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Nome<input maxLength={160} value={title} onChange={e => { setTitle(e.target.value); collectionId.current = ""; }} className={inputClass} /></label><label className="text-sm">Formato<select value={kind} onChange={e => setKind(e.target.value as "list" | "simulation")} className={inputClass}><option value="list">Lista</option><option value="simulation">Simulado</option></select></label></div><button disabled={busy || !subject || !title.trim() || !filtered.length || loading} className={`${secondaryButtonClass} mt-4`} onClick={async () => { if (!data.goal || !subject) return; setBusy(true); setError(""); try { collectionId.current ||= crypto.randomUUID(); await createQuestionSet({ id: collectionId.current, goal: data.goal.id, subject: subject.id, topic: data.topics.find(t => t.subjectId === subject.id && t.title === effectiveTopic)?.id ?? null, title: title.trim(), kind, questions: filtered.slice(0, Math.max(1, Math.min(100, Number(limit) || 10))).map(q => q.id) }); router.push("/questoes/listas"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível criar a lista."); } finally { setBusy(false); } }}>Gerar e salvar</button>{collections.error && <p className="mt-2 text-sm text-attention">{collections.error}</p>}</section>}
      {!loading && subject && !filtered.length && <p className="py-6 text-sm text-muted">Nenhuma questão para esses filtros. Ajuste a busca; o banco inicial contém apenas a pequena base autoral de demonstração.</p>}
      {summary && <div role="status" className="border-b border-line py-6"><p className="text-success">{summary}</p><Link href="/dashboard" className="mt-3 inline-flex items-center gap-2 text-sm text-accent">Voltar ao Início<ArrowRight size={15} /></Link></div>}
      <p className="mt-5 text-xs leading-5 text-muted">Base inicial: questões próprias do Studify, de demonstração, sem vínculo com provas oficiais. O catálogo está preparado para conteúdo próprio, licenciado ou oficial com uso permitido.</p>
    </> : current && <section className="py-6"><div className="flex flex-wrap justify-between gap-3 text-xs text-muted"><p>Questão {index + 1} de {queue.length} · {subject?.name}</p><p>{current.board}{current.year && ` · ${current.year}`}</p></div><button disabled={busy} onClick={async () => { try { await collections.toggleFavorite(current.id); } catch (cause) { setError(cause instanceof Error ? cause.message : "Tente novamente."); } }} className="mt-4 text-sm text-accent">{collections.favorites.includes(current.id) ? "Remover das favoritas" : "Salvar favorita"}</button><h2 className="mt-6 text-xl font-medium leading-8">{current.statement}</h2><form className="mt-6" onSubmit={(event) => { event.preventDefault(); void submitAnswer(); }}><fieldset disabled={Boolean(result) || busy}><legend className="sr-only">Escolha uma alternativa</legend><div className="space-y-2">{current.options.map((option) => <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3 text-sm ${result?.correctOptionId === option.id ? "border-success bg-success/5" : selected === option.id ? "border-accent bg-accent-subtle" : "border-line"}`}><input type="radio" name="answer" value={option.id} checked={selected === option.id} onChange={() => setSelected(option.id)} className="mt-1" /><span className="font-medium text-accent">{option.label}</span><span className="leading-6">{option.text}</span></label>)}</div></fieldset>{!result && <button disabled={!selected || busy || saving} className={`${buttonClass} mt-5`}>{busy ? "Registrando…" : "Responder"}</button>}</form>{result && <div role="status" className="mt-6 border-l-2 border-success pl-4"><h3 className={`flex items-center gap-2 font-semibold ${result.attempt.isCorrect ? "text-success" : "text-attention"}`}><Check size={18} />{result.attempt.isCorrect ? "Resposta correta" : "Vamos corrigir"}</h3><p className="mt-2 text-sm leading-6 text-secondary">{result.explanation ?? "Confira a alternativa correta destacada acima."}</p><p className="mt-2 text-xs text-muted">Tentativa registrada{mode === "local" ? " neste navegador" : " no Supabase"}.</p></div>}<div className="mt-6 flex flex-wrap gap-3">{result && index < queue.length - 1 && <button className={buttonClass} onClick={() => { setIndex(index + 1); setSelected(""); setResult(null); requestId.current = crypto.randomUUID(); questionStart.current = Date.now(); }}>Próxima questão</button>}{answers.length > 0 && <button disabled={busy || saving} onClick={() => void finish()} className={secondaryButtonClass}>Finalizar sessão</button>}{!answers.length && <button disabled={busy} onClick={() => setQueue(null)} className={secondaryButtonClass}>Voltar aos filtros</button>}</div><p className="mt-5 text-xs text-muted">{current.sourceReference}</p></section>}
    <p role="alert" className="mt-4 text-sm text-attention">{error}</p>
  </div></AppShell>;
}
export default function QuestoesPage() { return <Suspense fallback={<p className="p-6 text-muted">Carregando questões…</p>}><QuestionsContent /></Suspense>; }
