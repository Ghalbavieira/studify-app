import { z } from "zod";

const id = z.string().min(1).max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T12:00:00`);
  return !Number.isNaN(parsed.getTime()) && localDate(parsed) === value;
}, "Data inválida");
const timestamp = z.iso.datetime();
export const subjectColors = ["blue", "violet", "orange", "green", "amber", "pink"] as const;
export const goalSchema = z.object({
  id,
  title: z.string().trim().min(1).max(160),
  examDate: date.nullable(),
  weeklyMinutes: z.number().int().min(10).max(10080),
  board: z.string().trim().max(160).optional(),
  organization: z.string().trim().max(200).optional(),
  role: z.string().trim().max(200).optional(),
  questionsTotal: z.number().int().min(0).max(10000).nullable().optional(),
  cutoffScore: z.number().min(0).max(100000).nullable().optional(),
});
export const subjectSchema = z.object({ id, name: z.string().trim().min(1).max(100), weight: z.number().min(0.1).max(100), color: z.enum(subjectColors), questionCount: z.number().int().min(0).max(10000).nullable().optional() });
export const topicSchema = z.object({ id, subjectId: id, title: z.string().trim().min(1).max(200), completed: z.boolean() });
export const blockSchema = z.object({ id, date, subjectId: id, topicId: id.nullable(), minutes: z.number().int().min(1).max(1440), description: z.string().max(2000), done: z.boolean(), plannedQuestions: z.number().int().min(0).max(100000).default(0), sessionType: z.enum(["study", "questions", "review", "recall"]).default("study") });
export const sessionSchema = z.object({
  id, subjectId: id, topicId: id.nullable(), blockId: id.nullable(), taskId: id.nullable(),
  startedAt: timestamp, endedAt: timestamp, seconds: z.number().int().min(1).max(86400),
  questions: z.number().int().min(0).max(100000), correct: z.number().int().min(0).max(100000), notes: z.string().max(4000),
}).refine((session) => session.correct <= session.questions, "Acertos não podem exceder questões")
  .refine((session) => new Date(session.endedAt) >= new Date(session.startedAt), "Horários inválidos");
export const taskSchema = z.object({
  id, kind: z.enum(["review", "recall"]), subjectId: id, topicId: id.nullable(), dueDate: date,
  sourceSessionId: id, intervalDays: z.number().int().min(1).max(90), completedAt: timestamp.nullable(),
  rating: z.enum(["difficult", "good", "easy"]).nullable(),
});
export const attemptSchema = z.object({
  id, questionId: id, studySessionId: id.nullable(), subjectId: id.nullable(), topicId: id.nullable(),
  selectedOptionId: id.nullable(), isCorrect: z.boolean(), responseTimeSeconds: z.number().int().min(0).max(86400).nullable(), answeredAt: timestamp,
});
export const studyDataSchema = z.object({
  version: z.literal(1), profileName: z.string().max(100), goal: goalSchema.nullable(),
  subjects: z.array(subjectSchema).max(200), topics: z.array(topicSchema).max(10000),
  attempts: z.array(attemptSchema).max(100000).default([]),
  blocks: z.array(blockSchema).max(50000), sessions: z.array(sessionSchema).max(50000), tasks: z.array(taskSchema).max(100000),
}).superRefine((data, context) => {
  const subjects = new Set(data.subjects.map((item) => item.id));
  const topics = new Map(data.topics.map((item) => [item.id, item.subjectId]));
  for (const group of [data.subjects, data.topics, data.blocks, data.sessions, data.tasks]) {
    if (new Set(group.map((item) => item.id)).size !== group.length) context.addIssue({ code: "custom", message: "IDs duplicados" });
  }
  for (const item of [...data.topics, ...data.blocks, ...data.sessions, ...data.tasks]) {
    if (!subjects.has(item.subjectId)) context.addIssue({ code: "custom", message: "Matéria inexistente" });
    if ("topicId" in item && item.topicId && topics.get(item.topicId) !== item.subjectId) context.addIssue({ code: "custom", message: "Tópico não pertence à matéria" });
  }
});

export type QuestionAttempt = z.infer<typeof attemptSchema>;
export type StudyData = z.infer<typeof studyDataSchema>;
export type Goal = z.infer<typeof goalSchema>;
export type Subject = z.infer<typeof subjectSchema>;
export type Topic = z.infer<typeof topicSchema>;
export type PlanBlock = z.infer<typeof blockSchema>;
export type StudySession = z.infer<typeof sessionSchema>;
export type StudyTask = z.infer<typeof taskSchema>;
export type RecallRating = NonNullable<StudyTask["rating"]>;

export function emptyStudyData(): StudyData {
  return { version: 1, profileName: "", goal: null, subjects: [], topics: [], blocks: [], sessions: [], tasks: [], attempts: [] };
}

export function localDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function addDays(value: string, days: number) {
  const result = new Date(`${value}T12:00:00`);
  result.setDate(result.getDate() + days);
  return localDate(result);
}

export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}

export function weekDates(now: Date) {
  const today = localDate(now);
  const start = addDays(today, -now.getDay());
  return { start, end: addDays(start, 6) };
}

export function recordSession(data: StudyData, input: StudySession, makeId: () => string): StudyData {
  const session = sessionSchema.parse(input);
  if (data.sessions.some((item) => item.id === session.id)) return data;
  const today = localDate(new Date(session.endedAt));
  const tasks = [...data.tasks];
  for (const kind of ["review", "recall"] as const) {
    if (!tasks.some((task) => task.kind === kind && task.subjectId === session.subjectId && task.topicId === session.topicId && !task.completedAt)) {
      const intervalDays = kind === "review" ? 1 : 3;
      tasks.push({ id: makeId(), kind, subjectId: session.subjectId, topicId: session.topicId, dueDate: addDays(today, intervalDays), sourceSessionId: session.id, intervalDays, completedAt: null, rating: null });
    }
  }
  return studyDataSchema.parse({ ...data, sessions: [...data.sessions, session], tasks });
}

export function completeTask(data: StudyData, taskId: string, rating: RecallRating, now: Date, makeId: () => string): StudyData {
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task || task.completedAt) return data;
  const intervalDays = rating === "difficult" ? 1 : Math.min(90, Math.max(3, Math.round(task.intervalDays * (rating === "easy" ? 3 : 2))));
  const completed = { ...task, completedAt: now.toISOString(), rating };
  const next = { ...task, id: makeId(), dueDate: addDays(localDate(now), intervalDays), intervalDays, completedAt: null, rating: null };
  return studyDataSchema.parse({ ...data, tasks: [...data.tasks.map((item) => item.id === taskId ? completed : item), next] });
}

export function movePlanBlock(blocks: PlanBlock[], id: string, date: string, beforeId?: string) {
  const found = blocks.find((block) => block.id === id);
  if (!found || id === beforeId) return blocks;
  const next = blocks.filter((block) => block.id !== id);
  const index = beforeId ? next.findIndex((block) => block.id === beforeId) : -1;
  next.splice(index < 0 ? next.length : index, 0, { ...found, date });
  return next;
}

export function balancePlanBlocks(blocks: PlanBlock[], weekStart: string) {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const inWeek = blocks.filter((block) => block.date >= dates[0] && block.date <= dates[6]);
  const totals = dates.map((date) => inWeek.filter((block) => block.date === date && block.done).reduce((sum, block) => sum + block.minutes, 0));
  const changes = new Map<string, string>();
  for (const block of inWeek.filter((block) => !block.done)) {
    const index = totals.indexOf(Math.min(...totals));
    changes.set(block.id, dates[index]); totals[index] += block.minutes;
  }
  return blocks.map((block) => changes.has(block.id) ? { ...block, date: changes.get(block.id)! } : block);
}
