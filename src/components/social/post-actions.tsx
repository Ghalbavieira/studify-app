"use client";

import Link from "next/link";
import { Bookmark, Heart, MessageSquare, Repeat2 } from "lucide-react";
import { useState } from "react";
import { useSocial } from "@/lib/social-store";

export function PostActions({ postId }: { postId: string }) {
  const { data, me, toggle } = useSocial();
  const [error, setError] = useState("");
  return <div><div className="mt-4 flex max-w-md items-center justify-between gap-2 text-muted">
    <Link href={`/comunidade/publicacao/${postId}`} aria-label={`Comentar, ${data.comments.filter((comment) => comment.postId === postId).length} respostas`} className="flex items-center gap-2 rounded-md p-2 text-xs hover:text-accent"><MessageSquare size={17} />{data.comments.filter((comment) => comment.postId === postId).length}</Link>
    {([{ key: "likes", label: "Curtir", activeLabel: "Descurtir", icon: Heart, color: "text-subject-pink" }, { key: "reposts", label: "Repostar", activeLabel: "Desfazer repost", icon: Repeat2, color: "text-success" }, { key: "bookmarks", label: "Salvar", activeLabel: "Remover dos salvos", icon: Bookmark, color: "text-highlight" }] as const).map(({ key, label, activeLabel, icon: Icon, color }) => {
      const active = data[key].some((item) => item.postId === postId && item.userId === me.id);
      return <button key={key} aria-label={active ? activeLabel : label} aria-pressed={active} onClick={() => { try { toggle(key, postId); setError(""); } catch { setError("Não foi possível salvar essa ação neste navegador."); } }} className={`flex items-center gap-2 rounded-md p-2 text-xs ${active ? color : "hover:text-secondary"}`}><Icon size={17} fill={active && key !== "reposts" ? "currentColor" : "none"} />{key !== "bookmarks" && data[key].filter((item) => item.postId === postId).length}</button>;
    })}
  </div>{error && <p role="alert" className="text-xs text-error">{error}</p>}</div>;
}
