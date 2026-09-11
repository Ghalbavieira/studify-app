"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useSocial } from "@/lib/social-store";
import type { SocialMedia } from "@/lib/social";
import { UserAvatar } from "./user-avatar";

const MAX_AVATAR_BYTES = 900_000;

function readImage(file: File): Promise<SocialMedia> {
  return new Promise((resolve, reject) => {
    if (!file.type.match(/^image\/(png|jpeg|webp)$/)) {
      reject(new Error("Use PNG, JPG ou WebP."));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      reject(new Error("A imagem deve ter no máximo 900 KB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ url: String(reader.result), alt: "Foto de perfil" });
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });
}

export function MySocialProfileCard() {
  const { me, update } = useSocial();
  const [editing, setEditing] = useState(false);
  const [objective, setObjective] = useState(me.objective);
  const [bio, setBio] = useState(me.bio);
  const [avatar, setAvatar] = useState<SocialMedia | null>(me.avatar);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function saveProfile() {
    try {
      update((current) => ({
        ...current,
        profiles: [
          ...current.profiles.filter((profile) => profile.id !== me.id),
          { ...me, objective: objective.trim(), bio: bio.trim(), avatar },
        ],
      }));
      setEditing(false);
      setError("");
    } catch {
      setError("Não foi possível salvar o perfil.");
    }
  }

  return <section className="border border-line bg-background-secondary p-4" style={{ borderRadius: 8 }}>
    <div className="flex items-start gap-3">
      <button type="button" onClick={() => editing && inputRef.current?.click()} className={editing ? "cursor-pointer" : "cursor-default"} aria-label={editing ? "Alterar foto de perfil" : undefined}>
        <UserAvatar profile={{ ...me, avatar }} large />
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{me.name}</p>
        <p className="truncate text-xs text-muted">@{me.username}</p>
      </div>
      <button type="button" onClick={() => { setEditing((value) => !value); setObjective(me.objective); setBio(me.bio); setAvatar(me.avatar); setError(""); }} className="text-xs font-semibold text-accent hover:text-foreground">
        {editing ? "Cancelar" : "Editar"}
      </button>
    </div>

    {editing ? <div className="mt-4 space-y-4">
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try { setAvatar(await readImage(file)); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : "Imagem inválida."); }
        event.currentTarget.value = "";
      }} />
      <div className="flex gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-secondary hover:border-accent hover:text-foreground">{avatar ? "Trocar foto" : "Adicionar foto"}</button>
        {avatar && <button type="button" onClick={() => setAvatar(null)} className="rounded-md border border-line px-3 py-2 text-xs text-muted hover:text-error">Remover</button>}
      </div>
      <label className="block text-xs font-medium text-secondary">Estou estudando para
        <input value={objective} onChange={(event) => setObjective(event.target.value)} maxLength={160} placeholder="Ex.: Dataprev 2026" className="mt-2 w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
      </label>
      <label className="block text-xs font-medium text-secondary">Sobre mim
        <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={280} rows={3} placeholder="Conte um pouco sobre sua preparação." className="mt-2 w-full resize-none rounded-md border border-line bg-background px-3 py-2 text-sm leading-6 text-foreground outline-none focus:border-accent" />
      </label>
      {error && <p role="alert" className="text-xs text-error">{error}</p>}
      <button type="button" onClick={saveProfile} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-semibold text-background hover:opacity-90">Salvar perfil</button>
    </div> : <>
      {me.objective ? <div className="mt-4"><p className="text-[11px] uppercase tracking-[0.12em] text-muted">Estudando para</p><p className="mt-1 text-sm font-medium text-highlight">{me.objective}</p></div> : <p className="mt-4 text-xs text-muted">Adicione o concurso, prova ou objetivo que você está preparando.</p>}
      {me.bio && <p className="mt-3 text-xs leading-5 text-secondary">{me.bio}</p>}
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <Link href={`/comunidade/${me.username}`} className="text-xs font-semibold text-accent hover:text-foreground">Ver meu perfil</Link>
        <span className="text-[11px] text-muted">{me.subjects.length} matéria{me.subjects.length === 1 ? "" : "s"}</span>
      </div>
    </>}
  </section>;
}
