import { z } from "zod";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const subjectSchema = z.object({
  name: z.string().max(100),
  weight: z.number().min(0.1).max(100).nullable(),
  questionCount: z.number().int().min(0).max(10000).nullable(),
  topics: z.array(z.string().max(200)).max(500),
  sourcePages: z.array(z.number().int().min(1)).max(80),
});

const extractedSchema = z.object({
  title: z.string().max(160),
  board: z.string().max(160),
  organization: z.string().max(200),
  role: z.string().max(200),
  examDate: z.string().nullable(),
  questionsTotal: z.number().int().min(0).max(10000).nullable(),
  cutoffScore: z.number().min(0).max(100000).nullable(),
  subjects: z.array(subjectSchema).max(200),
  warnings: z.array(z.string().max(500)).max(50),
});

type Extraction = z.infer<typeof extractedSchema>;

const looseSubjectSchema = z.object({
  name: z.coerce.string().catch(""),
  weight: z.union([z.coerce.number(), z.null()]).optional().catch(null),
  questionCount: z.union([z.coerce.number().int(), z.null()]).optional().catch(null),
  topics: z.array(z.coerce.string()).optional().catch([]),
  sourcePages: z.array(z.coerce.number().int()).optional().catch([]),
}).passthrough();

const looseExtractionSchema = z.object({
  title: z.coerce.string().optional().catch(""),
  board: z.coerce.string().optional().catch(""),
  organization: z.coerce.string().optional().catch(""),
  role: z.coerce.string().optional().catch(""),
  examDate: z.union([z.coerce.string(), z.null()]).optional().catch(null),
  questionsTotal: z.union([z.coerce.number().int(), z.null()]).optional().catch(null),
  cutoffScore: z.union([z.coerce.number(), z.null()]).optional().catch(null),
  subjects: z.array(looseSubjectSchema).optional().catch([]),
  warnings: z.array(z.coerce.string()).optional().catch([]),
}).passthrough();

const extractionJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    board: { type: "string" },
    organization: { type: "string" },
    role: { type: "string" },
    examDate: { anyOf: [{ type: "string" }, { type: "null" }] },
    questionsTotal: { anyOf: [{ type: "integer" }, { type: "null" }] },
    cutoffScore: { anyOf: [{ type: "number" }, { type: "null" }] },
    subjects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          weight: { anyOf: [{ type: "number" }, { type: "null" }] },
          questionCount: { anyOf: [{ type: "integer" }, { type: "null" }] },
          topics: { type: "array", items: { type: "string" } },
          sourcePages: { type: "array", items: { type: "integer" } },
        },
        required: ["name", "weight", "questionCount", "topics", "sourcePages"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["title", "board", "organization", "role", "examDate", "questionsTotal", "cutoffScore", "subjects", "warnings"],
} as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR");

async function extractPdfPages(bytes: Buffer) {
  let pageNumber = 0;
  const pages: string[] = [];
  await pdf(bytes, {
    pagerender: async (pageData) => {
      pageNumber += 1;
      const content = await pageData.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push(`[PAGE ${pageNumber}]\n${text}`);
      return `\n[PAGE ${pageNumber}]\n${text}\n`;
    },
  });
  return pages.filter((page) => page.length > 20);
}

function selectRelevantPages(pages: string[]) {
  const priorityTerms = [
    "conteúdo programático", "conteudo programatico", "conhecimentos específicos",
    "conhecimentos especificos", "conhecimentos gerais", "disciplinas", "matérias",
    "materias", "programa", "cargo", "perfil", "prova objetiva", "questões",
    "questoes", "peso", "pontuação", "pontuacao", "banca", "data da prova",
    "anexo", "conteúdos", "conteudos", "objetiva", "estrutura da prova",
  ];

  const scores = pages.map((page, index) => {
    const lower = page.toLocaleLowerCase("pt-BR");
    return { index, score: priorityTerms.reduce((total, term) => total + (lower.includes(term) ? 1 : 0), 0) };
  });
  const selected = new Set<number>();
  for (let index = 0; index < Math.min(3, pages.length); index += 1) selected.add(index);
  scores
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 18)
    .forEach(({ index }) => {
      selected.add(index);
      if (index > 0) selected.add(index - 1);
      if (index + 1 < pages.length) selected.add(index + 1);
    });
  return [...selected].sort((a, b) => a - b).map((index) => pages[index]).filter(Boolean);
}

