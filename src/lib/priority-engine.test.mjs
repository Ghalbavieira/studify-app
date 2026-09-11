import assert from "node:assert/strict";
import test from "node:test";
import { emptyStudyData, recordSession, completeTask, studyDataSchema, movePlanBlock, balancePlanBlocks } from "./study-data.ts";
import { buildPriorityContext, calculateMetrics, calculateDailyMetrics, calculateTopicMetrics } from "./priority-engine.ts";

const now = new Date("2026-09-11T15:00:00.000Z");
const subject = (id, weight = 1) => ({ id, name: id, weight, color: "blue" });
const base = () => ({ ...emptyStudyData(), goal: { id: "goal", title: "Prova", examDate: "2026-10-01", weeklyMinutes: 600 }, subjects: [subject("Redes"), subject("RLM")], topics: [{ id: "ipv4", subjectId: "Redes", title: "IPv4", completed: false }] });
const session = (id, subjectId, questions = 0, correct = 0, endedAt = "2026-09-11T14:00:00.000Z") => ({ id, subjectId, topicId: subjectId === "Redes" ? "ipv4" : null, blockId: null, taskId: null, startedAt: "2026-09-01T12:00:00.000Z", endedAt, seconds: 600, questions, correct, notes: "" });
const attempt = (id, isCorrect, answeredAt = "2026-09-11T14:00:00.000Z") => ({ id, questionId: "q", studySessionId: null, subjectId: "Redes", topicId: "ipv4", selectedOptionId: "a", isCorrect, responseTimeSeconds: 10, answeredAt });

test("no data remains unknown, not fabricated as zero accuracy or execution", () => {
  const context = buildPriorityContext(base(), now);
  assert.equal(context.metrics.accuracy, null);
  assert.equal(context.metrics.executionRate, null);
  assert.equal(context.priorities[0].evidence.accuracy, null);
  assert.equal(context.priorities[0].evidence.trend, null);
});

test("accuracy combines raw counts and attempts, not averages of percentages", () => {
  const data = base(); data.sessions = [session("a", "Redes", 1, 1), session("b", "Redes", 9, 0)]; data.attempts = [attempt("c", true), attempt("d", false)];
  const metrics = calculateMetrics(data, now);
  assert.equal(metrics.questions, 12); assert.equal(metrics.correct, 2); assert.equal(metrics.accuracy, 2 / 12);
  assert.equal(metrics.executedSeconds, 1200);
  assert.equal(calculateTopicMetrics(data, now)[0].questions, 12);
});

test("weight, overdue reviews and recall change deterministic priority", () => {
  const data = base(); data.subjects[1].weight = 3;
  assert.equal(buildPriorityContext(data, now).recommendation.subjectId, "RLM");
  data.tasks = [{ id: "review", kind: "review", subjectId: "Redes", topicId: "ipv4", sourceSessionId: "session", dueDate: "2026-08-20", intervalDays: 1, completedAt: null, rating: null }, { id: "recall", kind: "recall", subjectId: "Redes", topicId: "ipv4", sourceSessionId: "session", dueDate: "2026-09-11", intervalDays: 3, completedAt: null, rating: null }];
  const context = buildPriorityContext(data, now);
  assert.equal(context.recommendation.subjectId, "Redes"); assert.equal(context.recommendation.nextBlock.taskId, "review");
  assert.deepEqual(context, buildPriorityContext(data, now));
});

test("small samples have less influence and a trend requires both periods", () => {
  const data = base(); data.sessions = [session("one", "Redes", 1, 0)];
  const small = buildPriorityContext(data, now).priorities.find((item) => item.subjectId === "Redes");
  data.sessions = [session("many", "Redes", 100, 0)];
  const large = buildPriorityContext(data, now).priorities.find((item) => item.subjectId === "Redes");
  assert.ok(large.factors.accuracy > small.factors.accuracy); assert.equal(large.evidence.trend, null);
  data.sessions.push(session("previous", "Redes", 10, 10, "2026-09-02T14:00:00.000Z"));
  assert.equal(buildPriorityContext(data, now).priorities.find((item) => item.subjectId === "Redes").evidence.trend, -1);
});

test("completed plan flags never invent executed time", () => {
  const data = base(); data.blocks = [{ id: "b", date: "2026-09-11", subjectId: "Redes", topicId: "ipv4", minutes: 45, description: "", done: true, plannedQuestions: 10, sessionType: "study" }];
  const metrics = calculateDailyMetrics(data, now);
  assert.equal(metrics.completedBlocks, 1); assert.equal(metrics.executedSeconds, 0); assert.equal(metrics.plannedQuestions, 10);
});

test("session recording is idempotent and schedules tasks without duplicate pending tasks", () => {
  let index = 0; const makeId = () => `task-${++index}`;
  const first = recordSession(base(), session("a", "Redes", 5, 4), makeId);
  assert.equal(first.tasks.length, 2); assert.equal(first.tasks[0].dueDate, "2026-09-12");
  assert.equal(recordSession(first, session("a", "Redes", 5, 4), makeId), first);
  const second = recordSession(first, session("b", "Redes"), makeId); assert.equal(second.tasks.length, 2);
  const completed = completeTask(second, first.tasks[0].id, "good", now, makeId);
  assert.equal(completed.tasks.filter((task) => task.kind === "review" && !task.completedAt).length, 1);
  assert.equal(completed.tasks.find((task) => task.id === first.tasks[0].id).rating, "good");
});

test("invalid counts and cross-subject topics are rejected", () => {
  const data = base(); data.sessions = [session("a", "Redes", 1, 2)]; assert.equal(studyDataSchema.safeParse(data).success, false);
  data.sessions = [{ ...session("b", "RLM"), topicId: "ipv4" }]; assert.equal(studyDataSchema.safeParse(data).success, false);
});

test("future evidence does not alter current accuracy", () => {
  const data = base(); data.attempts = [attempt("past", false), attempt("future", true, "2026-09-12T14:00:00.000Z")];
  assert.equal(calculateDailyMetrics(data, now).questions, 1);
  assert.equal(buildPriorityContext(data, now).priorities.find((item) => item.subjectId === "Redes").evidence.questions, 1);
});


test("moving and rebalancing preserve history, content and other weeks", () => {
  const blocks = Array.from({ length: 7 }, (_, index) => ({ id: String(index), date: "2026-09-07", subjectId: "Redes", topicId: "ipv4", minutes: 30, description: "Revisar", done: index === 0, plannedQuestions: 5, sessionType: "study" }));
  const original = structuredClone(blocks);
  const moved = movePlanBlock(blocks, "2", "2026-09-06", "1");
  assert.equal(moved.find((block) => block.id === "2").date, "2026-09-06");
  assert.deepEqual(moved.slice(0,3).map((block) => block.id), ["0","2","1"]);
  const result = balancePlanBlocks(blocks, "2026-09-06");
  assert.deepEqual(result[0], blocks[0]);
  assert.equal(new Set(result.map((block) => block.date)).size, 7);
  assert.deepEqual(blocks, original);
  assert.deepEqual(balancePlanBlocks(blocks, "2026-09-13"), blocks);
});
