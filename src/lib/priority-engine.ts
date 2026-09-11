import { addDays, daysBetween, localDate, weekDates, type StudyData, type StudySession, type QuestionAttempt } from "./study-data.ts";

export const ENGINE_VERSION = "1.0.0";
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function questionMetrics(sessions: StudySession[], attempts: QuestionAttempt[] = []) {
  const questions = sessions.reduce((total, session) => total + session.questions, 0) + attempts.length;
  const correct = sessions.reduce((total, session) => total + session.correct, 0) + attempts.filter((attempt) => attempt.isCorrect).length;
  return { questions, correct, accuracy: questions ? correct / questions : null };
}

export function calculateMetrics(data: StudyData, now = new Date()) {
  const { start, end } = weekDates(now);
  const today = localDate(now);
  const sessions = data.sessions.filter((session) => {
    const day = localDate(new Date(session.endedAt));
    return day >= start && day <= end && new Date(session.endedAt) <= now;
  });
  const blocks = data.blocks.filter((block) => block.date >= start && block.date <= end);
  const plannedSeconds = blocks.reduce((sum, block) => sum + block.minutes * 60, 0);
  const executedSeconds = sessions.reduce((sum, session) => sum + session.seconds, 0);
  const attempts = data.attempts.filter((attempt) => {
    const day = localDate(new Date(attempt.answeredAt));
    return day >= start && day <= end && new Date(attempt.answeredAt) <= now;
  });
  const questions = questionMetrics(sessions, attempts);
  return {
    weekStart: start, weekEnd: end, plannedSeconds, executedSeconds,
    executionRate: plannedSeconds ? executedSeconds / plannedSeconds : null,
    completedBlocks: blocks.filter((block) => block.done).length, totalBlocks: blocks.length,
    ...questions,
    overdueReviews: data.tasks.filter((task) => task.kind === "review" && !task.completedAt && task.dueDate < today).length,
    pendingRecalls: data.tasks.filter((task) => task.kind === "recall" && !task.completedAt && task.dueDate <= today).length,
    bySubject: data.subjects.map((subject) => ({
      subjectId: subject.id, name: subject.name,
      plannedSeconds: blocks.filter((block) => block.subjectId === subject.id).reduce((sum, block) => sum + block.minutes * 60, 0),
      executedSeconds: sessions.filter((session) => session.subjectId === subject.id).reduce((sum, session) => sum + session.seconds, 0),
      ...questionMetrics(sessions.filter((session) => session.subjectId === subject.id), attempts.filter((attempt) => attempt.subjectId === subject.id)),
    })),
    daily: Array.from({ length: 7 }, (_, index) => {
      const date = addDays(start, index);
      return { date, plannedSeconds: blocks.filter((block) => block.date === date).reduce((sum, block) => sum + block.minutes * 60, 0), executedSeconds: sessions.filter((session) => localDate(new Date(session.endedAt)) === date).reduce((sum, session) => sum + session.seconds, 0) };
    }),
  };
}

