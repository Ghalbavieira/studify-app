"use client";

import { useSyncExternalStore } from "react";
import { addDays, emptyStudyData, studyDataSchema, type StudyData } from "./study-data";
import { getSupabaseClient } from "./supabase/client";

const localKey = "studify.data.v1";
type Snapshot = { data: StudyData; mode: "loading" | "local" | "cloud" | "signed-out"; userId: string | null; ready: boolean; saving: boolean; error: string; revision: number };
const initial: Snapshot = { data: emptyStudyData(), mode: "loading", userId: null, ready: false, saving: false, error: "", revision: 0 };
let snapshot = initial;
let generation = 0;
const listeners = new Set<() => void>();
const emit = (next: Snapshot) => { snapshot = next; listeners.forEach((listener) => listener()); };
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function initializeLocalData() {
  generation++;
  let data = emptyStudyData();
  let error = "";
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) data = studyDataSchema.parse(JSON.parse(saved));
    else {
      const legacy = localStorage.getItem("studify.study-plan.v1");
      if (legacy) {
        const weeks = JSON.parse(legacy);
        for (const [week, entries] of Object.entries(weeks)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(week) || !Array.isArray(entries)) continue;
          for (const entry of entries) {
            if (!entry || typeof entry.id !== "string" || entry.id.startsWith("initial-") || typeof entry.subject !== "string" || !Number.isInteger(entry.day) || entry.day < 0 || entry.day > 6 || !Number.isInteger(entry.minutes) || entry.minutes < 1 || entry.minutes > 1440) continue;
            let subject = data.subjects.find((subject) => subject.name === entry.subject);
            if (!subject) { subject = { id: crypto.randomUUID(), name: entry.subject, weight: 1, color: "blue" }; data.subjects.push(subject); }
            data.blocks.push({ id: crypto.randomUUID(), date: addDays(week, entry.day), subjectId: subject.id, topicId: null, minutes: entry.minutes, description: typeof entry.description === "string" ? entry.description : "", done: Boolean(entry.done), plannedQuestions: 0, sessionType: "study" });
          }
        }
        data = studyDataSchema.parse(data);
        localStorage.setItem(localKey, JSON.stringify(data));
      }
    }
  } catch { error = "Não foi possível ler os dados locais. Exporte o arquivo original nas configurações antes de substituir os dados."; }
  emit({ ...initial, data, mode: "local", ready: !error, error });
}

export async function initializeCloudData(userId: string | null) {
  const request = ++generation;
  if (!userId) { emit({ ...initial, mode: "signed-out" }); return; }
  emit({ ...initial, userId, mode: "cloud" });
  try {
    const { data, error } = await getSupabaseClient().rpc("get_study_data");
    if (error) throw error;
    const parsed = studyDataSchema.parse(data.data);
    if (request === generation) emit({ ...snapshot, data: parsed, revision: data.revision, ready: true, error: "" });
  } catch {
    if (request === generation) emit({ ...snapshot, error: "Não foi possível carregar seus estudos. Confira a conexão e se as migrations do Supabase foram executadas." });
  }
}

export function setStudyError(message: string) { emit({ ...snapshot, error: message }); }
export function getStudyData() { return snapshot.data; }

export async function refreshStudyData() {
  if (snapshot.mode !== "cloud" || snapshot.saving) return;
  const request = generation;
  const { data, error } = await getSupabaseClient().rpc("get_study_data");
  if (request !== generation) return;
  if (error) { setStudyError("Não foi possível atualizar seus dados. Tente novamente."); return; }
  emit({ ...snapshot, data: studyDataSchema.parse(data.data), revision: data.revision, error: "", ready: true });
}

export async function saveStudyData(data: StudyData): Promise<boolean> {
  if (!snapshot.ready || snapshot.saving) return false;
  const valid = studyDataSchema.parse(data);
  const before = snapshot;
  const request = generation;
  emit({ ...snapshot, saving: true, error: "" });
  if (before.mode === "local") {
    try {
      localStorage.setItem(localKey, JSON.stringify(valid));
      emit({ ...before, data: valid, saving: false, error: "" });
      return true;
    } catch {
      emit({ ...before, saving: false, error: "O navegador não permitiu salvar. Libere espaço ou exporte seus dados e tente novamente." });
      return false;
    }
  }
  try {
    const { data: result, error } = await getSupabaseClient().rpc("save_study_data", { p_expected_revision: before.revision, p_data: valid });
    if (request !== generation) return false;
    if (error) {
      const conflict = error.code === "40001";
      emit({ ...before, saving: false, error: conflict ? "Seus dados mudaram em outro dispositivo. Clique em Atualizar dados antes de tentar novamente." : "Não foi possível salvar. Verifique sua conexão e tente novamente; a alteração não foi aplicada." });
      return false;
    }
    emit({ ...before, data: studyDataSchema.parse(result.data), revision: result.revision, saving: false, error: "" });
    return true;
  } catch {
    if (request === generation) emit({ ...before, saving: false, error: "Falha de conexão ao salvar. A alteração não foi aplicada; tente novamente." });
    return false;
  }
}

export async function updateStudyData(update: (data: StudyData) => StudyData) { return saveStudyData(update(snapshot.data)); }
export function useStudyData() { return useSyncExternalStore(subscribe, () => snapshot, () => initial); }
export function exportStudyData() {
  if (snapshot.mode === "local" && !snapshot.ready) return localStorage.getItem(localKey) ?? JSON.stringify(snapshot.data);
  return JSON.stringify(snapshot.data, null, 2);
}
