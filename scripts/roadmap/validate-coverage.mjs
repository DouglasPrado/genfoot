#!/usr/bin/env node

import {
  argumentValue,
  parseFeatureIndex,
  readUtf8,
  runCli,
} from "./roadmap-utils.mjs";

runCli(() => {
  const indexPath = argumentValue("--index");
  const sourceMapPath = argumentValue("--source-map");
  const features = parseFeatureIndex(readUtf8(indexPath));
  const sourceMap = readUtf8(sourceMapPath);
  const ids = new Set(features.map(({ id }) => id));

  const expected = [
    "FND-001",
    ...range("BC", 12),
    ...range("X", 3),
    "VAL-001",
    "OPS-001",
    ...range("GP", 16),
  ];
  const missing = expected.filter((id) => !ids.has(id));
  const sourceMissing = expected.filter(
    (id) => !new RegExp(`\\b${id}\\b`, "u").test(sourceMap),
  );

  if (features.length !== 34 || missing.length > 0) {
    throw new Error(
      `Cobertura exige 34 features, 12 bounded contexts, 3 concerns e 16 golden paths; ausentes: ${missing.join(", ") || "contagem divergente"}.`,
    );
  }
  if (sourceMissing.length > 0) {
    throw new Error(`Source map sem IDs: ${sourceMissing.join(", ")}.`);
  }

  process.stdout.write(
    "Cobertura válida: 34 features, 12 bounded contexts, 3 concerns e 16 golden paths.\n",
  );
});

function range(prefix, maximum) {
  return Array.from(
    { length: maximum },
    (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`,
  );
}
