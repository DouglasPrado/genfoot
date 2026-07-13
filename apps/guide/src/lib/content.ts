import fs from "node:fs";
import path from "node:path";
import { GUIDE, PARTS, type PartConfig } from "./guide.config";
import { slugify, stripMarkdown, firstParagraph, truncate } from "./util";

// ---------------------------------------------------------------------------
// Pipeline de conteúdo — lê o markdown-fonte diretamente de docs/03-guia-do-jogador
// no momento do build. Não há cópia intermediária: o site renderiza exatamente o
// que está na documentação, garantindo fidelidade 100% por construção.
// ---------------------------------------------------------------------------

export type CalloutTone = "rule" | "warning" | "example" | "hidden" | "reference" | "quote";

export interface Block {
  type: "md" | "callout";
  /** para callout: rótulo original (REGRA, ATENÇÃO...) */
  label?: string;
  tone?: CalloutTone;
  /** markdown do conteúdo (para callout, já sem o rótulo) */
  markdown: string;
}

export interface TocItem {
  id: string;
  text: string;
  /** true quando é uma camada padronizada (Resumo / Regras completas / Estratégia) */
  layer: boolean;
}

export interface Chapter {
  number: number;
  title: string;
  slug: string;
  partSlug: string;
  partRoman: string;
  partTitle: string;
  route: string;
  description: string;
  blocks: Block[];
  toc: TocItem[];
  searchText: string;
}

export interface Part extends PartConfig {
  /** intro (texto de abertura, sem Status/Sumário) */
  intro: string;
  chapters: Chapter[];
}

const CALLOUTS: Record<string, CalloutTone> = {
  REGRA: "rule",
  "ATENÇÃO": "warning",
  EXEMPLO: "example",
  "COMO O JOGO AVALIA": "hidden",
  "MATERIAL DE CONSULTA": "reference",
};

const LAYERS = new Set(["Resumo", "Regras completas", "Estratégia"]);

function docsPath(): string {
  return path.resolve(process.cwd(), GUIDE.docsDir);
}

/** Mapa número-do-capítulo -> rota, para reescrever links "Cap. N" do markdown. */
function buildChapterNumberMap(): Map<number, string> {
  const map = new Map<number, string>();
  for (const part of PARTS) {
    const raw = fs.readFileSync(path.join(docsPath(), part.file), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^##\s+(\d+)\.\s+(.*)$/);
      if (m) {
        const num = Number(m[1]);
        const slug = `${num}-${slugify(m[2])}`;
        map.set(num, `/guia/${part.slug}/${slug}/`);
      }
    }
  }
  return map;
}

/** Reescreve links internos do guia (âncoras "#N-..." e "parte-XX.md") para rotas reais. */
function rewriteLinks(md: string, chapterMap: Map<number, string>): string {
  return md.replace(/\]\(([^)]+)\)/g, (whole, href: string) => {
    // Link para um capítulo por número (âncora "#12-..." ou "arquivo.md#12-...").
    const hashNum = href.match(/#(\d+)-/);
    if (hashNum) {
      const route = chapterMap.get(Number(hashNum[1]));
      if (route) return `](${route})`;
    }
    // Link para o arquivo de uma Parte (sem âncora): manda para a visão geral da Parte.
    const fileOnly = href.match(/parte-(\d+)[^)#]*\.md$/);
    if (fileOnly) {
      const idx = Number(fileOnly[1]) - 1;
      if (PARTS[idx]) return `](/guia/${PARTS[idx].slug}/)`;
    }
    return whole;
  });
}

/** Separa um markdown em blocos: citações (possíveis callouts) e markdown comum. */
function splitBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let buf: string[] = [];
  let mode: "md" | "bq" = "md";

  const flush = () => {
    const text = buf.join("\n").trim();
    buf = [];
    if (!text) return;
    if (mode === "bq") {
      const inner = text.replace(/^>\s?/gm, "").trim();
      const labelMatch = inner.match(/^\*\*([^:*]+):\*\*\s*([\s\S]*)$/);
      if (labelMatch) {
        const label = labelMatch[1].trim();
        const tone = CALLOUTS[label];
        if (tone) {
          blocks.push({ type: "callout", label, tone, markdown: labelMatch[2].trim() });
          return;
        }
      }
      blocks.push({ type: "callout", tone: "quote", markdown: inner });
      return;
    }
    blocks.push({ type: "md", markdown: text });
  };

  for (const line of lines) {
    const isQuote = /^\s*>/.test(line);
    if (isQuote && mode !== "bq") {
      flush();
      mode = "bq";
    } else if (!isQuote && mode === "bq") {
      flush();
      mode = "md";
    }
    buf.push(line);
  }
  flush();
  return blocks;
}

