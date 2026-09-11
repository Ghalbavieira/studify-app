"use client";

import { useMemo, useState } from "react";
import { FileText, Plus, Sparkles, Trash2, Upload } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { buttonClass, inputClass, secondaryButtonClass } from "@/components/study-ui";
import { getSupabaseClient } from "@/lib/supabase/client";
import { subjectColors, type Subject } from "@/lib/study-data";
import { updateStudyData, useStudyData } from "@/lib/study-store";

type ExtractedSubject = { name: string; weight: number | null; questionCount: number | null; topics: string[]; sourcePages: number[] };
type Extraction = { title: string; board: string; organization: string; role: string; examDate: string | null; questionsTotal: number | null; cutoffScore: number | null; subjects: ExtractedSubject[]; warnings: string[] };
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

export default function EditalPage() {
  const { data, mode, saving } = useStudyData();
  const [file, setFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [title, setTitle] = useState(data.goal?.title ?? "");
  const [board, setBoard] = useState(data.goal?.board ?? "");
  const [organization, setOrganization] = useState(data.goal?.organization ?? "");
  const [role, setRole] = useState(data.goal?.role ?? "");
  const [examDate, setExamDate] = useState(data.goal?.examDate ?? "");
  const [questionsTotal, setQuestionsTotal] = useState(data.goal?.questionsTotal ? String(data.goal.questionsTotal) : "");
  const [cutoffScore, setCutoffScore] = useState(data.goal?.cutoffScore != null ? String(data.goal.cutoffScore) : "");
  const [subjects, setSubjects] = useState<ExtractedSubject[]>(() => data.subjects.map((subject) => ({ name: subject.name, weight: subject.weight, questionCount: subject.questionCount ?? null, topics: data.topics.filter((topic) => topic.subjectId === subject.id).map((topic) => topic.title), sourcePages: [] })));
  const topicCount = useMemo(() => subjects.reduce((sum, subject) => sum + subject.topics.filter(Boolean).length, 0), [subjects]);

  function applyExtraction(extraction: Extraction) {
    setTitle(extraction.title || title); setBoard(extraction.board); setOrganization(extraction.organization); setRole(extraction.role);
    setExamDate(extraction.examDate ?? ""); setQuestionsTotal(extraction.questionsTotal == null ? "" : String(extraction.questionsTotal)); setCutoffScore(extraction.cutoffScore == null ? "" : String(extraction.cutoffScore));
    setSubjects(extraction.subjects); setWarnings(extraction.warnings);
  }

  async function extract() {
    if (!file) { setMessage("Selecione o PDF do edital."); return; }
    if (mode !== "cloud") { setMessage("Entre na sua conta para usar a extração automática do PDF. Você ainda pode preencher os dados manualmente abaixo."); return; }
    setExtracting(true); setMessage(""); setWarnings([]);
    try {
      const { data: sessionData } = await getSupabaseClient().auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) { setMessage("Sua sessão expirou. Entre novamente."); return; }
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/exam-import", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: form });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error ?? "Não foi possível analisar o edital."); return; }
      applyExtraction(body.extraction as Extraction);
      setMessage("Extração concluída. Revise tudo antes de salvar — a IA não altera seu plano sem sua confirmação.");
    } catch { setMessage("Falha ao enviar o PDF. Tente novamente."); }
    finally { setExtracting(false); }
  }

  function updateSubject(index: number, patch: Partial<ExtractedSubject>) { setSubjects((current) => current.map((subject, subjectIndex) => subjectIndex === index ? { ...subject, ...patch } : subject)); }

  async function save() {
    if (!title.trim()) { setMessage("Informe o nome do concurso/objetivo."); return; }
    if (subjects.some((subject) => !subject.name.trim())) { setMessage("Todas as matérias precisam ter nome."); return; }
    const saved = await updateStudyData((current) => {
      const existingSubjectsByName = new Map(current.subjects.map((subject) => [normalize(subject.name), subject]));
      const importedSubjects: Subject[] = [];
      const nextTopics = [...current.topics];
      subjects.forEach((subject, index) => {
        const existing = existingSubjectsByName.get(normalize(subject.name));
        const id = existing?.id ?? crypto.randomUUID();
        importedSubjects.push({ id, name: subject.name.trim(), weight: subject.weight ?? existing?.weight ?? 1, questionCount: subject.questionCount ?? existing?.questionCount, color: existing?.color ?? subjectColors[index % subjectColors.length] });
        const existingTopicNames = new Set(nextTopics.filter((topic) => topic.subjectId === id).map((topic) => normalize(topic.title)));
        for (const topicTitle of subject.topics.map((topic) => topic.trim()).filter(Boolean)) if (!existingTopicNames.has(normalize(topicTitle))) { nextTopics.push({ id: crypto.randomUUID(), subjectId: id, title: topicTitle, completed: false }); existingTopicNames.add(normalize(topicTitle)); }
      });
      const untouchedSubjects = current.subjects.filter((subject) => !subjects.some((incoming) => normalize(incoming.name) === normalize(subject.name)));
      return {
        ...current,
        goal: { id: current.goal?.id ?? crypto.randomUUID(), title: title.trim(), examDate: examDate || null, weeklyMinutes: current.goal?.weeklyMinutes ?? 600, board: board.trim(), organization: organization.trim(), role: role.trim(), questionsTotal: questionsTotal ? Number(questionsTotal) : undefined, cutoffScore: cutoffScore ? Number(cutoffScore) : null },
        subjects: [...untouchedSubjects, ...importedSubjects],
        topics: nextTopics,
      };
    });
    if (saved) setMessage("Edital revisado e aplicado ao seu objetivo. Matérias e tópicos já estão disponíveis no Studify.");
  }

  return <AppShell><div className="mx-auto max-w-6xl">
    <header className="border-b border-line pb-6"><p className="text-sm text-accent">Seu edital vira estrutura de estudo</p><h1 className="mt-1 text-3xl font-semibold">Importar edital</h1><p className="mt-2 max-w-3xl text-sm text-muted">Envie o PDF para o Studify propor matérias, tópicos, pesos e informações da prova. Nada é aplicado automaticamente: você revisa e confirma primeiro.</p></header>
    <section className="grid gap-6 border-b border-line py-6 lg:grid-cols-[1.2fr_.8fr]">
      <div className="border border-line bg-surface p-5" style={{ borderRadius: 8 }}><div className="flex items-center gap-3"><Upload className="text-accent" size={20} /><div><h2 className="font-semibold">PDF do edital</h2><p className="text-sm text-muted">Até 20 MB. A extração automática processa editais extensos em blocos e pode levar até alguns minutos no plano gratuito da IA.</p></div></div><label className="mt-5 block text-sm text-secondary">Arquivo PDF<input type="file" accept="application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-2 block w-full rounded-md border border-line bg-background p-3 text-sm" /></label>{file && <p className="mt-2 flex items-center gap-2 text-xs text-muted"><FileText size={14} />{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>}<button disabled={!file || extracting} onClick={() => void extract()} className={`${buttonClass} mt-4 inline-flex items-center gap-2`}><Sparkles size={17} />{extracting ? "Lendo edital em blocos…" : "Extrair informações"}</button></div>
      <div className="border border-line bg-background-secondary p-5" style={{ borderRadius: 8 }}><h2 className="font-semibold">O que será criado</h2><dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><div><dt className="text-xs text-muted">Matérias</dt><dd className="mt-1 text-2xl font-semibold">{subjects.length}</dd></div><div><dt className="text-xs text-muted">Tópicos</dt><dd className="mt-1 text-2xl font-semibold">{topicCount}</dd></div></dl><p className="mt-4 text-xs leading-5 text-muted">Confira cargo/perfil, pesos, questões e tópicos antes de salvar, principalmente em editais com vários cargos ou anexos.</p></div>
    </section>
    {warnings.length > 0 && <section className="border-b border-line py-5"><h2 className="text-sm font-semibold text-attention">Pontos para conferir</h2><ul className="mt-2 space-y-1 text-sm text-muted">{warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul></section>}
    <section className="border-b border-line py-6"><h2 className="text-xl font-semibold">Informações da prova</h2><p className="mt-1 text-sm text-muted">Você pode preencher ou corrigir qualquer campo.</p><div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3"><label className="text-sm text-secondary">Objetivo / concurso<input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} /></label><label className="text-sm text-secondary">Banca<input className={inputClass} value={board} onChange={(e) => setBoard(e.target.value)} /></label><label className="text-sm text-secondary">Órgão / organização<input className={inputClass} value={organization} onChange={(e) => setOrganization(e.target.value)} /></label><label className="text-sm text-secondary">Cargo / perfil<input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} /></label><label className="text-sm text-secondary">Data da prova<input type="date" className={inputClass} value={examDate} onChange={(e) => setExamDate(e.target.value)} /></label><label className="text-sm text-secondary">Total de questões<input type="number" min="0" className={inputClass} value={questionsTotal} onChange={(e) => setQuestionsTotal(e.target.value)} /></label><label className="text-sm text-secondary">Nota/corte mínimo<input type="number" min="0" step="0.1" className={inputClass} value={cutoffScore} onChange={(e) => setCutoffScore(e.target.value)} /></label></div></section>
    <section className="py-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-xl font-semibold">Matérias e conteúdo programático</h2><p className="mt-1 text-sm text-muted">Revise a estrutura extraída. As páginas de origem aparecem quando foram identificadas.</p></div><button onClick={() => setSubjects((current) => [...current, { name: "", weight: 1, questionCount: null, topics: [], sourcePages: [] }])} className={`${secondaryButtonClass} inline-flex items-center gap-2`}><Plus size={16} />Adicionar matéria</button></div><div className="mt-5 divide-y divide-line border-y border-line">{subjects.map((subject, index) => <article key={`${index}-${subject.name}`} className="py-5"><div className="grid gap-3 lg:grid-cols-[2fr_.6fr_.7fr_auto]"><label className="text-xs text-muted">Matéria<input className={inputClass} value={subject.name} onChange={(e) => updateSubject(index, { name: e.target.value })} /></label><label className="text-xs text-muted">Peso<input type="number" min="0.1" step="0.1" className={inputClass} value={subject.weight ?? ""} onChange={(e) => updateSubject(index, { weight: e.target.value ? Number(e.target.value) : null })} /></label><label className="text-xs text-muted">Questões<input type="number" min="0" className={inputClass} value={subject.questionCount ?? ""} onChange={(e) => updateSubject(index, { questionCount: e.target.value ? Number(e.target.value) : null })} /></label><button title="Remover matéria" onClick={() => setSubjects((current) => current.filter((_, i) => i !== index))} className="mt-5 h-10 rounded-md border border-line px-3 text-muted hover:text-error"><Trash2 size={16} /></button></div>{subject.sourcePages.length > 0 && <p className="mt-2 text-xs text-muted">Fonte no PDF: pág. {subject.sourcePages.join(", ")}</p>}<label className="mt-3 block text-xs text-muted">Tópicos — um por linha<textarea rows={Math.min(10, Math.max(3, subject.topics.length + 1))} className={`${inputClass} min-h-24 resize-y`} value={subject.topics.join("\n")} onChange={(e) => updateSubject(index, { topics: e.target.value.split("\n") })} /></label></article>)}</div>{subjects.length === 0 && <p className="mt-5 text-sm text-muted">Nenhuma matéria ainda. Importe o edital ou adicione manualmente.</p>}<div className="mt-6 flex flex-wrap items-center gap-3"><button disabled={saving} onClick={() => void save()} className={buttonClass}>{saving ? "Salvando…" : "Confirmar e criar estrutura"}</button><span role="status" className="text-sm text-accent">{message}</span></div></section>
  </div></AppShell>;
}
