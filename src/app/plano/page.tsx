"use client";

import Link from "next/link";
import { useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, Clock3, GripVertical, ListFilter, Pencil, Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PlanBlockEditor } from "@/components/plan-block-editor";
import { EmptyState, buttonClass, subjectStyles, timeLabel } from "@/components/study-ui";
import { addDays, weekDates, movePlanBlock, balancePlanBlocks, type PlanBlock } from "@/lib/study-data";
import { useStudyData, updateStudyData } from "@/lib/study-store";

const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const dragType = "application/x-studify-plan";

export default function PlanoPage() {
  const { data, saving } = useStudyData();
  const [baseWeek] = useState(() => weekDates(new Date()).start);
  const [offset, setOffset] = useState(0);
  const start = addDays(baseWeek, offset * 7);
  const dates = dayNames.map((_, index) => addDays(start, index));
  const blocks = data.blocks.filter((block) => block.date >= start && block.date <= dates[6]);
  const [editor, setEditor] = useState<PlanBlock | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [undo, setUndo] = useState<PlanBlock[] | null>(null);
  async function commit(next: PlanBlock[], message: string) {
    const previous = data.blocks;
    if (await updateStudyData((current) => ({ ...current, blocks: next }))) { setUndo(previous); setNotice(message); return true; }
    return false;
  }
  function addBlock(date: string, subjectId = data.subjects[0]?.id) {
    if (!subjectId) return;
    setEditor({ id: crypto.randomUUID(), date, subjectId, topicId: null, minutes: 45, description: "", done: false, plannedQuestions: 0, sessionType: "study" });
  }
  function startDrag(event: DragEvent, payload: { id: string } | { subjectId: string }) {
    event.dataTransfer.setData(dragType, JSON.stringify(payload));
    event.dataTransfer.effectAllowed = "id" in payload ? "move" : "copy";
  }
  function drop(event: DragEvent, date: string, beforeId?: string) {
    event.preventDefault(); event.stopPropagation(); setDropDay(null);
    if (saving) return;
    try { const payload = JSON.parse(event.dataTransfer.getData(dragType)); if (typeof payload.id === "string") void commit(movePlanBlock(data.blocks, payload.id, date, beforeId), "Bloco movido."); else if (data.subjects.some((subject) => subject.id === payload.subjectId)) addBlock(date, payload.subjectId); }
    catch { setNotice("Arraste uma matéria ou um bloco deste plano."); }
  }
  return <AppShell><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-accent">Planejamento semanal</p><h1 className="mt-1 text-3xl font-semibold">Seu plano</h1><p className="mt-2 text-sm text-muted">Organize a sequência, o tempo e o conteúdo de cada dia.</p></div>{data.subjects.length > 0 && <button onClick={() => addBlock(start)} className={`${buttonClass} flex items-center gap-2`}><Plus size={18} />Novo bloco</button>}</header>
    {!data.goal || !data.subjects.length ? <div className="mt-8"><EmptyState title="Comece pelo conteúdo" description="Defina seu objetivo e adicione matérias antes de distribuir seus blocos." href={!data.goal ? "/cadastro" : "/materias"} action={!data.goal ? "Criar objetivo" : "Adicionar matérias"} /></div> : <>
      <section aria-label="Resumo da semana" className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-line py-4"><div className="flex items-center gap-3"><button aria-label="Semana anterior" onClick={() => setOffset(offset - 1)} className="rounded-md p-2"><ChevronLeft size={18} /></button><div className="text-center"><h2 className="text-sm font-semibold">{dates[0].split('-').reverse().join('/')} — {dates[6].split('-').reverse().join('/')}</h2><p className="text-xs text-muted">Domingo a sábado</p></div><button aria-label="Próxima semana" onClick={() => setOffset(offset + 1)} className="rounded-md p-2"><ChevronRight size={18} /></button></div><div className="flex gap-4 text-sm"><span className="text-accent">{timeLabel(blocks.reduce((sum, block) => sum + block.minutes * 60, 0))}</span><span className="text-success">{blocks.filter((block) => block.done).length}/{blocks.length} concluídos</span></div></section>
      <section aria-label="Matérias disponíveis" className="mt-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold">Adicionar matérias</h2><p className="text-xs text-muted">Arraste para um dia ou clique para configurar.</p></div><div className="mt-3 flex flex-wrap gap-2">{data.subjects.map((subject) => <button key={subject.id} draggable onDragStart={(event) => startDrag(event, { subjectId: subject.id })} onDragEnd={() => setDropDay(null)} onClick={() => addBlock(start, subject.id)} className={`flex items-center gap-2 rounded-md border border-line border-l-2 px-3 py-2 text-sm ${subjectStyles[subject.color]}`}><BookOpen size={16} />{subject.name}<GripVertical size={14} /></button>)}</div></section>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted">Arraste para mover e reordenar. No celular, use “Mover para”.</p><button disabled={saving || !blocks.some((block) => !block.done)} onClick={() => {
        void commit(balancePlanBlocks(data.blocks, start), "Pendentes distribuídos para equilibrar o tempo. Concluídos preservados.");
      }} className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs text-highlight disabled:opacity-40"><ListFilter size={15} />Equilibrar semana</button></div>
      <div className="mt-3 flex min-h-6 gap-3 text-sm"><p role="status" className="text-success">{notice}</p>{undo && <button disabled={saving} onClick={async () => { if (await updateStudyData((current) => ({ ...current, blocks: undo }))) { setUndo(null); setNotice("Alteração desfeita."); } }} className="text-accent underline">Desfazer</button>}</div>
      <section aria-label="Agenda semanal" className="mt-4 grid gap-x-5 gap-y-8 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">{dayNames.map((day, index) => {
        const date = dates[index]; const daily = blocks.filter((block) => block.date === date);
        return <section key={date} aria-label={day} onDragOver={(event) => { if (event.dataTransfer.types.includes(dragType)) { event.preventDefault(); setDropDay(date); } }} onDrop={(event) => drop(event, date)} className={`min-w-0 border-t-2 pt-3 ${dropDay === date ? "border-accent bg-accent-subtle" : "border-line"}`}><div className="mb-4 flex items-center justify-between"><div><h3 className="font-semibold">{day} <span className="ml-1 text-xs text-muted">{date.slice(8)}/{date.slice(5, 7)}</span></h3><p className="mt-1 text-xs text-muted">{timeLabel(daily.reduce((sum, block) => sum + block.minutes * 60, 0))}</p></div><button onClick={() => addBlock(date)} aria-label={`Adicionar bloco em ${day}`} className="rounded-md p-2 text-accent"><Plus size={18} /></button></div><div className="min-h-24 space-y-3">{daily.map((block, position) => {
          const subject = data.subjects.find((subject) => subject.id === block.subjectId)!;
          const topic = data.topics.find((topic) => topic.id === block.topicId);
          return <article key={block.id} draggable onDragStart={(event) => startDrag(event, { id: block.id })} onDragEnd={() => setDropDay(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, date, block.id)} className={`rounded-md border-l-2 bg-surface p-3 ${subjectStyles[subject.color]}`}><div className="flex items-start justify-between gap-2"><h4 className="min-w-0 break-words text-sm font-semibold">{subject.name}</h4><GripVertical size={16} className="shrink-0 cursor-grab text-muted" /></div>{topic && <p className="mt-1 text-xs text-secondary">{topic.title}</p>}<p className="mt-2 flex items-center gap-1 text-xs text-muted"><Clock3 size={13} />{block.minutes} min{block.plannedQuestions > 0 && ` · ${block.plannedQuestions} questões`}</p>{block.description && <p className="mt-3 whitespace-pre-wrap break-words text-xs leading-5 text-secondary">{block.description}</p>}<div className="mt-3 flex justify-between border-t border-line pt-2"><button disabled={saving} aria-pressed={block.done} onClick={() => void commit(data.blocks.map((item) => item.id === block.id ? { ...item, done: !item.done } : item), "Status do bloco atualizado; tempo de estudo depende de uma sessão registrada.")} className={`flex items-center gap-1 rounded-sm px-1 py-2 text-xs ${block.done ? "text-success" : "text-muted"}`}><Check size={14} />{block.done ? "Concluído" : "Concluir"}</button><div className="flex"><button aria-label={`Editar ${subject.name} em ${day}`} onClick={() => setEditor(block)} className="rounded-sm p-2 text-secondary"><Pencil size={14} /></button><button disabled={saving} aria-label={`Excluir ${subject.name} de ${day}`} onClick={() => void commit(data.blocks.filter((item) => item.id !== block.id), "Bloco removido.")} className="rounded-sm p-2 text-muted"><Trash2 size={14} /></button></div></div><div className="mt-2 flex items-end gap-2"><label className="min-w-0 flex-1 text-xs text-muted">Mover para<select disabled={saving} value={block.date} onChange={(event) => void commit(movePlanBlock(data.blocks, block.id, event.target.value), "Bloco movido.")} className="mt-1 w-full rounded-sm border border-line bg-background px-2 py-2 text-xs text-secondary">{dayNames.map((name, i) => <option key={name} value={dates[i]}>{name}</option>)}</select></label><button disabled={saving || position === 0} aria-label={`Mover ${subject.name} para cima`} onClick={() => void commit(movePlanBlock(data.blocks, block.id, date, daily[position - 1].id), "Ordem atualizada.")} className="rounded-sm p-2 text-muted disabled:opacity-30"><ArrowUp size={14} /></button><button disabled={saving || position === daily.length - 1} aria-label={`Mover ${subject.name} para baixo`} onClick={() => void commit(movePlanBlock(data.blocks, daily[position + 1].id, date, block.id), "Ordem atualizada.")} className="rounded-sm p-2 text-muted disabled:opacity-30"><ArrowDown size={14} /></button></div>{!block.done && <Link href={block.sessionType === "questions" ? `/questoes?subject=${block.subjectId}&block=${block.id}` : `/estudos?block=${block.id}`} className="mt-3 block text-xs text-accent">Começar bloco →</Link>}</article>;
        })}{!daily.length && <button onClick={() => addBlock(date)} className="min-h-24 w-full rounded-md border border-dashed border-line text-xs text-muted">+ Adicionar primeiro bloco</button>}</div></section>;
      })}</section>
      {editor && <PlanBlockEditor block={editor} onClose={() => setEditor(null)} onSave={async (block) => { const next = data.blocks.some((item) => item.id === block.id) ? data.blocks.map((item) => item.id === block.id ? block : item) : [...data.blocks, block]; if (await commit(next, "Bloco salvo.")) setEditor(null); }} />}
    </>}
  </AppShell>;
}
