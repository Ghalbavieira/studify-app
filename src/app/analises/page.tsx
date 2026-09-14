"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { errorRecovery } from "@studify/study-core/recovery";
import { AppShell } from "@/components/app-shell";
import { inputClass, timeLabel } from "@/components/study-ui";
import { buildPriorityContext, calculateTopicMetrics, questionMetrics } from "@/lib/priority-engine";
import { useStudyData } from "@/lib/study-store";
import { usePlan } from "@/lib/use-plan";
import { loadQuestions, type Question } from "@/lib/question-bank";
export default function AnalyticsPage() {
  const { data, mode, ready } = useStudyData();
  const plan = usePlan();
  const [period, setPeriod] = useState("7");
  const [subject, setSubject] = useState("");
  const [board, setBoard] = useState("");
  const [catalog, setCatalog] = useState<Question[]>([]);
  const [catalogError, setCatalogError] = useState("");
  useEffect(() => { if (!ready || (mode !== "cloud" && mode !== "local")) return; let active = true; void loadQuestions(mode).then(rows => { if (active) setCatalog(rows); }).catch(() => { if (active) setCatalogError("Filtro por banca indisponível enquanto o catálogo não carregar."); }); return () => { active = false; }; }, [mode, ready]);
  const now = new Date();
  const days = period === "all" && plan.can("canUseFullHistory") ? 36500 : Math.min(Number(period) || 30, 30);
  const start = new Date(now); start.setDate(start.getDate() - days + 1); start.setHours(0,0,0,0);
  const allowed = new Set(catalog.filter(q => !board || q.board === board).map(q => q.id));
  const sessions = data.sessions.filter(s => !board && (!subject || s.subjectId === subject) && new Date(s.endedAt) >= start && new Date(s.endedAt) <= now);
  const attempts = data.attempts.filter(a => (!subject || a.subjectId === subject) && (!board || allowed.has(a.questionId)) && new Date(a.answeredAt) >= start && new Date(a.answeredAt) <= now);
  const filtered = { ...data, sessions, attempts };
  const metrics = questionMetrics(sessions, attempts);
  const recovery = errorRecovery(attempts);
  const topics = calculateTopicMetrics(filtered);
  const priority = buildPriorityContext(data, now);
  const seconds = sessions.reduce((sum,s) => sum + s.seconds,0);
  const questionSeconds = attempts.reduce((sum,a) => sum + (a.responseTimeSeconds ?? 0),0);
  return <AppShell><div className="mx-auto max-w-5xl"><header><h1 className="text-3xl font-semibold">Desempenho</h1><p className="mt-2 text-muted">Veja o dado, entenda a dificuldade e escolha sua próxima ação.</p></header><div className="my-6 grid gap-3 sm:grid-cols-3"><label className="text-sm text-secondary">Período<select value={period} onChange={e => setPeriod(e.target.value)} className={inputClass}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>{plan.can("canUseFullHistory") && <option value="all">Todo o histórico</option>}</select></label><label className="text-sm text-secondary">Matéria<select value={subject} onChange={e => setSubject(e.target.value)} className={inputClass}><option value="">Todas</option>{data.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="text-sm text-secondary">Banca<select value={board} onChange={e => setBoard(e.target.value)} className={inputClass}><option value="">Todas</option>{[...new Set(catalog.map(q => q.board))].map(b => <option key={b}>{b}</option>)}</select></label></div>{catalogError && <p className="text-sm text-attention">{catalogError}</p>}{board && <p className="text-sm text-muted">O filtro por banca inclui somente respostas do catálogo; sessões manuais não informam banca.</p>}
  <dl className="flex flex-wrap gap-6 border-y border-line py-5">{[["Questões",metrics.questions],["Acertos",metrics.correct],["Erros",metrics.questions - metrics.correct],["Taxa de acerto",metrics.accuracy === null ? "Sem respostas" : `${Math.round(metrics.accuracy * 100)}%`],["Tempo em sessões",timeLabel(seconds)],["Tempo médio por questão",attempts.length ? `${Math.round(questionSeconds / attempts.length)} s` : "Sem respostas"]].map(([label,value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-xl font-semibold">{value}</dd></div>)}</dl>
  <section className="py-6"><h2 className="text-xl font-semibold">Por matéria · dado, diagnóstico e ação</h2>{data.subjects.filter(s => !subject || s.id === subject).map(s => {
    const own = questionMetrics(sessions.filter(x => x.subjectId === s.id), attempts.filter(x => x.subjectId === s.id));
    const weakest = topics.filter(t => t.subjectId === s.id && t.questions >= 5 && t.accuracy !== null).sort((a,b) => a.accuracy! - b.accuracy!)[0];
    const trend = priority.priorities.find(p => p.subjectId === s.id)?.evidence.trend;
    const executed = sessions.filter(x => x.subjectId === s.id).reduce((sum,x) => sum + x.seconds,0);
    const planned = data.blocks.filter(b => b.subjectId === s.id && new Date(`${b.date}T23:59:59`) >= start && new Date(`${b.date}T00:00:00`) <= now).reduce((sum,b) => sum + b.minutes * 60,0);
    return <article key={s.id} className="border-b border-line py-5"><div className="flex flex-wrap justify-between gap-3"><h3 className="text-lg font-semibold">{s.name}</h3><span className="text-accent">{own.accuracy === null ? "Sem amostra" : `${Math.round(own.accuracy * 100)}%`} · {own.questions} questões</span></div><p className="mt-2 text-sm text-muted">{timeLabel(executed)} executados / {timeLabel(planned)} planejados</p>{plan.can("canUseAdvancedAnalytics") && <><p className="mt-2 text-sm text-secondary">{weakest ? `Maior dificuldade: ${weakest.topic} · ${Math.round(weakest.accuracy! * 100)}% em ${weakest.questions} questões.` : "Registre ao menos 5 questões por tópico para identificar dificuldades com mais segurança."}</p><p className="mt-2 text-xs text-muted">{trend == null ? "Tendência semanal ainda sem amostra suficiente." : `Últimas duas semanas: ${trend >= 0 ? "+" : ""}${Math.round(trend * 100)} p.p. (histórico geral da matéria).`}</p></>}<div className="mt-4 flex flex-wrap gap-4 text-sm"><Link href={`/estudos?subject=${s.id}${weakest ? `&topic=${weakest.topicId}` : ""}`} className="text-accent">Revisar agora →</Link><Link href={`/questoes?subject=${s.id}${weakest ? `&topic=${weakest.topicId}` : ""}&limit=15`} className="text-accent">Resolver 15 questões →</Link></div></article>;
  })}{!data.subjects.length && <p className="py-5 text-muted">Adicione matérias e registre uma sessão para acompanhar seu desempenho.</p>}</section>
  {!plan.can("canUseAdvancedAnalytics") && <Link href="/planos" className="text-sm text-accent">Conhecer as análises avançadas do Pro →</Link>}
  <section className="border-b border-line py-6"><h2 className="text-xl font-semibold">Erros & Revisões</h2><p className="mt-3 text-sm text-secondary">{recovery.registered} erros registrados · {recovery.retried} refazidos · {recovery.recovered} recuperados · {recovery.rate === null ? "Sem taxa ainda" : `${Math.round(recovery.rate * 100)}% de recuperação`}</p><p className="mt-2 text-sm text-muted">{data.tasks.filter(t => t.kind === "review" && t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) <= now && (!subject || t.subjectId === subject)).length} revisões e {data.tasks.filter(t => t.kind === "recall" && t.completedAt && new Date(t.completedAt) >= start && new Date(t.completedAt) <= now && (!subject || t.subjectId === subject)).length} recalls concluídos no período.</p><Link href="/revisoes" className="mt-3 inline-block text-sm text-accent">Revisar pendências →</Link></section>
  <section className="py-6"><h2 className="text-xl font-semibold">Histórico e novas tentativas</h2>{[...sessions].sort((a,b) => b.endedAt.localeCompare(a.endedAt)).map(s => <article key={s.id} className="border-b border-line py-4"><h3>{data.subjects.find(x => x.id === s.subjectId)?.name} · {new Date(s.endedAt).toLocaleDateString("pt-BR")}</h3><p className="text-sm text-muted">{timeLabel(s.seconds)} · {s.questions} questões externas · {s.correct} acertos</p>{s.notes && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-secondary">{s.notes}</p>}<Link href={`/estudos?subject=${s.subjectId}${s.topicId ? `&topic=${s.topicId}` : ""}${s.blockId ? `&block=${s.blockId}` : ""}`} className="mt-2 inline-block text-sm text-accent">Refazer sessão →</Link></article>)}</section>
  </div></AppShell>;
}