export function buildPriorityContext(data: StudyData, now = new Date()) {
  const today = localDate(now);
  const daysToExam = data.goal?.examDate ? daysBetween(today, data.goal.examDate) : null;
  const metrics = calculateMetrics(data, now);
  const maxWeight = Math.max(1, ...data.subjects.map((subject) => subject.weight));
  const priorities = data.subjects.map((subject) => {
    const history = data.sessions.filter((session) => session.subjectId === subject.id && new Date(session.endedAt) <= now);
    const recent = history.filter((session) => daysBetween(localDate(new Date(session.endedAt)), today) < 7);
    const previous = history.filter((session) => {
      const age = daysBetween(localDate(new Date(session.endedAt)), today);
      return age >= 7 && age < 14;
    });
    const attempts = data.attempts.filter((attempt) => attempt.subjectId === subject.id && new Date(attempt.answeredAt) <= now);
    const recentAttempts = attempts.filter((attempt) => daysBetween(localDate(new Date(attempt.answeredAt)), today) < 7);
    const previousAttempts = attempts.filter((attempt) => { const age = daysBetween(localDate(new Date(attempt.answeredAt)), today); return age >= 7 && age < 14; });
    const recentMetrics = questionMetrics(recent, recentAttempts);
    const previousMetrics = questionMetrics(previous, previousAttempts);
    const allMetrics = questionMetrics(history, attempts);
    const measured = recentMetrics.questions > 0 ? recentMetrics : allMetrics;
    const trend = recentMetrics.questions >= 5 && previousMetrics.questions >= 5 && recentMetrics.accuracy !== null && previousMetrics.accuracy !== null
      ? recentMetrics.accuracy - previousMetrics.accuracy : null;
    const lastStudiedAt = history.reduce<string | null>((last, session) => !last || session.endedAt > last ? session.endedAt : last, null);
    const daysSinceStudy = lastStudiedAt ? Math.max(0, daysBetween(localDate(new Date(lastStudiedAt)), today)) : null;
    const subjectTasks = data.tasks.filter((task) => task.subjectId === subject.id && !task.completedAt && task.dueDate <= today);
    const overdueReviews = subjectTasks.filter((task) => task.kind === "review" && task.dueDate < today);
    const dueReviews = subjectTasks.filter((task) => task.kind === "review");
    const recalls = subjectTasks.filter((task) => task.kind === "recall");
    const overdueDays = Math.max(0, ...overdueReviews.map((task) => daysBetween(task.dueDate, today)));
    const week = metrics.bySubject.find((item) => item.subjectId === subject.id)!;
    const dueBlocks = data.blocks.filter((block) => block.subjectId === subject.id && block.date >= metrics.weekStart && block.date <= today);
    const duePlannedSeconds = dueBlocks.reduce((sum, block) => sum + block.minutes * 60, 0);
    const executionGap = duePlannedSeconds ? clamp(1 - week.executedSeconds / duePlannedSeconds) : 0;
    const confidence = measured.questions / (measured.questions + 20);
    const weakness = measured.accuracy === null ? 0 : (1 - measured.accuracy) * confidence;
    const examUrgency = daysToExam === null || daysToExam < 0 ? 0 : clamp(1 - daysToExam / 90);
    const factors = {
      weight: 18 * subject.weight / maxWeight,
      accuracy: 20 * weakness,
      reviews: 18 * clamp(dueReviews.length / 3 + overdueDays / 14),
      recalls: 10 * clamp(recalls.length / 3),
      recency: 10 * (daysSinceStudy === null ? 1 : clamp(daysSinceStudy / 14)),
      execution: 12 * executionGap,
      recentPerformance: 7 * (trend === null ? 0 : clamp(-trend / 0.3)),
      exam: 5 * examUrgency * (weakness + executionGap) / 2,
    };
    const reasons = [`Peso ${subject.weight} no objetivo.`];
    if (overdueReviews.length) reasons.push(`${overdueReviews.length} revisão(ões) atrasada(s), até ${overdueDays} dia(s) de atraso.`);
    else if (dueReviews.length) reasons.push(`${dueReviews.length} revisão(ões) para hoje.`);
    if (recalls.length) reasons.push(`${recalls.length} recall(s) pendente(s).`);
    if (measured.accuracy !== null) reasons.push(`${Math.round(measured.accuracy * 100)}% de acerto em ${measured.questions} questões ${recentMetrics.questions ? "nos últimos 7 dias" : "registradas"}.`);
    else reasons.push("Ainda sem questões registradas; o desempenho é desconhecido.");
    if (daysSinceStudy === null) reasons.push("Ainda sem sessão registrada nesta matéria.");
    else if (daysSinceStudy > 0) reasons.push(`Último estudo há ${daysSinceStudy} dia(s).`);
    if (executionGap > 0) reasons.push(`Execução abaixo do tempo planejado até hoje.`);
    if (trend !== null && trend < 0) reasons.push(`Queda recente de ${Math.round(-trend * 100)} pontos percentuais.`);
    if (examUrgency > 0) reasons.push(`Prova em ${daysToExam} dia(s).`);
    const nextTask = [...subjectTasks].sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)).at(0) ?? null;
    const nextBlock = data.blocks.filter((block) => block.subjectId === subject.id && !block.done && block.date >= metrics.weekStart && block.date <= metrics.weekEnd)
      .sort((a, b) => a.date.localeCompare(b.date)).at(0) ?? null;
    const topicMetrics = calculateTopicMetrics(data, now);
    const availableTopics = data.topics.filter((topic) => topic.subjectId === subject.id && !topic.completed);
    const topic = data.topics.find((item) => item.id === (nextTask?.topicId ?? nextBlock?.topicId))
      ?? [...availableTopics].sort((a, b) => {
        const last = (topicId: string) => history.filter((session) => session.topicId === topicId).reduce((latest, session) => Math.max(latest, Date.parse(session.endedAt)), 0);
        const weakness = (topicId: string) => { const stats = topicMetrics.find((item) => item.topicId === topicId); return stats?.accuracy === null || !stats ? 0 : (1 - stats.accuracy) * stats.questions / (stats.questions + 20); };
        return weakness(b.id) - weakness(a.id) || last(a.id) - last(b.id) || a.title.localeCompare(b.title);
      }).at(0) ?? null;
    const minutes = nextTask ? (nextTask.kind === "recall" ? 10 : 20) : (nextBlock?.minutes ?? 45);
    return {
      subjectId: subject.id, subject: subject.name, weight: subject.weight,
      score: Math.round(Object.values(factors).reduce((sum, value) => sum + value, 0) * 10) / 10,
      factors, reasons, evidence: { ...measured, sampleConfidence: confidence, recentAccuracy: recentMetrics.accuracy, recentQuestions: recentMetrics.questions, previousAccuracy: previousMetrics.accuracy, previousQuestions: previousMetrics.questions, trend, lastStudiedAt, daysSinceStudy, overdueReviews: overdueReviews.length, dueReviews: dueReviews.length, pendingRecalls: recalls.length, plannedSeconds: week.plannedSeconds, executedSeconds: week.executedSeconds, executionGap },
      nextBlock: { subjectId: subject.id, topicId: topic?.id ?? null, topic: topic?.title ?? null, blockId: nextTask ? null : nextBlock?.id ?? null, taskId: nextTask?.id ?? null, kind: nextTask?.kind ?? nextBlock?.sessionType ?? "study", minutes, description: nextTask ? `${nextTask.kind === "recall" ? "Recuperar de memória" : "Revisar"}${topic ? `: ${topic.title}` : ` os conteúdos de ${subject.name}`}.` : nextBlock?.description || (topic ? `Estudar ${topic.title} e registrar o resultado.` : "Estudar um tópico e registrar tempo, questões e acertos.") },
    };
  }).sort((a, b) => b.score - a.score || a.subject.localeCompare(b.subject));
  return { engineVersion: ENGINE_VERSION, generatedAt: now.toISOString(), goal: data.goal, daysToExam, metrics, priorities, recommendation: priorities.at(0) ?? null };
}

