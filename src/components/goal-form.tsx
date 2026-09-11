"use client";

import { useState } from "react";
import { goalSchema } from "@/lib/study-data";
import { useStudyData, updateStudyData } from "@/lib/study-store";
import { buttonClass, inputClass } from "./study-ui";

export function GoalForm({ onSaved }: { onSaved?: () => void }) {
  const { data, saving } = useStudyData();
  const [name, setName] = useState(data.profileName);
  const [title, setTitle] = useState(data.goal?.title ?? "");
  const [examDate, setExamDate] = useState(data.goal?.examDate ?? "");
  const [weeklyMinutes, setWeeklyMinutes] = useState(String(data.goal?.weeklyMinutes ?? 600));
  const [message, setMessage] = useState("");
  return <form className="max-w-xl space-y-4" onSubmit={async (event) => {
    event.preventDefault();
    const result = goalSchema.safeParse({ id: data.goal?.id ?? crypto.randomUUID(), title, examDate: examDate || null, weeklyMinutes: Number(weeklyMinutes) });
    if (!result.success) { setMessage("Confira o objetivo, a data e a meta semanal (10 a 10080 minutos)."); return; }
    const saved = await updateStudyData((current) => ({ ...current, profileName: name.trim(), goal: result.data }));
    if (saved) { setMessage("Objetivo salvo."); onSaved?.(); }
  }}>
    <label className="block text-sm text-secondary">Como podemos te chamar?<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label>
    <label className="block text-sm text-secondary">Objetivo ou prova<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: Concurso Dataprev" className={inputClass} /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm text-secondary">Data da prova (opcional)<input type="date" value={examDate} onChange={(event) => setExamDate(event.target.value)} className={inputClass} /></label>
      <label className="block text-sm text-secondary">Meta semanal (minutos)<input type="number" required min={10} max={10080} step={1} value={weeklyMinutes} onChange={(event) => setWeeklyMinutes(event.target.value)} className={inputClass} /></label>
    </div>
    <p className="text-xs text-muted">Use um prazo realista. Você poderá ajustar o objetivo e os pesos das matérias depois.</p>
    <button disabled={saving} className={buttonClass}>{saving ? "Salvando…" : "Salvar objetivo"}</button>
    <p role="status" className="text-sm text-accent">{message}</p>
  </form>;
}
