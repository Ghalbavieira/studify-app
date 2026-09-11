"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpenCheck, CalendarClock, FileText, Target, Download } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, inputClass, secondaryButtonClass, timeLabel } from "@/components/study-ui";
import { buildPriorityContext, calculateMetrics } from "@/lib/priority-engine";
import { localDate } from "@/lib/study-data";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useStudyData } from "@/lib/study-store";

type DailyLog = { note: string; energy: number | null; focus: number | null };

export default function PainelPage() {
  const { data, mode, userId } = useStudyData();
  const now = new Date();
  const today = localDate(now);
  const metrics = calculateMetrics(data, now);
  const context = buildPriorityContext(data, now);
  const [log, setLog] = useState<DailyLog>({ note: "", energy: null, focus: null });
  const [logMessage, setLogMessage] = useState("");
  const [savingLog, setSavingLog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!data.goal) return;
      if (mode === "local") {
        try {
          const saved = localStorage.getItem(`studify.daily.${data.goal.id}.${today}`);
          if (saved && !cancelled) setLog(JSON.parse(saved));
        } catch { /* optional local note */ }
        return;
      }
      if (mode === "cloud" && userId) {
        const { data: row } = await getSupabaseClient().from("daily_logs").select("note,energy,focus").eq("goal_id", data.goal.id).eq("log_date", today).maybeSingle();
        if (row && !cancelled) setLog({ note: row.note ?? "", energy: row.energy ?? null, focus: row.focus ?? null });
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [data.goal, mode, today, userId]);

  async function saveLog() {
    if (!data.goal) return;
    setSavingLog(true); setLogMessage("");
    try {
      if (mode === "local") localStorage.setItem(`studify.daily.${data.goal.id}.${today}`, JSON.stringify(log));
      else if (mode === "cloud") {
        const { error } = await getSupabaseClient().from("daily_logs").upsert({ user_id: userId, goal_id: data.goal.id, log_date: today, note: log.note, energy: log.energy, focus: log.focus }, { onConflict: "user_id,goal_id,log_date" });
        if (error) throw error;
      }
      setLogMessage("Fechamento salvo.");
    } catch { setLogMessage("Não foi possível salvar o fechamento. Execute a migration 004 no Supabase."); }
    finally { setSavingLog(false); }
  }

  if (!data.goal) return <AppShell><div className="mx-auto max-w-4xl py-12"><h1 className="text-3xl font-semibold">Painel de preparação</h1><p className="mt-3 text-muted">Crie ou importe seu objetivo para o painel começar a acompanhar sua preparação.</p><Link href="/edital" className={`${buttonClass} mt-5 inline-block`}>Importar edital</Link></div></AppShell>;

  const totalTopics = data.topics.length;
  const completedTopics = data.topics.filter((topic) => topic.completed).length;
  const coverage = totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0;
  const execution = metrics.executionRate == null ? null : Math.round(metrics.executionRate * 100);
  const accuracy = metrics.accuracy == null ? null : Math.round(metrics.accuracy * 100);
  const topPriorities = context.priorities.slice(0, 5);
  const weak = [...metrics.bySubject].filter((subject) => subject.questions > 0).sort((a, b) => (a.accuracy ?? 1) - (b.accuracy ?? 1)).slice(0, 5);

  return <AppShell><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
      <div><p className="text-sm text-accent">{data.goal.board || "Preparação ativa"}{data.goal.role ? ` · ${data.goal.role}` : ""}</p><h1 className="mt-1 text-3xl font-semibold">Painel de preparação</h1><p className="mt-2 text-sm text-muted">{data.goal.title}{data.goal.organization ? ` · ${data.goal.organization}` : ""}</p></div>
      <div className="flex flex-wrap items-center gap-3 text-sm"><Link href="/relatorios" className={`${secondaryButtonClass} inline-flex items-center gap-2 print:hidden`}><Download size={16} />Exportar relatório</Link>{context.daysToExam != null && <div className="border border-line bg-surface px-4 py-3" style={{ borderRadius: 8 }}><span className="block text-xs text-muted">Dias até a prova</span><strong className="mt-1 block text-2xl">{context.daysToExam}</strong></div>}{data.goal.cutoffScore != null && <div className="border border-line bg-surface px-4 py-3" style={{ borderRadius: 8 }}><span className="block text-xs text-muted">Corte mínimo</span><strong className="mt-1 block text-2xl">{data.goal.cutoffScore}</strong></div>}</div>
    </header>

    <section className="grid gap-3 border-b border-line py-6 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ["Cobertura do edital", `${coverage}%`, `${completedTopics}/${totalTopics} tópicos`, BookOpenCheck],
        ["Execução semanal", execution == null ? "—" : `${execution}%`, `${timeLabel(metrics.executedSeconds)} / ${timeLabel(metrics.plannedSeconds)}`, Target],
        ["Questões na semana", String(metrics.questions), accuracy == null ? "Sem taxa ainda" : `${accuracy}% de acerto`, FileText],
        ["Revisões atrasadas", String(metrics.overdueReviews), metrics.overdueReviews ? "exigem atenção" : "nenhuma atrasada", AlertTriangle],
        ["Recalls pendentes", String(metrics.pendingRecalls), "até hoje", CalendarClock],
      ].map(([label, value, note, Icon]) => <div key={String(label)} className="border border-line bg-surface p-4" style={{ borderRadius: 8 }}><Icon size={18} className="text-accent" /><p className="mt-4 text-xs text-muted">{String(label)}</p><strong className="mt-1 block text-2xl">{String(value)}</strong><span className="mt-1 block text-xs text-muted">{String(note)}</span></div>)}
    </section>

    <section className="grid gap-8 border-b border-line py-7 lg:grid-cols-2">
      <div><div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-semibold">Prioridades agora</h2><p className="mt-1 text-sm text-muted">Calculadas com peso, execução, questões, revisões, recalls e proximidade da prova.</p></div><Link href="/ia" className="text-sm text-accent">Ver IA →</Link></div><div className="mt-4 divide-y divide-line border-y border-line">{topPriorities.map((priority, index) => <div key={priority.subjectId} className="flex items-start gap-4 py-4"><span className="font-mono text-sm text-muted">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><strong>{priority.subject}</strong><span className="text-xs text-accent">score {priority.score}</span></div><p className="mt-1 text-sm text-muted">{priority.reasons.slice(0, 2).join(" ")}</p></div></div>)}</div></div>
      <div><h2 className="text-xl font-semibold">Matérias com maior risco</h2><p className="mt-1 text-sm text-muted">Ordenadas pela menor taxa de acerto entre as matérias que já têm questões registradas.</p><div className="mt-4 divide-y divide-line border-y border-line">{weak.length ? weak.map((subject) => <div key={subject.subjectId} className="flex items-center justify-between gap-4 py-4"><div><strong>{subject.name}</strong><p className="mt-1 text-xs text-muted">{subject.questions} questões · {timeLabel(subject.executedSeconds)} estudados</p></div><span className={`text-lg font-semibold ${(subject.accuracy ?? 1) < .6 ? "text-error" : (subject.accuracy ?? 1) < .75 ? "text-attention" : "text-success"}`}>{subject.accuracy == null ? "—" : `${Math.round(subject.accuracy * 100)}%`}</span></div>) : <p className="py-5 text-sm text-muted">Ainda não há questões suficientes para comparar matérias.</p>}</div></div>
    </section>

    <section className="grid gap-8 border-b border-line py-7 lg:grid-cols-[1.1fr_.9fr]">
      <div><h2 className="text-xl font-semibold">Cobertura do edital</h2><p className="mt-1 text-sm text-muted">O que já foi marcado como concluído em cada matéria.</p><div className="mt-4 space-y-4">{data.subjects.map((subject) => { const topics = data.topics.filter((topic) => topic.subjectId === subject.id); const done = topics.filter((topic) => topic.completed).length; const percent = topics.length ? Math.round(done / topics.length * 100) : 0; return <div key={subject.id}><div className="mb-1 flex justify-between gap-3 text-sm"><span>{subject.name}</span><span className="text-muted">{done}/{topics.length} · {percent}%</span></div><div className="h-1.5 bg-raised"><div className="h-1.5 bg-accent" style={{ width: `${percent}%` }} /></div></div>; })}</div><div className="mt-5"><Link href="/edital" className="inline-flex items-center gap-2 text-sm text-accent"><FileText size={16} />Revisar edital e conteúdo</Link></div></div>
      <div><h2 className="text-xl font-semibold">Fechamento de hoje</h2><p className="mt-1 text-sm text-muted">Registre o que não aparece nos números: dificuldade, cansaço, insight ou mudança de estratégia.</p><textarea className={`${inputClass} mt-4 min-h-36 resize-y`} maxLength={6000} placeholder="Ex.: subnetting ainda trava em fronteira de bloco; inglês exigiu mais esforço; a revisão de Cloud rendeu bem." value={log.note} onChange={(e) => setLog((current) => ({ ...current, note: e.target.value }))} /><div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-muted">Energia<select className={inputClass} value={log.energy ?? ""} onChange={(e) => setLog((current) => ({ ...current, energy: e.target.value ? Number(e.target.value) : null }))}><option value="">Não informar</option>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label><label className="text-xs text-muted">Foco<select className={inputClass} value={log.focus ?? ""} onChange={(e) => setLog((current) => ({ ...current, focus: e.target.value ? Number(e.target.value) : null }))}><option value="">Não informar</option>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}/5</option>)}</select></label></div><div className="mt-4 flex items-center gap-3"><button disabled={savingLog} onClick={() => void saveLog()} className={buttonClass}>{savingLog ? "Salvando…" : "Salvar fechamento"}</button><span className="text-sm text-accent">{logMessage}</span></div></div>
    </section>
  </div></AppShell>;
}
