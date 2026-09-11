"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "../app-shell";
import { useSocial } from "@/lib/social-store";
import { normalizeSearch, socialFeed } from "@/lib/social";
import { PostComposer } from "./post-composer";
import { PostCard } from "./post-card";
import { UserAvatar } from "./user-avatar";
import { FollowButton } from "./social-profile-header";

export function SocialFeed({ initialQuery = "" }: { initialQuery?: string }) {
  const { data, me, update } = useSocial();
  const [tab, setTab] = useState("Para você");
  const [query, setQuery] = useState(initialQuery);
  const [savedOnly, setSavedOnly] = useState(false);
  const posts = socialFeed(data, me.id, tab === "Seguindo", query).filter(({ post }) => !savedOnly || data.bookmarks.some((bookmark) => bookmark.userId === me.id && bookmark.postId === post.id));
  const people = data.profiles.filter((profile) => normalizeSearch([profile.name, profile.username, profile.subjects.join(" "), profile.objective].join(" ")).includes(normalizeSearch(query)));
  return <AppShell><div className="mx-auto max-w-5xl"><header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Comunidade</h1><p className="mt-1 text-xs text-muted">Prévia local · pessoas e publicações de exemplo</p></div><Link href={`/comunidade/${me.username}`} className="text-sm text-accent">Meu perfil →</Link></header>
    <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_240px]"><div className="min-w-0">
      <label className="block text-sm text-muted"><span className="sr-only">Buscar usuários, matérias, temas ou hashtags</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pessoas, matérias, #temas" className="w-full rounded-md border border-line bg-background-secondary px-4 py-3 text-sm text-foreground" /></label>
      <div role="tablist" aria-label="Feed" className="mt-4 flex border-b border-line">{["Para você", "Seguindo"].map((value) => <button role="tab" aria-selected={tab === value} key={value} onClick={() => setTab(value)} className={`flex-1 border-b-2 px-4 py-3 text-sm font-semibold ${tab === value ? "border-accent text-accent" : "border-transparent text-muted"}`}>{value}</button>)}</div>
      <PostComposer onPublish={(draft) => update((current) => ({ ...current, posts: [{ ...draft, id: crypto.randomUUID(), authorId: me.id, createdAt: new Date().toISOString() }, ...current.posts] }))} />
      {query.trim() && <section className="border-b border-line py-4"><h2 className="mb-3 text-sm font-semibold">Pessoas</h2>{people.length ? people.map((profile) => <Link key={profile.id} href={`/comunidade/${profile.username}`} className="flex items-center gap-3 py-2"><UserAvatar profile={profile} /><span className="text-sm">{profile.name}<span className="block text-xs text-muted">@{profile.username}</span></span></Link>) : <p className="text-sm text-muted">Nenhuma pessoa encontrada.</p>}</section>}
      <div className="flex items-center justify-between py-3"><h2 className="text-xs text-muted">{query ? "Publicações encontradas" : "Mais recentes"}</h2><button aria-pressed={savedOnly} onClick={() => setSavedOnly(!savedOnly)} className={`rounded-md px-2 py-1 text-xs ${savedOnly ? "text-highlight" : "text-muted"}`}>{savedOnly ? "Mostrando salvos" : "Ver salvos"}</button></div>
      {posts.map(({ post, repost }) => { const author = data.profiles.find((profile) => profile.id === post.authorId); return author && <PostCard key={post.id} post={post} author={author} repostedBy={repost ? data.profiles.find((profile) => profile.id === repost.userId)?.name : undefined} />; })}
      {!posts.length && <p className="py-10 text-sm text-muted">{query ? "Nenhuma publicação encontrada para esta busca." : savedOnly ? "As publicações salvas aparecerão aqui." : "Siga pessoas para acompanhar seus estudos ou publique seu primeiro registro."}</p>}
    </div><aside className="hidden xl:block"><h2 className="text-sm font-semibold">Pessoas para conhecer</h2><div className="mt-4 space-y-6">{data.profiles.filter((profile) => profile.id !== me.id).map((profile) => <div key={profile.id}><Link href={`/comunidade/${profile.username}`} className="flex items-center gap-3"><UserAvatar profile={profile} /><span className="text-sm font-semibold">{profile.name}<span className="block text-xs font-normal text-muted">@{profile.username}</span></span></Link><p className="my-3 text-xs text-muted">{profile.objective}</p><FollowButton profileId={profile.id} /></div>)}</div><p className="mt-8 border-t border-line pt-4 text-xs leading-6 text-muted">Anotações, dúvidas e pequenas descobertas também fazem parte do estudo.</p></aside></div>
  </div></AppShell>;
}
