import { KNOWLEDGE_BASE_ITEMS } from "@dashboard/shared";
import { Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { bedrockEmbed } from "../../lib/aws/bedrock";
import { prisma } from "../../lib/prisma/prisma";

const logger = new Logger("AssistantRag");

// Help content is global and editor-driven, so the index refreshes on a timer
// and re-embeds only the chunks whose text actually changed.
const INDEX_TTL_MS = 5 * 60 * 1000;
const TOP_K = 4;
const MIN_SCORE = 0.35;

export type HelpChunk = { id: string; title: string; body: string };

type IndexedChunk = HelpChunk & { hash: string; vector: number[] };

const vectorCache = new Map<string, { hash: string; vector: number[] }>();
let index: IndexedChunk[] = [];
let indexedAt = 0;
let building: Promise<void> | null = null;

function hashOf(text: string) {
  return createHash("sha256").update(text).digest("hex");
}

async function loadChunks(): Promise<HelpChunk[]> {
  const articles = await prisma.manualArticle.findMany({
    where: { published: true },
    select: {
      id: true,
      title: true,
      summary: true,
      category: { select: { name: true } },
      steps: {
        orderBy: { order: "asc" },
        select: { title: true, content: true },
      },
    },
  });

  const fromArticles = articles.map((article) => ({
    id: `article:${article.id}`,
    title: article.title,
    body: [
      `Category: ${article.category.name}`,
      article.summary,
      ...article.steps.map((step) =>
        step.title ? `${step.title}: ${step.content}` : step.content
      ),
    ].join("\n"),
  }));

  const fromConstants = KNOWLEDGE_BASE_ITEMS.map((item, i) => ({
    id: `kb:${i}`,
    title: item.title,
    body: item.description,
  }));

  return [...fromArticles, ...fromConstants];
}

async function buildIndex() {
  const chunks = await loadChunks();
  const next: IndexedChunk[] = [];

  for (const chunk of chunks) {
    const hash = hashOf(`${chunk.title}\n${chunk.body}`);
    const cached = vectorCache.get(chunk.id);
    const vector =
      cached?.hash === hash
        ? cached.vector
        : await bedrockEmbed(`${chunk.title}\n${chunk.body}`);
    vectorCache.set(chunk.id, { hash, vector });
    next.push({ ...chunk, hash, vector });
  }

  for (const id of vectorCache.keys()) {
    if (!chunks.some((chunk) => chunk.id === id)) vectorCache.delete(id);
  }

  index = next;
  indexedAt = Date.now();
  logger.log(`assistant.index chunks=${index.length}`);
}

async function ensureIndex() {
  if (index.length && Date.now() - indexedAt < INDEX_TTL_MS) return;
  building ??= buildIndex().finally(() => {
    building = null;
  });
  await building;
}

// Titan embeddings are returned normalized, so the dot product is the cosine.
function similarity(a: number[], b: number[]) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export async function retrieveHelpChunks(
  question: string
): Promise<HelpChunk[]> {
  await ensureIndex();
  if (!index.length) return [];

  const queryVector = await bedrockEmbed(question);
  return index
    .map((chunk) => ({ chunk, score: similarity(queryVector, chunk.vector) }))
    .filter((hit) => hit.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((hit) => hit.chunk);
}
