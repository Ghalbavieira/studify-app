"use client";

import { useState } from "react";
import Link from "next/link";
import { useCommunity } from "@/lib/community-store";
import { kindLabels, visibilityLabels, type CommunityPost } from "@/lib/community";
import { useStudyData } from "@/lib/study-store";
import { calculateMetrics } from "@/lib/priority-engine";
import { buttonClass, inputClass, secondaryButtonClass, timeLabel } from "./study-ui";

export function CommunityNotice() {
  return <p className="my-5 border-l-2 border-accent pl-3 text-sm leading-relaxed text-muted">Comunidade em demonstração. Criar, entrar e publicar salva apenas neste navegador, separado por conta. Nenhum conteúdo é enviado a outras pessoas; a visibilidade ainda não representa uma permissão no servidor.</p>;
}

export function CommunityFeed({ posts }: { posts: CommunityPost[] }) {
  if (!posts.length) return <p className="py-6 text-sm text-muted">Nenhuma publicação por aqui ainda.</p>;
  return <div className="divide-y divide-line">{posts.map((post) => (
    <article key={post.id} className="py-5">
      <p className="text-xs text-muted">{post.authorName} · {kindLabels[post.kind]} · {visibilityLabels[post.visibility]}{post.demo && " · Exemplo"}</p>
      <h3 className="mt-2 font-semibold">{post.title}</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-secondary">{post.body}</p>
      {post.progress && <p className="mt-3 text-sm text-accent">{timeLabel(post.progress.seconds)} estudados · {post.progress.execution === null ? "sem tempo planejado na semana" : `${Math.round(post.progress.execution * 100)}% do tempo planejado na semana`}</p>}
      <time dateTime={post.createdAt} className="mt-3 block text-xs text-muted">{new Date(post.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
      {post.groupId && <Link href={`/comunidade/${post.groupId}`} className="mt-2 inline-block text-xs text-accent">Ver grupo</Link>}
    </article>
  ))}</div>;
}

export function ShareForm({ groupId, onClose }: { groupId?: string; onClose: () => void }) {
  const community = useCommunity();
  const { data } = useStudyData();
  const [kind, setKind] = useState<"note" | "summary" | "progress" | "session">("note");
  const [visibility, setVisibility] = useState<CommunityPost["visibility"]>(groupId ? "group" : "private");
  const [target, setTarget] = useState(groupId ?? "");
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const groups = community.data.groups.filter((group) => community.data.members.some((member) => member.groupId === group.id && member.userId === community.userId));
  return <form className="my-5 space-y-4 border-y border-line py-5" onSubmit={(event) => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    if (visibility === "group" && !groups.some((group) => group.id === target)) { setError("Escolha um grupo do qual você participa."); return; }
    const session = data.sessions.find((item) => item.id === sessionId);
    if (kind === "session" && !session) { setError("Escolha uma sessão concluída."); return; }
    const metrics = calculateMetrics(data);
    const progress = kind === "progress" ? { seconds: metrics.executedSeconds, plannedSeconds: metrics.plannedSeconds, execution: metrics.plannedSeconds ? metrics.executedSeconds / metrics.plannedSeconds : null } : null;
    try {
      community.update((current) => ({ ...current, posts: [...current.posts, {
        id: crypto.randomUUID(), authorId: community.userId, authorName: community.name,
        groupId: visibility === "group" ? target : groupId ?? null, kind, visibility,
        title: String(fields.get("title")).trim(), body: `${String(fields.get("body")).trim()}${session && kind === "session" ? `\nSessão concluída: ${timeLabel(session.seconds)} · ${data.subjects.find((subject) => subject.id === session.subjectId)?.name ?? "Estudo"}.` : ""}`,
        createdAt: new Date().toISOString(), demo: false, progress, sessionId: kind === "session" ? sessionId : null,
      }] }));
      onClose();
    } catch { setError("Não foi possível salvar. Verifique o armazenamento do navegador e os campos."); }
  }}>
    <h3 className="font-semibold">Compartilhar um registro</h3>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Conteúdo<select className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as typeof kind)}>{(["note", "summary", "progress", "session"] as const).map((value) => <option key={value} value={value}>{kindLabels[value]}</option>)}</select></label>
      <label className="text-sm">Visibilidade<select className={inputClass} value={visibility} onChange={(event) => setVisibility(event.target.value as typeof visibility)}>{Object.entries(visibilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {visibility === "group" && <label className="block text-sm">Grupo<select required className={inputClass} value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Escolha um grupo</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
    {kind === "session" && <label className="block text-sm">Sessão concluída<select required className={inputClass} value={sessionId} onChange={(event) => setSessionId(event.target.value)}><option value="">Escolha uma sessão</option>{data.sessions.map((session) => <option key={session.id} value={session.id}>{data.subjects.find((subject) => subject.id === session.subjectId)?.name} · {timeLabel(session.seconds)} · {new Date(session.endedAt).toLocaleDateString("pt-BR")}</option>)}</select></label>}
    {kind === "progress" && <p className="text-sm text-muted">Será salvo um retrato do tempo executado e planejado nesta semana, calculado a partir dos seus estudos.</p>}
    <label className="block text-sm">Título<input name="title" required maxLength={160} className={inputClass} /></label>
    <label className="block text-sm">Texto<textarea name="body" required={kind === "note" || kind === "summary"} maxLength={4500} rows={4} className={inputClass} /></label>
    {error && <p role="alert" className="text-sm text-error">{error}</p>}
    <div className="flex gap-3"><button className={buttonClass}>Salvar publicação local</button><button type="button" className={secondaryButtonClass} onClick={onClose}>Cancelar</button></div>
  </form>;
}
