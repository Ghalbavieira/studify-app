"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClient } from "./supabase/client";
import { useStudyData } from "./study-store";
export type QuestionSet = { id: string; goal_id: string; subject_id: string; topic_id: string | null; title: string; kind: "list" | "simulation"; question_ids: string[]; created_at: string };
export type QuestionRun = { id: string; set_id: string; parent_run_id: string | null; question_ids: string[]; started_at: string; completed_at: string | null };
export type RunAnswer = { run_id: string; question_id: string; attempt_id: string };
const empty = { sets: [] as QuestionSet[], runs: [] as QuestionRun[], answers: [] as RunAnswer[], favorites: [] as string[] };
export function useQuestionCollections() {
  const { userId, mode, ready } = useStudyData();
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++generation.current;
    if (mode !== "cloud" || !ready || !userId) { setData(empty); setLoading(false); return; }
    setLoading(true);
    try {
      const db = getSupabaseClient();
      const results = await Promise.all([
        db.from("question_sets").select("id,goal_id,subject_id,topic_id,title,kind,question_ids,created_at").order("created_at", { ascending: false }),
        db.from("question_runs").select("id,set_id,parent_run_id,question_ids,started_at,completed_at").order("started_at", { ascending: false }),
        db.from("question_run_answers").select("run_id,question_id,attempt_id"),
        db.from("question_favorites").select("question_id"),
      ]);
      for (const result of results) if (result.error) throw result.error;
      if (version === generation.current) { setData({ sets: results[0].data as QuestionSet[] ?? [], runs: results[1].data as QuestionRun[] ?? [], answers: results[2].data as RunAnswer[] ?? [], favorites: (results[3].data ?? []).map(r => r.question_id) }); setError(""); }
    } catch { if (version === generation.current) { setData(empty); setError("Não foi possível carregar listas e favoritas. Confira a conexão e a atualização do serviço."); } }
    finally { if (version === generation.current) setLoading(false); }
  }, [mode, userId, ready]);
  useEffect(() => { const ref = generation; const timer = setTimeout(() => void refresh(), 0); return () => { clearTimeout(timer); ref.current++; }; }, [refresh]);
  async function toggleFavorite(questionId: string) {
    if (!userId || mode !== "cloud") throw new Error("Entre na conta para salvar favoritas e sincronizar com o Mobile.");
    const db = getSupabaseClient();
    const result = data.favorites.includes(questionId) ? await db.from("question_favorites").delete().eq("user_id", userId).eq("question_id", questionId) : await db.from("question_favorites").insert({ user_id: userId, question_id: questionId });
    if (result.error) throw new Error("Não foi possível salvar a favorita. Tente novamente.");
    await refresh();
  }
  return { ...data, error, loading, refresh, toggleFavorite };
}
export async function createQuestionSet(input: { id: string; goal: string; subject: string; topic: string | null; title: string; kind: "list" | "simulation"; questions: string[] }) {
  const { error } = await getSupabaseClient().rpc("create_question_set", { p_id: input.id, p_goal: input.goal, p_subject: input.subject, p_topic: input.topic, p_title: input.title, p_kind: input.kind, p_questions: input.questions });
  if (error) throw new Error("Não foi possível salvar a lista. Verifique a conexão e tente novamente.");
  return input.id;
}
export async function startQuestionRun(setId: string, parent: string | null = null, wrongOnly = false) {
  const id = crypto.randomUUID();
  const { error } = await getSupabaseClient().rpc("start_question_run", { p_id: id, p_set: setId, p_parent: parent, p_wrong_only: wrongOnly });
  if (error) throw new Error("Não foi possível iniciar a tentativa. Confira se há questões disponíveis e tente novamente.");
  return id;
}
