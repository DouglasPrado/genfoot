// Utilidades puras compartilhadas entre o parser de conteúdo (build) e os componentes.

/** Gera um slug estável a partir de um texto pt-BR (remove acentos, minúsculas, hifeniza). */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Converte markdown em texto simples (para índice de busca e descrições). */
export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " ") // blocos de código
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // imagens
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // links -> texto
    .replace(/^>\s?/gm, "") // citações
    .replace(/^#{1,6}\s+/gm, "") // títulos
    .replace(/^\s*[-*+]\s+/gm, "") // marcadores de lista
    .replace(/^\s*\d+\.\s+/gm, "") // listas numeradas
    .replace(/\|/g, " ") // tabelas
    .replace(/[*_~]/g, "") // ênfase
    .replace(/\s+/g, " ")
    .trim();
}

/** Primeiro parágrafo "de verdade" de um markdown (ignora títulos, citações, listas). */
export function firstParagraph(md: string): string {
  const blocks = md.split(/\n{2,}/);
  for (const b of blocks) {
    const t = b.trim();
    if (!t) continue;
    if (/^(#{1,6}\s|>|[-*+]\s|\d+\.\s|\||---)/.test(t)) continue;
    return stripMarkdown(t);
  }
  return "";
}

export function truncate(text: string, max = 160): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}