export type PriorityContext = ReturnType<typeof buildPriorityContext>;

export function calculateDailyMetrics(data: StudyData, now = new Date()) {
  const today = localDate(now);
  const sessions = data.sessions.filter((session) => localDate(new Date(session.endedAt)) === today && new Date(session.endedAt) <= now);
  const attempts = data.attempts.filter((attempt) => localDate(new Date(attempt.answeredAt)) === today && new Date(attempt.answeredAt) <= now);
  const blocks = data.blocks.filter((block) => block.date === today);
  const plannedSeconds = blocks.reduce((sum, block) => sum + block.minutes * 60, 0);
  const executedSeconds = sessions.reduce((sum, session) => sum + session.seconds, 0);
  return {
    today, plannedSeconds, executedSeconds, executionRate: plannedSeconds ? executedSeconds / plannedSeconds : null,
    plannedQuestions: blocks.reduce((sum, block) => sum + block.plannedQuestions, 0), ...questionMetrics(sessions, attempts),
    completedBlocks: blocks.filter((block) => block.done).length,
    totalBlocks: blocks.length,
    recallsCompleted: data.tasks.filter((task) => task.kind === "recall" && task.completedAt && localDate(new Date(task.completedAt)) === today).length,
  };
}

export function calculateTopicMetrics(data: StudyData, now = new Date()) {
  return data.topics.map((topic) => {
    const sessions = data.sessions.filter((session) => session.topicId === topic.id && new Date(session.endedAt) <= now);
    const attempts = data.attempts.filter((attempt) => attempt.topicId === topic.id && new Date(attempt.answeredAt) <= now);
    return { topicId: topic.id, topic: topic.title, subjectId: topic.subjectId, ...questionMetrics(sessions, attempts) };
  });
}
