import { z } from "zod";

export const visibilitySchema = z.enum(["private", "group", "public"]);
export const postKindSchema = z.enum(["note", "summary", "progress", "session", "goal", "membership"]);
const groupSchema = z.object({
  id: z.string(), name: z.string().trim().min(1).max(80),
  objective: z.string().trim().min(1).max(160), description: z.string().max(1000),
  createdAt: z.string(), demo: z.boolean(),
});
const memberSchema = z.object({ groupId: z.string(), userId: z.string(), name: z.string(), joinedAt: z.string() });
const progressSchema = z.object({ seconds: z.number().nonnegative(), plannedSeconds: z.number().nonnegative(), execution: z.number().nonnegative().nullable() });
const postSchema = z.object({
  id: z.string(), authorId: z.string(), authorName: z.string(), groupId: z.string().nullable(),
  kind: postKindSchema, visibility: visibilitySchema,
  title: z.string().trim().min(1).max(160), body: z.string().max(5000), createdAt: z.string(),
  demo: z.boolean(), progress: progressSchema.nullable(), sessionId: z.string().nullable(),
});
export const communitySchema = z.object({ version: z.literal(1), groups: z.array(groupSchema), members: z.array(memberSchema), posts: z.array(postSchema) });
export type StudyGroup = z.infer<typeof groupSchema>;
export type GroupMember = z.infer<typeof memberSchema>;
export type CommunityPost = z.infer<typeof postSchema>;
export type StudyProgress = z.infer<typeof progressSchema>;
export type SharedNote = CommunityPost & { kind: "note" };
export type SharedSummary = CommunityPost & { kind: "summary" };
export type CommunityProfile = { userId: string; name: string; currentGoalId: string | null };
export type CommunityData = z.infer<typeof communitySchema>;
export const kindLabels: Record<CommunityPost["kind"], string> = { note: "Nota", summary: "Resumo", progress: "Progresso", session: "Sessão concluída", goal: "Atualização de meta", membership: "Entrada em grupo" };
export const visibilityLabels = { private: "Privado", group: "Grupo", public: "Público" };

export function initialCommunity(): CommunityData {
  const createdAt = "2026-09-01T12:00:00.000Z";
  const names = ["Dataprev 2026", "OAB", "ENEM", "CCNA", "Front-end / React", "Segurança Cibernética"];
  const goals = ["Preparação para tecnologia e concursos", "Revisar os fundamentos do Direito", "Organizar a preparação para o ENEM", "Consolidar redes e praticar laboratórios", "Estudar interfaces e desenvolvimento web", "Aprofundar defesa e segurança de sistemas"];
  const groups = names.map((name, index) => ({ id: `demo-${index}`, name, objective: goals[index], description: "Um espaço de demonstração para organizar estudos, trocar notas e acompanhar o trabalho em conjunto.", createdAt, demo: true }));
  const members = groups.flatMap((group) => ["Ana", "Rafael"].map((name, index) => ({ groupId: group.id, userId: `demo-person-${index}`, name, joinedAt: createdAt })));
  const kinds: CommunityPost["kind"][] = ["summary", "session", "progress", "goal", "membership", "note"];
  const posts = groups.map((group, index): CommunityPost => ({
    id: `demo-post-${index}`, authorId: "demo-person-0", authorName: "Ana", groupId: group.id,
    kind: kinds[index], visibility: "public", title: ["Como organizar a revisão da semana", "Bloco de leitura concluído", "Um passo por vez", "Meta da semana definida", "Cheguei para estudar junto", "Notas para a próxima revisão"][index],
    body: "Conteúdo fictício para explorar a experiência de colaboração. Os grupos e participantes desta base são demonstrativos.",
    createdAt, demo: true, progress: index === 2 ? { seconds: 3600, plannedSeconds: 7200, execution: 0.5 } : null, sessionId: null,
  }));
  return { version: 1, groups, members, posts };
}

export function visiblePosts(data: CommunityData, userId: string, groupId?: string) {
  const memberships = new Set(data.members.filter((member) => member.userId === userId).map((member) => member.groupId));
  return data.posts.filter((post) => (!groupId || post.groupId === groupId) && (
    post.authorId === userId || post.visibility === "public" || (post.visibility === "group" && post.groupId && memberships.has(post.groupId))
  )).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
