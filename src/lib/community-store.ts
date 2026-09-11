"use client";

import { useCallback, useSyncExternalStore } from "react";
import { communitySchema, initialCommunity, type CommunityData } from "./community";
import { useStudyData } from "./study-store";

const listeners = new Set<() => void>();
const fallback = initialCommunity();
const cache = new Map<string, { raw: string | null; data: CommunityData }>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => { listeners.delete(listener); window.removeEventListener("storage", listener); };
};
function read(key: string) {
  const raw = localStorage.getItem(key);
  const cached = cache.get(key);
  if (cached?.raw === raw) return cached.data;
  const data = raw ? communitySchema.parse(JSON.parse(raw)) : fallback;
  cache.set(key, { raw, data });
  return data;
}
export function useCommunity() {
  const study = useStudyData();
  const userId = study.userId ?? "local-user";
  const key = `studify.community.v1.${userId}`;
  const getSnapshot = useCallback(() => {
    try { return read(key); } catch { return fallback; }
  }, [key]);
  const data = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  function update(transform: (current: CommunityData) => CommunityData) {
    const next = communitySchema.parse(transform(read(key)));
    localStorage.setItem(key, JSON.stringify(next));
    listeners.forEach((listener) => listener());
  }
  return { data, update, userId, name: study.data.profileName || "Você" };
}
