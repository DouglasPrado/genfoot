#!/usr/bin/env node

import {
  argumentValue,
  findCycle,
  parseDependencyGraph,
  readUtf8,
  runCli,
} from "./roadmap-utils.mjs";

runCli(() => {
  const graphPath = argumentValue("--graph");
  const edges = parseDependencyGraph(readUtf8(graphPath));
  if (edges.length === 0)
    throw new Error("Grafo sem dependências reconhecíveis.");

  for (const { from, to, kind } of edges) {
    if (from === to)
      throw new Error(`Autodependência proibida: ${from} → ${to}.`);
    if (!["STARTS_AFTER", "FINISHES_AFTER", "CONTRACT_ONLY"].includes(kind)) {
      throw new Error(
        `Tipo de dependência inválido em ${from} → ${to}: ${kind}.`,
      );
    }
  }

  const cycle = findCycle(edges);
  if (cycle) throw new Error(`Ciclo detectado: ${cycle.join(" → ")}.`);

  const nodes = new Set(edges.flatMap(({ from, to }) => [from, to]));
  process.stdout.write(
    `Grafo acíclico válido: ${nodes.size} nós, ${edges.length} arestas.\n`,
  );
});
