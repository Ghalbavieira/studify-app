"use client";

import { useState } from "react";
import { useStudyData } from "@/lib/study-store";
import { useSocial } from "@/lib/social-store";
import type { PostDraft, SocialMedia } from "@/lib/social";
import { buttonClass, inputClass } from "../study-ui";
import { UserAvatar } from "./user-avatar";
import { MediaUpload } from "./media-upload";

export function PostComposer({ onPublish, reply = false, groupId = null }: { onPublish: (draft: PostDraft) => void; reply?: boolean; groupId?: string | null }) {
  const { me } = useSocial();
  const { data } = useStudyData();
  const [text, setText] = useState("");
  const [media, setMedia] = useState<SocialMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [objective, setObjective] = useState(false);
  const [error, setError] = useState("");
  return <form className="border-b border-line py-5" onSubmit={(event) => {
    event.preventDefault();
    if (busy || (!text.trim() && !media)) return;
    try {
      onPublish({ text: text.trim(), media, subject: data.subjects.find((subject) => subject.id === subjectId)?.name ?? null, topic: data.topics.find((topic) => topic.id === topicId)?.title ?? null, objective: objective ? data.goal?.title ?? null : null, metrics: null, groupId });
      setText(""); setMedia(null); setSubjectId(""); setTopicId(""); setObjective(false); setError("");
    } catch { setError("Não foi possível salvar. O armazenamento local pode estar cheio ou indisponível."); }
  }}>
    <div className="flex gap-3"><UserAvatar profile={me} /><div className="min-w-0 flex-1"><label className="sr-only" htmlFor={reply ? "reply-text" : "post-text"}>{reply ? "Sua resposta" : "O que você estudou hoje?"}</label><textarea id={reply ? "reply-text" : "post-text"} value={text} maxLength={1000} onChange={(event) => setText(event.target.value)} placeholder={reply ? "Contribua com a conversa…" : "O que você estudou hoje?"} rows={3} className="w-full resize-y rounded-md bg-transparent px-1 py-2 text-base placeholder:text-muted" />
    {!reply && <details className="mb-3 text-sm text-muted"><summary className="cursor-pointer py-2">Relacionar aos meus estudos</summary><div className="grid gap-3 py-2 sm:grid-cols-2"><label>Matéria<select value={subjectId} onChange={(event) => { setSubjectId(event.target.value); setTopicId(""); }} className={inputClass}><option value="">Sem matéria</option>{data.subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>Tópico<select disabled={!subjectId} value={topicId} onChange={(event) => setTopicId(event.target.value)} className={inputClass}><option value="">Sem tópico</option>{data.topics.filter((topic) => topic.subjectId === subjectId).map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}</select></label></div>{data.goal && <label className="flex items-center gap-2 py-2"><input type="checkbox" checked={objective} onChange={(event) => setObjective(event.target.checked)} />{data.goal.title}</label>}</details>}
    <MediaUpload media={media} onChange={setMedia} onBusy={setBusy} />
    <div className="mt-3 flex items-center justify-end gap-4"><span className={`text-xs ${text.length >= 950 ? "text-attention" : "text-muted"}`}>{text.length}/1000</span><button disabled={busy || (!text.trim() && !media)} className={buttonClass}>{busy ? "Carregando imagem…" : reply ? "Responder" : "Publicar"}</button></div>
    {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}
    </div></div>
  </form>;
}
