import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Verifica que o site servido renderiza 100% do conteúdo dos capítulos-fonte.
// Uso: sirva o build (npm run serve -- -l 4123) e rode: node scripts/verify-fidelity.mjs
// Config: BASE=http://localhost:4123 (env opcional).

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(__dirname, "../../../docs/03-guia-do-jogador");
const BASE = process.env.BASE || "http://localhost:4123";

const PARTS = [
  ["parte-01-comecando-a-jogar.md", "comecando-a-jogar"],
  ["parte-02-o-mundo-do-jogo.md", "o-mundo-do-jogo"],
  ["parte-03-gestao-do-clube.md", "gestao-do-clube"],
  ["parte-04-jogadores.md", "jogadores"],
  ["parte-05-elenco-e-mercado.md", "elenco-e-mercado"],
  ["parte-06-tatica-e-partidas.md", "tatica-e-partidas"],
  ["parte-07-competicoes-e-temporadas.md", "competicoes-e-temporadas"],
  ["parte-08-relacoes-e-ambiente.md", "relacoes-e-ambiente"],
  ["parte-09-plano-de-jogo.md", "plano-de-jogo"],
  ["parte-10-referencia.md", "referencia"],
];

const CALLOUTS = ["REGRA", "ATENÇÃO", "EXEMPLO", "COMO O JOGO AVALIA", "MATERIAL DE CONSULTA"];

const slugify = (t) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const norm = (t) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const stripMd = (md) =>
  md.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`>#|]/g, " ").replace(/\s+/g, " ").trim();

function parseChapters(raw) {
  const lines = raw.split("\n");
  const starts = [];
  lines.forEach((l, i) => {
    const m = l.match(/^##\s+(\d+)\.\s+(.*)$/);
    if (m) starts.push({ i, num: +m[1], title: m[2].trim() });
  });
  return starts.map((s, k) => {
    const end = k + 1 < starts.length ? starts[k + 1].i : lines.length;
    const body = lines.slice(s.i + 1, end).join("\n").replace(/^\s*---\s*$/gm, "").trim();
    return { num: s.num, title: s.title, slug: `${s.num}-${slugify(s.title)}`, body };
  });
}

function htmlText(html) {
  const main = html.match(/<main[^>]*class="content-col"[\s\S]*?<\/main>/);
  const region = main ? main[0] : html;
  return norm(
    region
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<style[\s\S]*?<\/style>/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
  );
}

async function main() {
  let total = 0, calloutMismatch = 0, missing = 0;
  const problems = [];
  for (const [file, partSlug] of PARTS) {
    const chapters = parseChapters(fs.readFileSync(path.join(DOCS, file), "utf8"));
    for (const ch of chapters) {
      total++;
      const route = `/guia/${partSlug}/${ch.slug}/`;
      let html;
      try {
        const res = await fetch(BASE + route);
        if (!res.ok) { problems.push(`HTTP ${res.status} :: ${route}`); continue; }
        html = await res.text();
      } catch (e) { problems.push(`FETCH FAIL ${route} :: ${e.message}`); continue; }
      const pageText = htmlText(html);

      for (const label of CALLOUTS) {
        const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const src = (ch.body.match(new RegExp(`>\\s*\\*\\*${esc}:\\*\\*`, "g")) || []).length;
        const out = (html.match(new RegExp(`callout__label">${label}<`, "g")) || []).length;
        if (src !== out) { calloutMismatch++; problems.push(`CALLOUT ${label}: src=${src} out=${out} :: ${route}`); }
      }

      const noTables = ch.body.split("\n").filter((l) => !/^\s*\|/.test(l)).join("\n");
      for (const s of stripMd(noTables).split(/(?<=[.!?;:])\s+/)) {
        const words = norm(s).split(" ");
        if (words.length < 7) continue;
        const chunk = words.slice(0, 12).join(" ");
        if (!pageText.includes(chunk)) {
          missing++;
          if (problems.filter((p) => p.startsWith("MISS")).length < 25) problems.push(`MISS :: ${route} :: "${chunk}…"`);
        }
      }
    }
  }
  console.log(`Chapters checked: ${total}`);
  console.log(`Callout mismatches: ${calloutMismatch}`);
  console.log(`Missing sentence-chunks: ${missing}`);
  if (!problems.length) console.log("\n✅ 100% coverage: every chapter present, callouts match, all text rendered.");
  else { console.log(`\n--- problems (${problems.length}) ---`); problems.slice(0, 40).forEach((p) => console.log(p)); process.exit(1); }
}

main();