/** Extrai o TOC (títulos ### do corpo) na ordem em que aparecem. */
function extractToc(body: string): TocItem[] {
  const toc: TocItem[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (m) {
      const text = m[1].trim();
      toc.push({ id: slugify(text), text, layer: LAYERS.has(text) });
    }
  }
  return toc;
}

/** Remove do preâmbulo a linha de Status editorial e o bloco "## Sumário". */
function cleanIntro(preamble: string): string {
  const lines = preamble.split("\n");
  const out: string[] = [];
  let skippingSumario = false;
  for (const line of lines) {
    if (/^#\s+/.test(line)) continue; // H1 (título da Parte)
    if (/^>\s*\*\*Status:/.test(line)) continue; // linha editorial de status/fontes
    if (/^##\s+Sumário/i.test(line)) {
      skippingSumario = true;
      continue;
    }
    if (skippingSumario) {
      if (/^---\s*$/.test(line) || /^##\s+/.test(line)) {
        skippingSumario = false; // fim do sumário
      }
      continue;
    }
    out.push(line);
  }
  return out.join("\n").replace(/^\s*---\s*$/gm, "").trim();
}

let _cache: Part[] | null = null;

export function getParts(): Part[] {
  if (_cache) return _cache;
  const chapterMap = buildChapterNumberMap();
  const parts: Part[] = PARTS.map((cfg) => {
    const raw = fs.readFileSync(path.join(docsPath(), cfg.file), "utf8");
    const lines = raw.split("\n");

    // localizar limites de capítulos (## N. Título)
    const starts: { i: number; num: number; title: string }[] = [];
    lines.forEach((l, i) => {
      const m = l.match(/^##\s+(\d+)\.\s+(.*)$/);
      if (m) starts.push({ i, num: Number(m[1]), title: m[2].trim() });
    });

    const firstStart = starts.length ? starts[0].i : lines.length;
    const intro = cleanIntro(lines.slice(0, firstStart).join("\n"));

    const chapters: Chapter[] = starts.map((s, k) => {
      const end = k + 1 < starts.length ? starts[k + 1].i : lines.length;
      let body = lines.slice(s.i + 1, end).join("\n");
      // remove separadores "---" de fronteira e espaços
      body = body.replace(/^\s*---\s*$/gm, (m, off) => "").trim();
      body = rewriteLinks(body, chapterMap);

      const slug = `${s.num}-${slugify(s.title)}`;
      const blocks = splitBlocks(body);
      const toc = extractToc(body);
      const description = truncate(firstParagraph(body), 180);

      return {
        number: s.num,
        title: s.title,
        slug,
        partSlug: cfg.slug,
        partRoman: cfg.roman,
        partTitle: cfg.title,
        route: `/guia/${cfg.slug}/${slug}/`,
        description,
        blocks,
        toc,
        searchText: stripMarkdown(body),
      };
    });

    return { ...cfg, intro, chapters };
  });
  _cache = parts;
  return parts;
}

export function getAllChapters(): Chapter[] {
  return getParts().flatMap((p) => p.chapters);
}

export function getPart(slug: string): Part | undefined {
  return getParts().find((p) => p.slug === slug);
}

export function getChapter(partSlug: string, chapterSlug: string): Chapter | undefined {
  return getPart(partSlug)?.chapters.find((c) => c.slug === chapterSlug);
}

/** Capítulo anterior/próximo na sequência linear 1..42. */
export function getNeighbors(chapter: Chapter): { prev?: Chapter; next?: Chapter } {
  const all = getAllChapters();
  const idx = all.findIndex((c) => c.route === chapter.route);
  return { prev: all[idx - 1], next: all[idx + 1] };
}

export interface SearchDoc {
  title: string;
  number: number;
  part: string;
  category: string;
  route: string;
  description: string;
  text: string;
}

export function getSearchIndex(): SearchDoc[] {
  return getParts().flatMap((p) =>
    p.chapters.map((c) => ({
      title: c.title,
      number: c.number,
      part: p.title,
      category: p.category,
      route: c.route,
      description: c.description,
      text: c.searchText.slice(0, 2400),
    }))
  );
}
