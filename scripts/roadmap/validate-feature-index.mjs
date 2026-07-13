#!/usr/bin/env node

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  FEATURE_ID_PATTERN,
  argumentValue,
  duplicateValues,
  parseFeatureIndex,
  readUtf8,
  runCli,
} from "./roadmap-utils.mjs";

runCli(() => {
  const indexPath = argumentValue("--index");
  const schemaPath = argumentValue("--schema");
  const schema = JSON.parse(readUtf8(schemaPath));
  const features = parseFeatureIndex(readUtf8(indexPath));
  const allowedStatuses = new Set([
    "DELIVERED",
    "PARTIAL",
    "PLANNED",
    "BLOCKED",
    "DEFERRED",
  ]);
  const allowedMilestones = new Set(["M0", "M1", "M2", "M3", "M4"]);
  const allowedFreezeStates = new Set(["NOT_REQUIRED", "PENDING", "FROZEN"]);

  if (schema?.$schema !== "https://json-schema.org/draft/2020-12/schema") {
    throw new Error("Schema deve usar JSON Schema Draft 2020-12.");
  }
  for (const [label, values] of [
    ["ID", features.map(({ id }) => id)],
    ["slug", features.map(({ slug }) => slug)],
    ["childDirectory", features.map(({ childDirectory }) => childDirectory)],
  ]) {
    const duplicates = duplicateValues(values);
    if (duplicates.length > 0) {
      throw new Error(`${label} duplicado: ${duplicates.join(", ")}.`);
    }
  }

  for (const feature of features) {
    for (const field of [
      "id",
      "slug",
      "status",
      "milestone",
      "wave",
      "prerequisites",
      "contractFreeze",
      "childDirectory",
    ]) {
      if (feature[field] === undefined) {
        throw new Error(
          `Schema: ${feature.id ?? "feature"} sem campo ${field}.`,
        );
      }
    }
    if (!FEATURE_ID_PATTERN.test(feature.id)) {
      throw new Error(`Schema: ID inválido ${feature.id}.`);
    }
    if (!allowedStatuses.has(feature.status)) {
      throw new Error(
        `Schema: status ${feature.status} inválido em ${feature.id}.`,
      );
    }
    if (!allowedMilestones.has(feature.milestone)) {
      throw new Error(
        `Schema: milestone ${feature.milestone} inválido em ${feature.id}.`,
      );
    }
    if (!Number.isInteger(feature.wave) || feature.wave < 0) {
      throw new Error(
        `Schema: wave inválida em ${feature.id}: ${feature.wave}.`,
      );
    }
    if (!Array.isArray(feature.prerequisites)) {
      throw new TypeError(`Schema: prerequisites inválidos em ${feature.id}.`);
    }
    if (!allowedFreezeStates.has(feature.contractFreeze)) {
      throw new Error(
        `Schema: contractFreeze ${feature.contractFreeze} inválido em ${feature.id}.`,
      );
    }
    if (!/^specs\/\d{3}-[a-z0-9-]+$/u.test(feature.childDirectory)) {
      throw new Error(
        `Schema: childDirectory inválido em ${feature.id}: ${feature.childDirectory}.`,
      );
    }
  }

  if (features.length !== 34) {
    throw new Error(
      `Schema exige 34 features; encontrado: ${features.length}.`,
    );
  }

  const byId = new Map(features.map((feature) => [feature.id, feature]));
  for (const feature of features) {
    const duplicatePrerequisites = duplicateValues(feature.prerequisites);
    if (duplicatePrerequisites.length > 0) {
      throw new Error(
        `Prerequisite duplicado em ${feature.id}: ${duplicatePrerequisites.join(", ")}.`,
      );
    }
    for (const prerequisiteId of feature.prerequisites) {
      const prerequisite = byId.get(prerequisiteId);
      if (!prerequisite) {
        throw new Error(
          `Prerequisite desconhecido em ${feature.id}: ${prerequisiteId}.`,
        );
      }
      if (prerequisiteId === feature.id) {
        throw new Error(`Autodependência no índice: ${feature.id}.`);
      }
      if (prerequisite.wave >= feature.wave) {
        throw new Error(
          `Wave inválida: ${feature.id} (W${feature.wave}) não sucede ${prerequisiteId} (W${prerequisite.wave}).`,
        );
      }
    }
  }

  const graphPath = join(dirname(indexPath), "dependency-graph.yaml");
  if (existsSync(graphPath)) {
    const graphText = readUtf8(graphPath);
    for (const feature of features) {
      const graphPrerequisites = [
        ...graphText.matchAll(
          new RegExp(
            `from:\\s*([^,}\\s]+),\\s*to:\\s*${feature.id}(?:,|\\s)`,
            "gu",
          ),
        ),
      ]
        .map((match) => match[1])
        .sort();
      const indexPrerequisites = [...feature.prerequisites].sort();
      if (graphPrerequisites.join("|") !== indexPrerequisites.join("|")) {
        throw new Error(
          `Prerequisites divergentes do grafo em ${feature.id}: índice=[${indexPrerequisites.join(", ")}], grafo=[${graphPrerequisites.join(", ")}].`,
        );
      }
    }
  }

  for (const feature of features) {
    if (
      existsSync(feature.childDirectory) &&
      !existsSync(`${feature.childDirectory}/spec.md`)
    ) {
      throw new Error(
        `Diretório ${feature.childDirectory} existe sem spec.md para ${feature.id}.`,
      );
    }
  }

  process.stdout.write(
    `${features.length} features válidas conforme o schema.\n`,
  );
});
