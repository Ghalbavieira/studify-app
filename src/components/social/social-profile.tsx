"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "../app-shell";
import { useSocial } from "@/lib/social-store";
import { SocialProfileHeader } from "./social-profile-header";
import { PostCard } from "./post-card";
import { CommentCard } from "./comment-thread";

export function SocialProfilePage({ username }: { username: string }) {
  const { data } = useSocial();
  const [tab, setTab] = useState("Publicações");
  const profile = data.profiles.find((item) => item.username === username);
  const posts = data.posts.filter((post) => tab === "Curtidas" ? data.likes.some((like) => like.userId === profile?.id && like.postId === post.id) : post.authorId === profile?.id && (tab !== "Mídia" || post.media)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const replies = data.comments.filter((comment) => comment.authorId === profile?.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return <AppShell><div className="mx-auto max-w-2xl"><Link href="/comunidade" className="text-sm text-accent">← Comunidade</Link>{!profile ? <h1 className="py-10 text-2xl">Perfil não encontrado.</h1> : <><SocialProfileHeader profile={profile} /><div role="tablist" aria-label="Publicações do perfil" className="flex overflow-x-auto border-b border-line">{["Publicações", "Respostas", "Mídia", "Curtidas"].map((value) => <button key={value} role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`flex-1 border-b-2 px-3 py-3 text-sm ${tab === value ? "border-accent text-accent" : "border-transparent text-muted"}`}>{value}</button>)}</div>{tab === "Respostas" ? replies.map((comment) => <div key={comment.id}><Link href={`/comunidade/publicacao/${comment.postId}`} className="mt-4 inline-block text-xs text-accent">Ver conversa original</Link><CommentCard comment={comment} author={profile} /></div>) : posts.map((post) => { const author = data.profiles.find((person) => person.id === post.authorId); return author && <PostCard key={post.id} post={post} author={author} />; })}{(tab === "Respostas" ? !replies.length : !posts.length) && <p className="py-10 text-sm text-muted">Nenhum registro nesta aba ainda.</p>}</>}</div></AppShell>;
}
