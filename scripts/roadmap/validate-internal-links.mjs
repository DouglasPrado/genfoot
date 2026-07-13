import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, resolve } from "node:path";

const roots = process.argv.slice(2);

if (roots.length === 0) {
  console.error(
    "Uso: node scripts/roadmap/validate-internal-links.mjs <diretório> [...]",
  );
  process.exit(2);
}

function markdownFiles(path) {
  if (!existsSync(path)) return [];
  if (!statSync(path).isDirectory())
    return extname(path) === ".md" ? [path] : [];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    markdownFiles(resolve(path, entry.name)),
  );
}

const failures = [];
let checked = 0;

for (const file of roots.flatMap(markdownFiles)) {
  const source = readFileSync(file, "utf8");
  const links = source.matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/g);

  for (const match of links) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    if (
      !rawTarget ||
      rawTarget.startsWith("#") ||
      /^[a-z][a-z+.-]*:/i.test(rawTarget)
    )
      continue;

    checked += 1;
    const decoded = decodeURIComponent(rawTarget.split("#", 1)[0]);
    const target = resolve(dirname(file), decoded);
    if (!existsSync(target)) failures.push(`${file}: ${rawTarget}`);
  }
}

if (failures.length > 0) {
  console.error(`Links internos inválidos: ${failures.length}`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Links internos válidos: ${checked} referências verificadas.`);
