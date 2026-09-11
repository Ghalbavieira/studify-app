"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { completeTask, recordSession, type RecallRating } from "@/lib/study-data";
import { useStudyData, updateStudyData } from "@/lib/study-store";
import { saveActiveStudy, type ActiveStudy } from "@/lib/active-study";
import { buttonClass, inputClass, secondaryButtonClass, timeLabel } from "./study-ui";

export function FinishSession({ active, seconds, onClose, onSaved }: { active: ActiveStudy; seconds: number; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, userId, saving } = useStudyData();
  const [questions, setQuestions] = useState("0");
  const [correct, setCorrect] = useState("0");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(seconds >= active.durationSeconds);
  const [rating, setRating] = useState<RecallRating | "">("");
  const [error, setError] = useState("");
  const task = data.tasks.find((task) => task.id === active.taskId && !task.completedAt);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="finish-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-lg border border-line bg-surface p-6 text-foreground backdrop:bg-background/80"><div className="flex items-center justify-between"><h2 id="finish-title" className="text-xl font-semibold">Registrar sessão</h2><button onClick={onClose} aria-label="Fechar registro" className="rounded-md p-2"><X size={20} /></button></div><p className="mt-2 text-sm text-success">Tempo líquido: {seconds < 60 ? `${seconds} segundos` : timeLabel(seconds)}</p>
    <form className="mt-5 space-y-4" onSubmit={async (event) => {
      event.preventDefault(); const count = Number(questions); const hits = Number(correct);
      if (!Number.isInteger(count) || !Number.isInteger(hits) || count < 0 || hits < 0 || hits > count || count > 100000 || (task && !rating)) { setError("Confira as questões e os acertos; acertos não podem superar o total de questões."); return; }
      const now = new Date();
      const saved = await updateStudyData((current) => {
        let next = recordSession(current, { id: active.id, subjectId: active.subjectId, topicId: active.topicId, blockId: current.blocks.some((block) => block.id === active.blockId) ? active.blockId : null, taskId: active.taskId, startedAt: active.startedAt, endedAt: now.toISOString(), seconds, questions: count, correct: hits, notes }, () => crypto.randomUUID());
        if (done && active.blockId) next = { ...next, blocks: next.blocks.map((block) => block.id === active.blockId ? { ...block, done: true } : block) };
        if (task && rating) next = completeTask(next, task.id, rating, now, () => crypto.randomUUID());
        return next;
      });
      if (saved) { saveActiveStudy(userId, null); onSaved(); }
    }}><div className="grid grid-cols-2 gap-3"><label className="text-sm text-secondary">Questões fora do Studify<input required type="number" min={0} max={100000} step={1} value={questions} onChange={(event) => setQuestions(event.target.value)} className={inputClass} /></label><label className="text-sm text-secondary">Acertos<input required type="number" min={0} max={Number(questions) || 0} step={1} value={correct} onChange={(event) => setCorrect(event.target.value)} className={inputClass} /></label></div><p className="text-xs text-muted">Questões respondidas na tela Questões já são registradas automaticamente. Não as repita aqui.</p><label className="block text-sm text-secondary">O que aprendeu / erros a revisar<textarea maxLength={4000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className={inputClass} /></label>{active.blockId && <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={done} onChange={(event) => setDone(event.target.checked)} />Concluir este bloco do plano</label>}{task && <label className="block text-sm text-secondary">Como foi a recuperação do conteúdo?<select required value={rating} onChange={(event) => setRating(event.target.value as RecallRating)} className={inputClass}><option value="">Selecione</option><option value="difficult">Difícil — revisar amanhã</option><option value="good">Boa — ampliar o intervalo</option><option value="easy">Fácil — ampliar mais o intervalo</option></select></label>}<p role="alert" className="text-sm text-error">{error}</p><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className={secondaryButtonClass}>Voltar</button><button disabled={saving} className={buttonClass}>{saving ? "Salvando…" : "Salvar sessão"}</button></div></form>
  </dialog>;
}
