"use client";

import { useState } from "react";
import { BookOpen, Check, Pencil, Plus, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { EmptyState, buttonClass, inputClass, secondaryButtonClass, subjectStyles } from "@/components/study-ui";
import { subjectColors, subjectSchema, topicSchema, type Subject } from "@/lib/study-data";
import { useStudyData, updateStudyData } from "@/lib/study-store";

export default function MateriasPage() {
  const { data, saving } = useStudyData();
  const [editing, setEditing] = useState<Subject | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  const [color, setColor] = useState<Subject["color"]>("blue");
  const [topicDrafts, setTopicDrafts] = useState<Record<string, string>>({});
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicTitle, setEditingTopicTitle] = useState("");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  function edit(subject: Subject | null) { setEditing(subject); setName(subject?.name ?? ""); setWeight(String(subject?.weight ?? 1)); setColor(subject?.color ?? "blue"); setShowForm(true); }
  return <AppShell><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-muted">Conteúdo do seu objetivo</p><h1 className="mt-1 text-3xl font-semibold">Matérias e tópicos</h1><p className="mt-2 text-sm text-muted">Pesos maiores dão mais prioridade no plano. O desempenho vem das sessões e das questões.</p></div>{data.goal && <button onClick={() => edit(null)} className={`${buttonClass} flex items-center gap-2`}><Plus size={17} />Nova matéria</button>}</header>
    {!data.goal ? <div className="mt-8"><EmptyState title="Defina seu objetivo primeiro" description="A prova e o prazo dão contexto às matérias e às recomendações." href="/cadastro" action="Criar objetivo" /></div> : <>
      {showForm && <form className="mt-6 border-y border-line py-5" onSubmit={async (event) => {
        event.preventDefault();
        const result = subjectSchema.safeParse({ id: editing?.id ?? crypto.randomUUID(), name, weight: Number(weight), color });
        if (!result.success) { setMessage("Informe o nome e um peso entre 0,1 e 100."); return; }
        if (data.subjects.some((subject) => subject.id !== editing?.id && subject.name.toLocaleLowerCase() === result.data.name.toLocaleLowerCase())) { setMessage("Essa matéria já existe no objetivo."); return; }
        const saved = await updateStudyData((current) => ({ ...current, subjects: editing ? current.subjects.map((subject) => subject.id === editing.id ? result.data : subject) : [...current.subjects, result.data] }));
        if (saved) { setShowForm(false); setMessage("Matéria salva."); }
      }}><h2 className="mb-3 font-semibold">{editing ? "Editar matéria" : "Nova matéria"}</h2><div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]"><label className="text-sm text-secondary">Nome<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={inputClass} /></label><label className="text-sm text-secondary">Peso<input type="number" required min={0.1} max={100} step={0.1} value={weight} onChange={(event) => setWeight(event.target.value)} className={inputClass} /></label><label className="text-sm text-secondary">Cor<select value={color} onChange={(event) => setColor(event.target.value as Subject["color"])} className={inputClass}>{subjectColors.map((value, index) => <option key={value} value={value}>{["Azul","Violeta","Laranja","Verde","Âmbar","Rosa"][index]}</option>)}</select></label></div><div className="mt-4 flex gap-2"><button disabled={saving} className={buttonClass}>Salvar matéria</button><button type="button" onClick={() => setShowForm(false)} className={secondaryButtonClass}>Cancelar</button></div></form>}
      <label className="mt-6 block max-w-md text-sm text-muted">Buscar matéria ou tópico<input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Nome da matéria ou tópico" /></label>
      <p role="status" className="mt-3 text-sm text-accent">{message}</p>
      <div className="mt-3 divide-y divide-line">{data.subjects.filter((subject) => subject.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()) || data.topics.some((topic) => topic.subjectId === subject.id && topic.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()))).map((subject) => {
        const topics = data.topics.filter((topic) => topic.subjectId === subject.id);
        return <section key={subject.id} className="py-5"><div className="flex items-center justify-between gap-3"><div className={`flex items-center gap-3 ${subjectStyles[subject.color]}`}><BookOpen size={20} /><h2 className="text-xl font-semibold">{subject.name}</h2><span className="text-xs text-muted">Peso {subject.weight}</span></div><button aria-label={`Editar ${subject.name}`} onClick={() => edit(subject)} className="rounded-md p-2 text-muted"><Pencil size={16} /></button></div><ul className="mt-3 space-y-1">{topics.map((topic) => <li key={topic.id} className="flex items-center gap-2 py-2 text-sm">
          <button disabled={saving || editingTopicId === topic.id} aria-label={`${topic.completed ? "Marcar como pendente" : "Concluir"}: ${topic.title}`} aria-pressed={topic.completed} onClick={() => void updateStudyData((current) => ({ ...current, topics: current.topics.map((item) => item.id === topic.id ? { ...item, completed: !item.completed } : item) }))} className={`rounded-sm border p-1 ${topic.completed ? "border-success text-success" : "border-line text-muted"}`}><Check size={14} /></button>
          {editingTopicId === topic.id ? (
            <form className="flex min-w-0 flex-1 items-center gap-2" onSubmit={async (event) => {
              event.preventDefault();
              const parsed = topicSchema.safeParse({ ...topic, title: editingTopicTitle });
              if (!parsed.success) { setMessage("O tópico precisa ter um título entre 1 e 200 caracteres."); return; }
              const saved = await updateStudyData((current) => ({ ...current, topics: current.topics.map((item) => item.id === topic.id ? parsed.data : item) }));
              if (saved) { setEditingTopicId(null); setEditingTopicTitle(""); setMessage("Tópico atualizado."); }
            }}>
              <input autoFocus maxLength={200} value={editingTopicTitle} onChange={(event) => setEditingTopicTitle(event.target.value)} className={`${inputClass} mt-0 min-w-0 flex-1`} aria-label={`Editar tópico ${topic.title}`} />
              <button disabled={saving} className="rounded-md border border-success p-2 text-success" aria-label="Salvar tópico"><Check size={15} /></button>
              <button type="button" onClick={() => { setEditingTopicId(null); setEditingTopicTitle(""); }} className="rounded-md border border-line p-2 text-muted" aria-label="Cancelar edição"><X size={15} /></button>
            </form>
          ) : (
            <>
              <span className={`min-w-0 flex-1 truncate ${topic.completed ? "text-muted" : "text-secondary"}`}>{topic.title}</span>
              {topic.completed && <span className="text-xs text-success">Concluído</span>}
              <button type="button" disabled={saving} onClick={() => { setEditingTopicId(topic.id); setEditingTopicTitle(topic.title); }} className="rounded-md p-2 text-muted hover:bg-raised hover:text-foreground" aria-label={`Editar tópico ${topic.title}`}><Pencil size={15} /></button>
            </>
          )}
        </li>)}</ul><form className="mt-3 flex max-w-xl gap-2" onSubmit={async (event) => { event.preventDefault(); const title = topicDrafts[subject.id]?.trim(); if (!title) return; const saved = await updateStudyData((current) => ({ ...current, topics: [...current.topics, { id: crypto.randomUUID(), subjectId: subject.id, title, completed: false }] })); if (saved) setTopicDrafts({ ...topicDrafts, [subject.id]: "" }); }}><input aria-label={`Novo tópico de ${subject.name}`} required maxLength={200} value={topicDrafts[subject.id] ?? ""} onChange={(event) => setTopicDrafts({ ...topicDrafts, [subject.id]: event.target.value })} placeholder="Adicionar tópico" className={`${inputClass} mt-0`} /><button disabled={saving} className={secondaryButtonClass}>Adicionar</button></form></section>;
      })}</div>{data.subjects.length === 0 && !showForm && <p className="mt-6 text-muted">Adicione a primeira matéria para começar a montar seu plano.</p>}
    </>}
  </AppShell>;
}
