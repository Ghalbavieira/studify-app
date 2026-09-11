"use client";

import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import type { SocialMedia } from "@/lib/social";
import { getSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function MediaUpload({ media, onChange, onBusy }: { media: SocialMedia | null; onChange: (media: SocialMedia | null) => void; onBusy: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function readLocal(file: File) {
    return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = reject; reader.readAsDataURL(file); });
  }

  async function upload(file: File) {
    if (!isSupabaseConfigured()) return readLocal(file);
    const supabase = getSupabaseClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return readLocal(file);
    const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("social-media").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;
    return supabase.storage.from("social-media").getPublicUrl(path).data.publicUrl;
  }

  return <div>
    {media && <div className="relative mb-3 w-fit max-w-full"><Image unoptimized src={media.url} alt={media.alt} width={520} height={320} className="max-h-64 h-auto w-auto max-w-full rounded-lg object-contain" /><button type="button" aria-label="Remover imagem" onClick={() => { onChange(null); if (input.current) input.current.value = ""; }} className="absolute right-2 top-2 rounded-md bg-background p-2"><X size={16} /></button></div>}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-accent focus-within:outline-2 focus-within:outline-accent"><ImagePlus size={18} />Imagem<input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2_000_000) { setError("Use PNG, JPG ou WebP de até 2 MB."); event.target.value = ""; return; }
      setError(""); onBusy(true);
      try {
        const url = await upload(file);
        await new Promise<void>((resolve, reject) => { const image = new window.Image(); image.onload = () => resolve(); image.onerror = reject; image.src = url; });
        onChange({ url, alt: "Imagem compartilhada em uma publicação de estudo" });
      } catch { setError("Não foi possível enviar essa imagem. Confirme a migration 007 e tente novamente."); } finally { onBusy(false); }
    }} /></label>
    {media && <label className="mt-2 block text-xs text-muted">Descrição da imagem<input maxLength={200} value={media.alt} onChange={(event) => onChange({ ...media, alt: event.target.value })} className="mt-1 w-full rounded-md border border-line bg-background px-3 py-2 text-sm text-foreground" /></label>}
    {error && <p role="alert" className="mt-2 text-xs text-error">{error}</p>}
  </div>;
}
