"use client";

import demo from "./demo-question-data.json";
import { getSupabaseClient } from "./supabase/client";
import { attemptSchema } from "./study-data";

export type Question = {
  id: string; subjectId: string | null; topicId: string | null; subjectLabel: string; topicLabel: string;
  statement: string; difficulty: string | null; board: string; year: number | null; sourceType: string; sourceReference: string | null;
  options: { id: string; label: string; text: string }[];
};

type CatalogRow = { id: string; subject_id: string | null; topic_id: string | null; subject_label: string; topic_label: string; statement: string; difficulty: string | null; source_type: string; source_reference: string | null; exam: { year: number; exam_board: { name: string } } | null; options: Question["options"] };

export async function loadQuestions(mode: "local" | "cloud"): Promise<Question[]> {
  if (mode === "local") return demo.map((question) => ({ ...question, subjectId: null, topicId: null, options: question.options.map(({ id, label, text }) => ({ id, label, text })) }));
  const { data, error } = await getSupabaseClient().from("questions").select("id,subject_id,topic_id,subject_label,topic_label,statement,difficulty,source_type,source_reference,exam:exams(year,exam_board:exam_boards(name)),options:question_options(id,label,text)").order("created_at").limit(200).returns<CatalogRow[]>();
  if (error) throw error;
  return (data ?? []).map((question) => ({ id: question.id, subjectId: question.subject_id, topicId: question.topic_id, subjectLabel: question.subject_label, topicLabel: question.topic_label, statement: question.statement, difficulty: question.difficulty, board: question.exam?.exam_board?.name ?? "Sem banca", year: question.exam?.year ?? null, sourceType: question.source_type, sourceReference: question.source_reference, options: [...question.options].sort((a, b) => a.label.localeCompare(b.label)) }));
}

export async function answerQuestion(input: { mode: "local" | "cloud"; questionId: string; optionId: string; requestId: string; subjectId: string; topicId: string | null; studySessionId: string; seconds: number }) {
  if (input.mode === "local") {
    const question = demo.find((question) => question.id === input.questionId);
    const option = question?.options.find((option) => option.id === input.optionId);
    if (!question || !option) throw new Error("Questão indisponível.");
    return { attempt: attemptSchema.parse({ id: input.requestId, questionId: question.id, studySessionId: input.studySessionId, subjectId: input.subjectId, topicId: input.topicId, selectedOptionId: option.id, isCorrect: option.isCorrect, responseTimeSeconds: input.seconds, answeredAt: new Date().toISOString() }), explanation: question.explanation, correctOptionId: question.options.find((option) => option.isCorrect)!.id };
  }
  const { data, error } = await getSupabaseClient().rpc("answer_question", { p_question_id: input.questionId, p_selected_option_id: input.optionId, p_request_id: input.requestId, p_study_session_id: input.studySessionId, p_subject_id: input.subjectId, p_topic_id: input.topicId, p_response_time_seconds: input.seconds });
  if (error) throw error;
  const attempt = data.attempt;
  return { attempt: attemptSchema.parse({ id: attempt.id, questionId: attempt.question_id, studySessionId: attempt.study_session_id, subjectId: attempt.subject_id, topicId: attempt.topic_id, selectedOptionId: attempt.selected_option_id, isCorrect: attempt.is_correct, responseTimeSeconds: attempt.response_time_seconds, answeredAt: new Date(attempt.answered_at).toISOString() }), explanation: data.explanation as string | null, correctOptionId: data.correct_option_id as string };
}

export async function startQuestionSession(input: { id: string; goalId: string; subjectId: string; topicId: string | null; blockId: string | null; startedAt: string }) {
  const { error } = await getSupabaseClient().from("study_sessions").insert({ id: input.id, goal_id: input.goalId, subject_id: input.subjectId, topic_id: input.topicId, study_block_id: input.blockId, started_at: input.startedAt, session_type: "questions", status: "in_progress" });
  if (error) throw error;
}
