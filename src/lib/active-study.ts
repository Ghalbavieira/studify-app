"use client";

import { useMemo, useSyncExternalStore } from "react";
import { z } from "zod";
import { useStudyData } from "./study-store";

const schema = z.object({
  id: z.string(), subjectId: z.string(), topicId: z.string().nullable(), blockId: z.string().nullable(), taskId: z.string().nullable(),
  durationSeconds: z.number().int().min(60), startedAt: z.string(), runningSince: z.number().nullable(), accumulatedSeconds: z.number().int().min(0),
});
export type ActiveStudy = z.infer<typeof schema>;
const eventName = "studify-active-change";
const key = (userId: string | null) => `studify.active.${userId ?? "local"}`;
let memory: Record<string, string | null> = {};
const subscribe = (callback: () => void) => {
  window.addEventListener(eventName, callback); window.addEventListener("storage", callback);
  return () => { window.removeEventListener(eventName, callback); window.removeEventListener("storage", callback); };
};

export function elapsedStudy(active: ActiveStudy, now = Date.now()) {
  return Math.min(active.durationSeconds, active.accumulatedSeconds + (active.runningSince === null ? 0 : Math.max(0, Math.floor((now - active.runningSince) / 1000))));
}

export function saveActiveStudy(userId: string | null, active: ActiveStudy | null) {
  const storageKey = key(userId);
  const raw = active ? JSON.stringify(schema.parse(active)) : null;
  memory = { ...memory, [storageKey]: raw };
  try { if (raw) localStorage.setItem(storageKey, raw); else localStorage.removeItem(storageKey); } catch { /* The running timer still works for this page session. */ }
  window.dispatchEvent(new Event(eventName));
}

export function useActiveStudy() {
  const { userId } = useStudyData();
  const raw = useSyncExternalStore(subscribe, () => {
    const storageKey = key(userId);
    try { return localStorage.getItem(storageKey) ?? memory[storageKey] ?? null; } catch { return memory[storageKey] ?? null; }
  }, () => null);
  return useMemo(() => { try { return raw ? schema.parse(JSON.parse(raw)) : null; } catch { return null; } }, [raw]);
}
