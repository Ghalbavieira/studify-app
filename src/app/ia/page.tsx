"use client";

import { usePlan } from "@/lib/use-plan";
import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, buttonClass, secondaryButtonClass } from "@/components/study-ui";
import { buildPriorityContext } from "@/lib/priority-engine";
import { localDate } from "@/lib/study-data";
import { useStudyData, updateStudyData } from "@/lib/study-store";
import { getSupabaseClient } from "@/lib/supabase/client";

export default function IaPage() {
  const plan = usePlan();
  const { data, mode, saving } = useStudyData();
  const context = buildPriorityContext(data);
  const best = context.recommendation;
  const [explanation, setExplanation] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState(false);
  const today = localDate(new Date());
  const pending = data.blocks.filter((block) => block.date === today && !block.done);
  const score = (subjectId: string) => context.priorities.find((priority) => priority.subjectId === subjectId)?.score ?? 0;
  const ordered = [...pending].sort((a, b) => score(b.subjectId) - score(a.subjectId));
  const canAdjust = plan.can("canUseAdvancedPlanning") && ordered.some((block, index) => block.id !== pending[index].id);
  return <AppShell><div className="mx-auto max-w-4xl"><header className="border-b border-line pb-5"><p className="text-sm text-highlight">Studify IA</p><h1 className="mt-1 text-3xl font-semibold">Qual é o próximo passo?</h1><p className="mt-3 text-sm text-muted">Prioridades calculadas a partir do seu objetivo, execução e evidências de aprendizagem.</p></header>{!best ? <div className="py-8"><EmptyState title="Precisamos de contexto para recomendar" description="Defina seu objetivo e adicione matérias. Os registros reais vão tornar as prioridades mais específicas." href={!data.goal ? "/cadastro" : "/materias"} action={!data.goal ? "Criar objetivo" : "Adicionar matérias"} /></div> : <>
    <section className="border-b border-line py-7"><p className="text-xs uppercase tracking-[.16em] text-accent">Próxima ação</p><h2 className="mt-3 text-3xl font-semibold">{best.subject}</h2><p className="mt-2 text-lg text-secondary">{best.nextBlock.topic ?? best.nextBlock.description}</p><p className="mt-3 text-sm text-muted">{best.nextBlock.minutes} minutos sugeridos</p><Link href={`${best.nextBlock.kind === "questions" ? "/questoes" : "/estudos"}?subject=${best.subjectId}${best.nextBlock.topicId ? `&topic=${best.nextBlock.topicId}` : ""}${best.nextBlock.blockId ? `&block=${best.nextBlock.blockId}` : ""}${best.nextBlock.taskId ? `&task=${best.nextBlock.taskId}` : ""}`} className={`${buttonClass} mt-5 inline-block`}>Começar este estudo</Link><ul className="mt-6 space-y-2 text-sm leading-6 text-secondary">{best.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>{mode === "cloud" && <button disabled={busy} className={`${secondaryButtonClass} mt-5`} onClick={async () => {
      setBusy(true); setMessage("");
      try { const { data: auth } = await getSupabaseClient().auth.getSession(); const response = await fetch("/api/study-explanation", { method: "POST", headers: { Authorization: `Bearer ${auth.session?.access_token ?? ""}` } }); const result = await response.json(); if (!response.ok) { setMessage(result.error ?? "Tente novamente."); return; } setExplanation(result.explanation); setSource(result.source); }
      catch { setMessage("Não foi possível obter uma explicação agora."); }
      finally { setBusy(false); }
    }}>{busy ? "Preparando explicação…" : "Explicar esta prioridade"}</button>}{explanation && <div className="mt-5 border-l-2 border-highlight pl-4"><p className="text-xs text-highlight">{source === "llm" ? "Explicação da IA" : "Explicação do motor de prioridades"}</p><p className="mt-2 text-sm leading-6 text-secondary">{explanation}</p></div>}</section>
    <section className="border-b border-line py-6"><h2 className="text-xl font-semibold">Ordem de prioridade</h2><ol className="mt-3 divide-y divide-line">{context.priorities.map((priority, index) => <li key={priority.subjectId} className="py-4"><div className="flex items-center justify-between gap-3"><h3 className="font-medium"><span className="mr-3 font-mono text-sm text-muted">{index + 1}.</span>{priority.subject}</h3><span className="text-sm tabular-nums text-accent">{priority.score.toFixed(1)}/100</span></div><p className="mt-2 text-xs leading-5 text-muted">{priority.evidence.accuracy === null ? "Sem amostra de questões" : `${Math.round(priority.evidence.accuracy * 100)}% em ${priority.evidence.questions} questões`} · {priority.evidence.overdueReviews} revisões atrasadas · {priority.evidence.pendingRecalls} recalls pendentes</p><details className="mt-2 text-xs text-muted"><summary className="cursor-pointer text-accent">Ver evidências</summary><ul className="mt-2 space-y-1">{priority.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></details></li>)}</ol></section>
    <section className="border-b border-line py-6"><h2 className="text-xl font-semibold">Ajuste sugerido no plano</h2><p className="mt-2 text-sm text-muted">{canAdjust ? "Os pendentes de hoje podem seguir a ordem das prioridades atuais. Blocos concluídos e outros dias permanecem como estão." : "Não há mudança de ordem necessária entre os blocos pendentes de hoje."}</p>{canAdjust && <button className={`${secondaryButtonClass} mt-4`} onClick={() => setPreview(!preview)}>{preview ? "Fechar prévia" : "Revisar sugestão"}</button>}{preview && canAdjust && <div className="mt-4"><ol className="space-y-2 text-sm text-secondary">{ordered.map((block, index) => <li key={block.id}>{index + 1}. {data.subjects.find((subject) => subject.id === block.subjectId)?.name} · {block.minutes} min</li>)}</ol><button disabled={saving} className={`${buttonClass} mt-4`} onClick={async () => { let index = 0; const saved = await updateStudyData((current) => ({ ...current, blocks: current.blocks.map((block) => block.date === today && !block.done ? ordered[index++] : block) })); if (saved) { setPreview(false); setMessage("Ordem dos pendentes atualizada."); } }}>Aplicar esta ordem</button></div>}</section>
    <p className="mt-5 text-xs leading-5 text-muted">Motor {context.engineVersion}. Pesos, prazo da prova, execução, amostra de questões, acertos, revisões, recalls, recência e tendência compõem a pontuação. Dados ausentes não são tratados como desempenho zero. A explicação não altera os registros.</p>
  </>}<p role="status" className="mt-4 text-sm text-accent">{message}</p></div></AppShell>;
}
