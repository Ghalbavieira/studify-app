"use client";

import Image from "next/image";
import Link from "next/link";
import type { Comment, SocialProfile } from "@/lib/social";
import { useSocial } from "@/lib/social-store";
import { AppShell } from "../app-shell";
import { UserAvatar } from "./user-avatar";
import { PostCard } from "./post-card";
import { PostComposer } from "./post-composer";

export function CommentCard({ comment, author }: { comment: Comment; author: SocialProfile }) {
  return <article className="flex gap-3 border-b border-line py-5"><Link href={`/comunidade/${author.username}`}><UserAvatar profile={author} /></Link><div className="min-w-0 flex-1"><Link href={`/comunidade/${author.username}`} className="text-sm font-semibold">{author.name}</Link><span className="ml-2 text-xs text-muted">@{author.username}</span><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-secondary">{comment.text}</p>{comment.media && <Image unoptimized src={comment.media.url} alt={comment.media.alt} width={600} height={400} className="mt-3 max-h-80 w-full rounded-lg object-contain" />}<time dateTime={comment.createdAt} className="mt-3 block text-xs text-muted">{new Date(comment.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time></div></article>;
}

export function CommentThread({ postId }: { postId: string }) {
  const { data, me, update } = useSocial();
  const post = data.posts.find((item) => item.id === postId);
  const author = data.profiles.find((profile) => profile.id === post?.authorId);
  return <AppShell><div className="mx-auto max-w-2xl"><Link href="/comunidade" className="text-sm text-accent">← Comunidade</Link><h1 className="mt-5 text-xl font-semibold">Conversa</h1>{post && author ? <><PostCard post={post} author={author} /><PostComposer reply onPublish={(draft) => update((current) => ({ ...current, comments: [...current.comments, { id: crypto.randomUUID(), postId, authorId: me.id, text: draft.text, media: draft.media, createdAt: new Date().toISOString() }] }))} /><h2 className="mt-5 text-sm font-semibold">Respostas · {data.comments.filter((comment) => comment.postId === postId).length}</h2>{data.comments.filter((comment) => comment.postId === postId).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((comment) => { const person = data.profiles.find((profile) => profile.id === comment.authorId); return person && <CommentCard key={comment.id} comment={comment} author={person} />; })}</> : <p className="py-8 text-muted">Publicação não encontrada.</p>}</div></AppShell>;
}
