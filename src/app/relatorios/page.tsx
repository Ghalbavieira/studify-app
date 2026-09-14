"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePlan } from "@/lib/use-plan";
import { Printer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, inputClass, timeLabel } from "@/components/study-ui";
import { localDate } from "@/lib/study-data";
import { useStudyData } from "@/lib/study-store";

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDate(date);
};

export default function RelatoriosPage() {
  const { data } = useStudyData();
  const plan = usePlan();
  const fullHistory = plan.can("canUseFullHistory");
  const [range, setRange] = useState<"7" | "30" | "all" | "custom">("30");
  const [from, setFrom] = useState(daysAgo(29));
  const [to, setTo] = useState(localDate(new Date()));

  const period = useMemo(() => {
    if (range === "7") return { from: daysAgo(6), to: localDate(new Date()) };
    if (range === "30") return { from: daysAgo(29), to: localDate(new Date()) };
    if (range === "custom") return { from: fullHistory ? from : from < daysAgo(29) ? daysAgo(29) : from, to };
    if (!fullHistory) return { from: daysAgo(29), to: localDate(new Date()) };
    return { from: "0000-01-01", to: "9999-12-31" };
  }, [from, range, to, fullHistory]);

  const report = useMemo(() => {
    const sessions = data.sessions.filter((session) => {
      const day = localDate(new Date(session.endedAt));
      return day >= period.from && day <= period.to;
    });
    const attempts = data.attempts.filter((attempt) => {
      const day = localDate(new Date(attempt.answeredAt));
      return day >= period.from && day <= period.to;
    });
    const blocks = data.blocks.filter((block) => block.date >= period.from && block.date <= period.to);
    const seconds = sessions.reduce((sum, item) => sum + item.seconds, 0);
    const sessionQuestions = sessions.reduce((sum, item) => sum + item.questions, 0);
    const sessionCorrect = sessions.reduce((sum, item) => sum + item.correct, 0);
    const questions = sessionQuestions + attempts.length;
    const correct = sessionCorrect + attempts.filter((attempt) => attempt.isCorrect).length;
    const planned = blocks.reduce((sum, block) => sum + block.minutes * 60, 0);
    const bySubject = data.subjects.map((subject) => {
      const subjectSessions = sessions.filter((session) => session.subjectId === subject.id);
      const subjectAttempts = attempts.filter((attempt) => attempt.subjectId === subject.id);
      const q = subjectSessions.reduce((sum, item) => sum + item.questions, 0) + subjectAttempts.length;
      const c = subjectSessions.reduce((sum, item) => sum + item.correct, 0) + subjectAttempts.filter((attempt) => attempt.isCorrect).length;
      return { name: subject.name, seconds: subjectSessions.reduce((sum, item) => sum + item.seconds, 0), questions: q, accuracy: q ? c / q : null };
    }).filter((subject) => subject.seconds > 0 || subject.questions > 0).sort((a, b) => b.seconds - a.seconds);
    return { sessions, seconds, questions, correct, accuracy: questions ? correct / questions : null, planned, execution: planned ? seconds / planned : null, bySubject };
  }, [data, period]);

  const coverage = data.topics.length ? data.topics.filter((topic) => topic.completed).length / data.topics.length : 0;

  return <AppShell><div className="mx-auto max-w-6xl print:max-w-none">
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-6 print:border-black">
      <div><p className="text-sm text-accent print:text-black">Relatório de preparação</p><h1 className="mt-1 text-3xl font-semibold">{data.goal?.title || "Seus estudos"}</h1><p className="mt-2 text-sm text-muted print:text-black">{range === "all" ? "Todo o histórico" : `${period.from} a ${period.to}`}</p></div>
      <div className="flex gap-2 print:hidden"><button className={`${buttonClass} inline-flex items-center gap-2`} disabled={!plan.can("canUseFullReports")} onClick={() => window.print()}><Printer size={17}/>Exportar PDF</button></div>
    </header>

    {!plan.can("canUseFullReports") && <Link href="/planos" className="mt-4 inline-block text-sm text-accent">Relatórios exportáveis e histórico completo no Pro →</Link>}
    <section className="grid gap-4 border-b border-line py-5 md:grid-cols-4 print:hidden">
      <label className="text-sm text-secondary">Período<select className={inputClass} value={range} onChange={(event) => setRange(event.target.value as typeof range)}><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>{fullHistory && <option value="all">Desde o início</option>}<option value="custom">Personalizado</option></select></label>
      {range === "custom" && <><label className="text-sm text-secondary">De<input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} /></label><label className="text-sm text-secondary">Até<input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} /></label></>}
    </section>

    <section className="grid gap-3 border-b border-line py-6 sm:grid-cols-2 lg:grid-cols-5 print:grid-cols-5 print:border-black">
      {[
        ["Tempo estudado", timeLabel(report.seconds)],
        ["Sessões", String(report.sessions.length)],
        ["Questões", String(report.questions)],
        ["Taxa de acerto", report.accuracy == null ? "—" : `${Math.round(report.accuracy * 100)}%`],
        ["Cobertura do edital", `${Math.round(coverage * 100)}%`],
      ].map(([label, value]) => <div key={label} className="border border-line bg-surface p-4 print:border-black print:bg-white" style={{ borderRadius: 8 }}><p className="text-xs text-muted print:text-black">{label}</p><strong className="mt-1 block text-2xl">{value}</strong></div>)}
    </section>

    <section className="grid gap-8 border-b border-line py-7 lg:grid-cols-2 print:grid-cols-2 print:border-black">
      <div><h2 className="text-xl font-semibold">Planejado × executado</h2><div className="mt-4 border border-line bg-surface p-5 print:border-black print:bg-white" style={{ borderRadius: 8 }}><div className="flex justify-between text-sm"><span>Planejado</span><strong>{timeLabel(report.planned)}</strong></div><div className="mt-3 flex justify-between text-sm"><span>Executado</span><strong>{timeLabel(report.seconds)}</strong></div><div className="mt-3 flex justify-between text-sm"><span>Execução</span><strong>{report.execution == null ? "—" : `${Math.round(report.execution * 100)}%`}</strong></div></div></div>
      <div><h2 className="text-xl font-semibold">Resumo do objetivo</h2><div className="mt-4 border border-line bg-surface p-5 text-sm print:border-black print:bg-white" style={{ borderRadius: 8 }}><p><span className="text-muted print:text-black">Banca:</span> {data.goal?.board || "—"}</p><p className="mt-2"><span className="text-muted print:text-black">Cargo/perfil:</span> {data.goal?.role || "—"}</p><p className="mt-2"><span className="text-muted print:text-black">Data da prova:</span> {data.goal?.examDate || "—"}</p><p className="mt-2"><span className="text-muted print:text-black">Tópicos concluídos:</span> {data.topics.filter((topic) => topic.completed).length}/{data.topics.length}</p></div></div>
    </section>

    <section className="py-7"><h2 className="text-xl font-semibold">Desempenho por matéria</h2><div className="mt-4 overflow-x-auto"><table className="w-full border-collapse text-left text-sm"><thead><tr className="border-b border-line print:border-black"><th className="py-3 pr-4">Matéria</th><th className="py-3 pr-4">Tempo</th><th className="py-3 pr-4">Questões</th><th className="py-3">Acerto</th></tr></thead><tbody>{report.bySubject.map((subject) => <tr key={subject.name} className="border-b border-line print:border-black"><td className="py-3 pr-4 font-medium">{subject.name}</td><td className="py-3 pr-4">{timeLabel(subject.seconds)}</td><td className="py-3 pr-4">{subject.questions}</td><td className="py-3">{subject.accuracy == null ? "—" : `${Math.round(subject.accuracy * 100)}%`}</td></tr>)}{!report.bySubject.length && <tr><td className="py-5 text-muted" colSpan={4}>Ainda não há dados neste período.</td></tr>}</tbody></table></div></section>

    <p className="hidden pt-6 text-xs text-black print:block">Gerado pelo Studify em {new Date().toLocaleDateString("pt-BR")}.</p>
  </div></AppShell>;
}
