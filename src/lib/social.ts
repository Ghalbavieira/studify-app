import { z } from "zod";

const mediaSchema = z.object({ url: z.string().max(1500000).refine((url) => /^data:image\/(png|jpeg|webp);base64,/.test(url) || url.startsWith("/social/")), alt: z.string().max(200) });
const profileSchema = z.object({ id: z.string(), username: z.string(), name: z.string(), bio: z.string(), avatar: mediaSchema.nullable(), objective: z.string(), subjects: z.array(z.string()), studiedSeconds: z.number().nonnegative().nullable() });
const metricsSchema = z.object({ seconds: z.number().nonnegative(), questions: z.number().nonnegative(), accuracy: z.number().min(0).max(1).nullable() });
const postSchema = z.object({ id: z.string(), authorId: z.string(), text: z.string().max(1000), media: mediaSchema.nullable(), createdAt: z.string(), subject: z.string().nullable(), topic: z.string().nullable(), objective: z.string().nullable(), metrics: metricsSchema.nullable() }).refine((post) => post.text.trim() || post.media);
const commentSchema = z.object({ id: z.string(), postId: z.string(), authorId: z.string(), text: z.string().max(1000), media: mediaSchema.nullable(), createdAt: z.string() }).refine((comment) => comment.text.trim() || comment.media);
const actionSchema = z.object({ userId: z.string(), postId: z.string(), createdAt: z.string() });
const followSchema = z.object({ followerId: z.string(), followingId: z.string(), createdAt: z.string() });
export const socialSchema = z.object({ version: z.literal(1), profiles: z.array(profileSchema), posts: z.array(postSchema), comments: z.array(commentSchema), follows: z.array(followSchema), likes: z.array(actionSchema), reposts: z.array(actionSchema), bookmarks: z.array(actionSchema) });
export type SocialProfile = z.infer<typeof profileSchema>;
export type Post = z.infer<typeof postSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type Follow = z.infer<typeof followSchema>;
export type Like = z.infer<typeof actionSchema>;
export type Repost = z.infer<typeof actionSchema>;
export type Bookmark = z.infer<typeof actionSchema>;
export type SocialMedia = z.infer<typeof mediaSchema>;
export type SocialData = z.infer<typeof socialSchema>;
export type PostDraft = Pick<Post, "text" | "media" | "subject" | "topic" | "objective" | "metrics">;
export const normalizeSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();

export function initialSocial(): SocialData {
  const profiles: SocialProfile[] = [
    { id: "ana", username: "ana.estuda", name: "Ana Martins", bio: "Aprendendo a estudar com constância. Redes, café e uma revisão de cada vez.", objective: "Dataprev 2026", subjects: ["Redes", "Segurança"], studiedSeconds: 28800, avatar: null },
    { id: "rafael", username: "rafael.dev", name: "Rafael Costa", bio: "Anotações de quem aprende construindo. Compartilho dúvidas e descobertas sobre desenvolvimento.", objective: "Front-end / React", subjects: ["React", "JavaScript"], studiedSeconds: 18000, avatar: null },
    { id: "julia", username: "julia.revisa", name: "Júlia Almeida", bio: "Transformando conteúdo em perguntas. Por aqui: revisão ativa e resumos de Direito.", objective: "OAB", subjects: ["Direito Constitucional"], studiedSeconds: 21600, avatar: null },
  ];
  const draft = { media: null, topic: null, metrics: null };
  const posts: Post[] = [
    { ...draft, id: "post-redes", authorId: "ana", text: "Hoje fiz uma revisão de sub-redes sem consultar as anotações. O que parecia claro na leitura ficou bem diferente quando precisei explicar.\n\nMinha próxima sessão já tem destino: praticar mais CIDR. #Redes #RevisãoAtiva", createdAt: "2026-09-11T15:10:00Z", subject: "Redes", topic: "Endereçamento IP", objective: "Dataprev 2026", metrics: { seconds: 4800, questions: 18, accuracy: 14 / 18 } },
    { ...draft, id: "post-react", authorId: "rafael", text: "Uma pergunta que me ajudou a entender estado no React: esse valor precisa ser guardado ou pode ser calculado a partir de outro?\n\nMenos estado duplicado, menos bugs. #React #FrontEnd", createdAt: "2026-09-11T14:00:00Z", subject: "React", objective: "Front-end / React" },
    { ...draft, id: "post-direito", authorId: "julia", text: "Troquei a releitura por cinco perguntas sobre controle de constitucionalidade. Demorou mais, mas agora sei exatamente onde estão minhas dúvidas.\n\nComo vocês organizam as questões que erraram? #OAB #Direito", createdAt: "2026-09-11T12:30:00Z", subject: "Direito Constitucional", objective: "OAB" },
  ];
  return { version: 1, profiles, posts, comments: [{ id: "comment-demo", postId: "post-redes", authorId: "rafael", text: "Explicar em voz alta também me ajuda muito. Tento criar um exemplo diferente depois de cada revisão.", media: null, createdAt: "2026-09-11T15:30:00Z" }], follows: [], likes: [{ userId: "rafael", postId: "post-redes", createdAt: "2026-09-11T15:20:00Z" }], reposts: [], bookmarks: [] };
}

export function socialFeed(data: SocialData, userId: string, following: boolean, query = "") {
  const allowed = new Set([userId, ...data.follows.filter((item) => item.followerId === userId).map((item) => item.followingId)]);
  const search = normalizeSearch(query.trim());
  return data.posts.flatMap((post) => {
    const author = data.profiles.find((profile) => profile.id === post.authorId);
    if (search && !normalizeSearch([post.text, post.subject, post.topic, post.objective, author?.name, author?.username].join(" ")).includes(search)) return [];
    const repost = data.reposts.filter((item) => item.postId === post.id && (!following || allowed.has(item.userId))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).at(0);
    if (following && !allowed.has(post.authorId) && !repost) return [];
    return [{ post, repost, date: repost && repost.createdAt > post.createdAt ? repost.createdAt : post.createdAt }];
  }).sort((a, b) => b.date.localeCompare(a.date));
}