function makeChunks(pages: string[], maxChars = 6200) {
  const chunks: string[] = [];
  let current = "";
  for (const page of pages) {
    if (current && current.length + page.length + 2 > maxChars) {
      chunks.push(current);
      current = "";
    }
    if (page.length > maxChars) {
      const header = page.match(/^\[PAGE \d+\]/)?.[0] ?? "";
      const body = page.slice(header.length);
      for (let offset = 0; offset < body.length; offset += maxChars - 80) {
        const piece = `${header}\n${body.slice(offset, offset + maxChars - 80)}`;
        if (current) { chunks.push(current); current = ""; }
        chunks.push(piece);
      }
      continue;
    }
    current += `${current ? "\n\n" : ""}${page}`;
  }
  if (current) chunks.push(current);
  return chunks.slice(0, 8);
}

function parseRetryMs(detail: string, header: string | null) {
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.ceil(seconds * 1000) + 800;
  }
  const match = detail.match(/try again in\s+([\d.]+)s/i);
  return match ? Math.ceil(Number(match[1]) * 1000) + 800 : 18_000;
}

async function callGroq(model: string, sourceText: string, chunkIndex: number, chunkCount: number) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(90000),
      body: JSON.stringify({
        model,
        temperature: 0,
        reasoning_effort: "low",
        messages: [
          {
            role: "system",
            content: [
              "Você extrai estrutura de editais para um sistema de estudos.",
              "Use somente fatos presentes neste trecho do PDF e nunca complete lacunas.",
              "Marcadores [PAGE N] indicam a página de origem.",
              "Extraia matérias e tópicos cobrados, além de metadados explícitos.",
              "Quando um valor não estiver neste trecho, use null ou string vazia.",
              "Preserve a nomenclatura do edital e evite duplicar tópicos equivalentes.",
              `Este é o bloco ${chunkIndex + 1} de ${chunkCount}; não assuma que contém o documento inteiro.`,
            ].join(" "),
          },
          { role: "user", content: `Extraia somente o que estiver comprovado neste trecho:\n\n${sourceText}` },
        ],
        response_format: { type: "json_schema", json_schema: { name: "exam_extraction", strict: true, schema: extractionJsonSchema } },
      }),
    });

    if (response.ok) {
      const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
      const content = body.choices?.[0]?.message?.content;
      if (!content) {
        if (attempt === 2) return null;
        continue;
      }
      try {
        const loose = looseExtractionSchema.safeParse(JSON.parse(content));
        if (!loose.success) {
          console.error("Groq exam schema could not be normalized", loose.error.issues);
          if (attempt === 2) return null;
          continue;
        }
        const normalized = {
          title: (loose.data.title ?? "").trim().slice(0, 160),
          board: (loose.data.board ?? "").trim().slice(0, 160),
          organization: (loose.data.organization ?? "").trim().slice(0, 200),
          role: (loose.data.role ?? "").trim().slice(0, 200),
          examDate: loose.data.examDate && /^\d{4}-\d{2}-\d{2}$/.test(loose.data.examDate) ? loose.data.examDate : null,
          questionsTotal: loose.data.questionsTotal != null && loose.data.questionsTotal >= 0 && loose.data.questionsTotal <= 10000 ? loose.data.questionsTotal : null,
          cutoffScore: loose.data.cutoffScore != null && loose.data.cutoffScore >= 0 && loose.data.cutoffScore <= 100000 ? loose.data.cutoffScore : null,
          subjects: (loose.data.subjects ?? []).map((subject) => ({
            name: subject.name.trim().slice(0, 100),
            weight: subject.weight != null && subject.weight >= 0.1 && subject.weight <= 100 ? subject.weight : null,
            questionCount: subject.questionCount != null && subject.questionCount >= 0 && subject.questionCount <= 10000 ? subject.questionCount : null,
            topics: (subject.topics ?? []).map((topic) => topic.trim().replace(/\s+/g, " ")).filter((topic) => topic.length >= 2 && topic.length <= 200).slice(0, 500),
            sourcePages: (subject.sourcePages ?? []).filter((page) => page >= 1).slice(0, 80),
          })).filter((subject) => subject.name.length >= 2),
          warnings: (loose.data.warnings ?? []).map((warning) => warning.trim().slice(0, 500)).filter(Boolean).slice(0, 50),
        };
        const parsed = extractedSchema.safeParse(normalized);
        if (!parsed.success) {
          console.error("Groq exam normalized schema invalid", parsed.error.issues);
          if (attempt === 2) return null;
          continue;
        }
        return parsed.data;
      } catch (schemaError) {
        console.error("Groq exam JSON parse failed", schemaError);
        if (attempt === 2) return null;
        continue;
      }
    }

    const detail = await response.text().catch(() => "");
    console.error("Groq exam chunk failed", response.status, detail.slice(0, 800));
    if (response.status === 429 || detail.includes("rate_limit_exceeded") || detail.includes("tokens per minute")) {
      if (attempt === 2) throw new Error("groq_rate_limit");
      await sleep(parseRetryMs(detail, response.headers.get("retry-after")));
      continue;
    }
    throw new Error(`groq_${response.status}`);
  }
  throw new Error("groq_failed");
}

