import { readFileSync } from "node:fs";

export const FEATURE_ID_PATTERN = /^(?:FND|BC|X|VAL|OPS|GP)-\d{3}$/;

export function readUtf8(path) {
  return readFileSync(path, "utf8");
}

export function argumentValue(name, arguments_ = process.argv.slice(2)) {
  const index = arguments_.indexOf(name);
  if (index < 0 || index + 1 >= arguments_.length) {
    throw new Error(`Argumento obrigatório ausente: ${name}`);
  }
  return arguments_[index + 1];
}

export function parseFeatureIndex(contents) {
  const features = [];
  let current = null;
  let readingPrerequisites = false;

  for (const line of contents.split(/\r?\n/u)) {
    const idMatch = line.match(/^\s{2}- id:\s*(\S+)\s*$/u);
    if (idMatch) {
      if (current) features.push(current);
      current = { id: idMatch[1] };
      readingPrerequisites = false;
      continue;
    }
    if (!current) continue;
    if (readingPrerequisites) {
      current.prerequisites.push(
        ...(line.match(/(?:FND|BC|X|VAL|OPS|GP)-\d{3}/gu) ?? []),
      );
      if (/\]\s*$/u.test(line)) readingPrerequisites = false;
      continue;
    }
    const fieldMatch = line.match(
      /^\s{4}(slug|status|milestone|childDirectory|contractFreeze):\s*["']?([^"']+?)["']?\s*$/u,
    );
    if (fieldMatch) current[fieldMatch[1]] = fieldMatch[2];
    const waveMatch = line.match(/^\s{4}wave:\s*(\d+)\s*$/u);
    if (waveMatch) current.wave = Number(waveMatch[1]);
    const prerequisitesMatch = line.match(
      /^\s{4}prerequisites:\s*\[(.*)\]\s*$/u,
    );
    if (prerequisitesMatch) {
      current.prerequisites = prerequisitesMatch[1]
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
    }
    if (/^\s{4}prerequisites:\s*$/u.test(line)) {
      current.prerequisites = [];
      readingPrerequisites = true;
    }
  }
  if (current) features.push(current);
  return features;
}

export function parseDependencyGraph(contents) {
  const edges = [];
  let current = null;

  const flush = () => {
    if (current?.from && current?.to) edges.push(current);
    current = null;
  };

  for (const line of contents.split(/\r?\n/u)) {
    const inline = line.match(
      /^\s*-\s*\{\s*from:\s*([^,}\s]+),\s*to:\s*([^,}\s]+),\s*kind:\s*([^,}\s]+)/u,
    );
    if (inline) {
      flush();
      edges.push({ from: inline[1], to: inline[2], kind: inline[3] });
      continue;
    }

    if (/^\s*-\s*\{\s*$/u.test(line)) {
      flush();
      current = {};
      continue;
    }

    if (current && /^\s*\}\s*$/u.test(line)) {
      flush();
      continue;
    }

    const start = line.match(/^\s*- from:\s*(\S+)\s*$/u);
    if (start) {
      flush();
      current = { from: start[1] };
      continue;
    }
    if (!current) continue;
    const field = line.match(/^\s+(from|to|kind):\s*([^,\s]+),?\s*$/u);
    if (field) current[field[1]] = field[2];
  }
  flush();
  return edges;
}

export function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

export function findCycle(edges) {
  const adjacency = new Map();
  const nodes = new Set();
  for (const { from, to } of edges) {
    nodes.add(from);
    nodes.add(to);
    const targets = adjacency.get(from) ?? [];
    targets.push(to);
    adjacency.set(from, targets);
  }

  const visiting = new Set();
  const visited = new Set();
  const path = [];

  const visit = (node) => {
    if (visiting.has(node)) {
      const start = path.indexOf(node);
      return [...path.slice(start), node];
    }
    if (visited.has(node)) return null;
    visiting.add(node);
    path.push(node);
    for (const target of adjacency.get(node) ?? []) {
      const cycle = visit(target);
      if (cycle) return cycle;
    }
    path.pop();
    visiting.delete(node);
    visited.add(node);
    return null;
  };

  for (const node of nodes) {
    const cycle = visit(node);
    if (cycle) return cycle;
  }
  return null;
}

export function runCli(action) {
  try {
    action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`ERROR: ${message}\n`);
    process.exitCode = 1;
  }
}
