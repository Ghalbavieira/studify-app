"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { blockSchema, type PlanBlock } from "@/lib/study-data";
import { useStudyData } from "@/lib/study-store";
import { buttonClass, inputClass, secondaryButtonClass } from "./study-ui";

export function PlanBlockEditor({ block, onSave, onClose }: { block: PlanBlock; onSave: (block: PlanBlock) => Promise<void>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, saving } = useStudyData();
  const [draft, setDraft] = useState(block);
  const [minutes, setMinutes] = useState(String(block.minutes));
  const [questions, setQuestions] = useState(String(block.plannedQuestions));
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="block-editor-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-6 text-foreground backdrop:bg-background/80"><div className="flex items-center justify-between gap-4"><h2 id="block-editor-title" className="text-xl font-semibold">Bloco de estudo</h2><button type="button" onClick={onClose} aria-label="Fechar edição" className="rounded-md p-2 text-muted"><X size={20} /></button></div>
    <form className="mt-5 space-y-4" onSubmit={async (event) => { event.preventDefault(); const result = blockSchema.safeParse({ ...draft, minutes: Number(minutes), plannedQuestions: Number(questions) }); if (!result.success) { setError("Confira a data, a duração (1 a 1440 minutos) e a quantidade de questões."); return; } await onSave(result.data); }}>
      <label className="block text-sm text-secondary">Matéria<select autoFocus required value={draft.subjectId} onChange={(event) => setDraft({ ...draft, subjectId: event.target.value, topicId: null })} className={inputClass}>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
      <label className="block text-sm text-secondary">Tópico<select value={draft.topicId ?? ""} onChange={(event) => setDraft({ ...draft, topicId: event.target.value || null })} className={inputClass}><option value="">Sem tópico específico</option>{data.topics.filter((topic) => topic.subjectId === draft.subjectId).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm text-secondary">Dia<input type="date" required value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className={inputClass} /></label><label className="text-sm text-secondary">Tempo (minutos)<input type="number" min={1} max={1440} step={1} required value={minutes} onChange={(event) => setMinutes(event.target.value)} className={inputClass} /></label></div>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm text-secondary">Tipo<select value={draft.sessionType} onChange={(event) => setDraft({ ...draft, sessionType: event.target.value as PlanBlock["sessionType"] })} className={inputClass}><option value="study">Estudo</option><option value="questions">Questões</option><option value="review">Revisão</option><option value="recall">Recall</option></select></label><label className="text-sm text-secondary">Questões previstas<input type="number" min={0} max={100000} step={1} required value={questions} onChange={(event) => setQuestions(event.target.value)} className={inputClass} /></label></div>
      <label className="block text-sm text-secondary">O que estudar<textarea rows={4} maxLength={2000} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} placeholder="Conteúdo, exercícios e resultado esperado." className={inputClass} /></label><p role="alert" className="text-sm text-error">{error}</p><div className="flex justify-end gap-3"><button type="button" onClick={onClose} className={secondaryButtonClass}>Cancelar</button><button disabled={saving} className={buttonClass}>{saving ? "Salvando…" : "Salvar bloco"}</button></div>
    </form>
  </dialog>;
}