function mergeExtractions(parts: Extraction[]) {
  const result: Extraction = { title: "", board: "", organization: "", role: "", examDate: null, questionsTotal: null, cutoffScore: null, subjects: [], warnings: [] };
  const subjects = new Map<string, Extraction["subjects"][number]>();

  for (const part of parts) {
    if (!result.title && part.title) result.title = part.title;
    if (!result.board && part.board) result.board = part.board;
    if (!result.organization && part.organization) result.organization = part.organization;
    if (!result.role && part.role) result.role = part.role;
    if (result.examDate == null && part.examDate) result.examDate = part.examDate;
    if (result.questionsTotal == null && part.questionsTotal != null) result.questionsTotal = part.questionsTotal;
    if (result.cutoffScore == null && part.cutoffScore != null) result.cutoffScore = part.cutoffScore;
    result.warnings.push(...part.warnings);

    for (const subject of part.subjects) {
      const key = normalize(subject.name);
      if (!key) continue;
      const current = subjects.get(key);
      if (!current) {
        subjects.set(key, { ...subject, topics: [...new Set(subject.topics.map((topic) => topic.trim()).filter(Boolean))], sourcePages: [...new Set(subject.sourcePages)].sort((a, b) => a - b) });
        continue;
      }
      subjects.set(key, {
        ...current,
        weight: current.weight ?? subject.weight,
        questionCount: current.questionCount ?? subject.questionCount,
        topics: [...new Map([...current.topics, ...subject.topics].map((topic) => [normalize(topic), topic.trim()])).values()].filter(Boolean),
        sourcePages: [...new Set([...current.sourcePages, ...subject.sourcePages])].sort((a, b) => a - b),
      });
    }
  }
  result.subjects = [...subjects.values()];
  result.warnings = [...new Set(result.warnings.map((warning) => warning.trim()).filter(Boolean))].slice(0, 50);
  return result;
}

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) return Response.json({ error: "Entre na sua conta para importar um edital." }, { status: 401 });
  if (!process.env.GROQ_API_KEY) return Response.json({ error: "A extração automática do edital ainda não está configurada no servidor. Falta GROQ_API_KEY." }, { status: 503 });

  try {
    const supabase = getServerSupabaseClient(token);
    const { data: auth, error: authError } = await supabase.auth.getUser(token);
    if (authError || !auth.user) return Response.json({ error: "Sessão inválida." }, { status: 401 });

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Selecione um arquivo PDF." }, { status: 400 });
    if (file.type !== "application/pdf") return Response.json({ error: "O arquivo precisa ser um PDF." }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return Response.json({ error: "Use um PDF de até 20 MB." }, { status: 413 });

    const pages = await extractPdfPages(Buffer.from(await file.arrayBuffer()));
    if (!pages.length || pages.join("").length < 200) return Response.json({ error: "Não consegui extrair texto suficiente deste PDF. Se ele for escaneado como imagem, será necessário OCR." }, { status: 422 });

    const relevantPages = selectRelevantPages(pages);
    const chunks = makeChunks(relevantPages);
    if (!chunks.length) return Response.json({ error: "Não encontrei trechos suficientes para analisar neste edital." }, { status: 422 });

    const model = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
    const parts: Extraction[] = [];
    let failedChunks = 0;
    for (let index = 0; index < chunks.length; index += 1) {
      const part = await callGroq(model, chunks[index], index, chunks.length);
      if (part) parts.push(part);
      else failedChunks += 1;
      if (index + 1 < chunks.length) await sleep(12_000);
    }
    if (!parts.length) return Response.json({ error: "A IA não conseguiu estruturar nenhum trecho deste PDF. Você ainda pode cadastrar matérias e tópicos manualmente." }, { status: 422 });

    const extraction = mergeExtractions(parts);
    extraction.warnings.push(`O edital foi analisado em ${chunks.length} bloco(s). ${failedChunks ? `${failedChunks} bloco(s) não puderam ser estruturados e foram ignorados. ` : ""}Revise cargo, pesos e tópicos antes de salvar.`);

    return Response.json({ extraction, filename: file.name, provider: "groq", model, chunksProcessed: parts.length, chunksFailed: failedChunks, pagesConsidered: relevantPages.length, partial: failedChunks > 0 });
  } catch (error) {
    console.error("Exam import failed", error);
    if (error instanceof Error && error.message === "groq_rate_limit") {
      return Response.json({ error: "A IA atingiu o limite temporário da conta durante a leitura. O Studify tentou aguardar e continuar, mas o limite permaneceu ativo. Tente novamente em cerca de 1 minuto." }, { status: 429 });
    }
    return Response.json({ error: "Não foi possível analisar este PDF agora." }, { status: 502 });
  }
}
