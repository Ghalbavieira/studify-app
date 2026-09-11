"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useStudyData } from "./study-store";
import { initialSocial, socialSchema, type SocialData, type SocialProfile } from "./social";

const fallback = initialSocial();
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; data: SocialData }>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
};
function read(key: string) {
  const raw = localStorage.getItem(key);
  const previous = cache.get(key);
  if (previous?.raw === raw) return previous.data;
  const data = raw ? socialSchema.parse(JSON.parse(raw)) : fallback;
  cache.set(key, { raw, data });
  return data;
}
export function useSocial() {
  const study = useStudyData();
  const userId = study.userId ?? "local-user";
  const key = `studify.social.v1.${userId}`;
  const snapshot = useCallback(() => { try { return read(key); } catch { return fallback; } }, [key]);
  const stored = useSyncExternalStore(subscribe, snapshot, () => fallback);
  const me: SocialProfile = { id: userId, username: "meu-perfil", name: study.data.profileName || "Você", bio: "Meu percurso de estudo, uma sessão de cada vez.", objective: study.data.goal?.title ?? "", avatar: null, subjects: study.data.subjects.map((subject) => subject.name), studiedSeconds: study.data.sessions.reduce((sum, session) => sum + session.seconds, 0) };
  const data = { ...stored, profiles: [...stored.profiles.filter((profile) => profile.id !== userId), me] };
  function update(transform: (current: SocialData) => SocialData) {
    if (!study.ready) throw new Error("Aguarde seus dados carregarem.");
    const next = socialSchema.parse(transform(read(key)));
    localStorage.setItem(key, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  }
  function toggle(kind: "likes" | "reposts" | "bookmarks", postId: string) {
    update((current) => ({ ...current, [kind]: current[kind].some((item) => item.userId === userId && item.postId === postId) ? current[kind].filter((item) => !(item.userId === userId && item.postId === postId)) : [...current[kind], { userId, postId, createdAt: new Date().toISOString() }] }));
  }
  return { data, me, update, toggle };
}
