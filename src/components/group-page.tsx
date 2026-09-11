"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "./app-shell";
import { CommunityFeed, CommunityNotice, ShareForm } from "./community-ui";
import { buttonClass, secondaryButtonClass, timeLabel } from "./study-ui";
import { useCommunity } from "@/lib/community-store";
import { visiblePosts } from "@/lib/community";

export function GroupPage({ groupId }: { groupId: string }) {
  const community = useCommunity();
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const group = community.data.groups.find((item) => item.id === groupId);
  const members = community.data.members.filter((member) => member.groupId === groupId);
  const joined = members.some((member) => member.userId === community.userId);
  const posts = visiblePosts(community.data, community.userId, groupId);
  const latestProgress = new Map<string, NonNullable<(typeof posts)[number]["progress"]>>();
  for (const post of posts) if (post.progress && post.visibility !== "private" && !latestProgress.has(post.authorId)) latestProgress.set(post.authorId, post.progress);
  const seconds = [...latestProgress.values()].reduce((sum, progress) => sum + progress.seconds, 0);
  function membership() {
    try {
      community.update((current) => ({ ...current,
        members: joined ? current.members.filter((member) => !(member.groupId === groupId && member.userId === community.userId)) : [...current.members, { groupId, userId: community.userId, name: community.name, joinedAt: new Date().toISOString() }],
        posts: joined ? current.posts : [...current.posts, { id: crypto.randomUUID(), authorId: community.userId, authorName: community.name, groupId, kind: "membership", visibility: "group", title: `${community.name} entrou no grupo`, body: "Um novo compromisso de estudo em companhia.", createdAt: new Date().toISOString(), demo: false, progress: null, sessionId: null }],
      })); setSharing(false); setError("");
    } catch { setError("Não foi possível atualizar a participação neste navegador."); }
  }
  return <AppShell><div className="mx-auto max-w-4xl"><Link href="/comunidade" className="text-sm text-accent">← Comunidade</Link>{!group ? <h1 className="mt-8 text-2xl">Grupo não encontrado neste navegador.</h1> : <>
    <header className="mt-6"><p className="text-sm text-muted">{group.demo ? "Grupo demonstrativo" : "Grupo local"}</p><h1 className="mt-2 text-3xl font-semibold">{group.name}</h1><p className="mt-3 text-lg text-secondary">{group.objective}</p><p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{group.description}</p></header>
    <CommunityNotice />
    <div className="flex flex-wrap gap-3"><button className={joined ? secondaryButtonClass : buttonClass} onClick={membership}>{joined ? "Sair do grupo" : "Entrar no grupo"}</button>{joined && <button className={buttonClass} onClick={() => setSharing(!sharing)}>Compartilhar conteúdo ou progresso</button>}<button disabled className={secondaryButtonClass} aria-describedby="together-note">Estudar juntos · em breve</button></div><p id="together-note" className="mt-3 text-xs text-muted">O estudo em conjunto será disponibilizado em uma próxima etapa.</p>
    {error && <p role="alert" className="mt-3 text-error">{error}</p>}
    {sharing && joined && <ShareForm groupId={groupId} onClose={() => setSharing(false)} />}
    <section className="mt-8 border-y border-line py-5"><h2 className="font-semibold">Estudo compartilhado</h2><p className="mt-2 text-sm text-secondary">{latestProgress.size ? `${timeLabel(seconds)} nos últimos registros de progresso de ${latestProgress.size} participante(s).` : "Ainda não há progresso compartilhado."}</p><p className="mt-2 text-xs text-muted">Soma do último retrato publicado por pessoa. Não é uma medição ao vivo.{group.demo && " Pode incluir exemplos fictícios."}</p><h3 className="mt-5 text-sm font-semibold">Membros · {members.length}</h3><ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm text-secondary">{members.map((member) => <li key={member.userId}>{member.userId === community.userId ? `${community.name} (você)` : member.name}</li>)}</ul></section>
    <section className="mt-8"><h2 className="text-xl font-semibold">Notas e resumos</h2><CommunityFeed posts={posts.filter((post) => post.kind === "note" || post.kind === "summary")} /></section>
    <section className="mt-8 border-t border-line pt-6"><h2 className="text-xl font-semibold">Publicações e atividade</h2><CommunityFeed posts={posts.filter((post) => post.kind !== "note" && post.kind !== "summary")} /></section>
  </>}</div></AppShell>;
}
