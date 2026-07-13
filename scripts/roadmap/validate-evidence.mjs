#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

import { argumentValue, runCli } from "./roadmap-utils.mjs";

function main() {
  const registryPath = argumentValue("--registry");
  const root = optionalArgument("--root") ?? process.cwd();
  const registry = parseRegistry(readFileSync(registryPath, "utf8"));
  const errors = [];
  const seenFeatures = new Set();
  const seenSlots = new Set();
  const seenEvidence = new Set();
  let slotCount = 0;
  let passCount = 0;

  if (!Array.isArray(registry.features) || registry.features.length === 0) {
    errors.push("Registry sem features.");
  }

  for (const feature of registry.features ?? []) {
    if (seenFeatures.has(feature.featureId)) {
      errors.push(`DUPLICATE featureId: ${feature.featureId}.`);
    }
    seenFeatures.add(feature.featureId);
    if (!/^(?:FND|BC|X|VAL|OPS|GP)-\d{3}$/u.test(feature.featureId ?? "")) {
      errors.push(`featureId inválido: ${String(feature.featureId)}.`);
    }
    for (const source of feature.sourceRefs ?? []) {
      const sourcePath = absolute(root, source.document);
      if (!existsSync(sourcePath)) {
        errors.push(`MISSING_SOURCE ${source.document}.`);
      } else if (
        !source.heading ||
        !readFileSync(sourcePath, "utf8").includes(source.heading)
      ) {
        errors.push(
          `STALE_SOURCE ${source.document}: ${String(source.heading)}.`,
        );
      }
    }
    if (!Array.isArray(feature.sourceRefs) || feature.sourceRefs.length === 0) {
      errors.push(`${feature.featureId} sem sourceRefs.`);
    }

    for (const slot of feature.slots ?? []) {
      slotCount += 1;
      if (seenSlots.has(slot.slotId))
        errors.push(`DUPLICATE slotId: ${slot.slotId}.`);
      seenSlots.add(slot.slotId);
      if (!ALLOWED_TYPES.has(slot.type)) {
        errors.push(
          `${slot.slotId} possui type inválido: ${String(slot.type)}.`,
        );
      }
      if (!ALLOWED_RESULTS.has(slot.effectiveResult)) {
        errors.push(
          `${slot.slotId} possui effectiveResult inválido: ${String(slot.effectiveResult)}.`,
        );
      }
      if (slot.effectiveResult === "PASS" && !slot.observation) {
        errors.push(`${slot.slotId}: PASS com observation ausente.`);
        continue;
      }
      if (!slot.observation) {
        if (slot.blocking)
          errors.push(`${slot.slotId}: MISSING blocking observation.`);
        continue;
      }
      const observation = slot.observation;
      if (seenEvidence.has(observation.evidenceId)) {
        errors.push(`DUPLICATE evidenceId: ${observation.evidenceId}.`);
      }
      seenEvidence.add(observation.evidenceId);
      validateObservation({
        observation,
        feature,
        slot,
        root,
        candidateCommit: registry.candidateCommit,
        errors,
      });
      if (slot.effectiveResult === "PASS" && observation.result === "PASS") {
        passCount += 1;
      }
    }
    if (!Array.isArray(feature.slots) || feature.slots.length === 0) {
      errors.push(`${feature.featureId} sem evidence slots.`);
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Evidence validation FAIL (${errors.length}):\n- ${errors.join("\n- ")}`,
    );
  }
  process.stdout.write(`${slotCount} slots válidos; ${passCount} PASS.\n`);
}

const ALLOWED_TYPES = new Set([
  "TEST",
  "BUILD",
  "REPORT",
  "TRACE",
  "MIGRATION",
  "LOAD_TEST",
  "SECURITY_TEST",
  "GAMEDAY",
  "REVIEW",
]);
const ALLOWED_RESULTS = new Set(["PASS", "FAIL"]);

function validateObservation({
  observation,
  feature,
  slot,
  root,
  candidateCommit,
  errors,
}) {
  const required = [
    "evidenceId",
    "result",
    "location",
    "artifactHash",
    "observedAt",
    "commitSha",
    "criterionRefs",
    "toolchain",
    "environment",
    "owner",
    "inputs",
    "outputs",
  ];
  if (slot.type !== "REVIEW")
    required.push("command", "startedAt", "finishedAt");
  for (const field of required) {
    const value = observation[field];
    if (value === undefined || value === null || value === "") {
      errors.push(`${slot.slotId}: campo obrigatório ausente ${field}.`);
    }
  }
  if (!ALLOWED_RESULTS.has(observation.result)) {
    errors.push(
      `${slot.slotId}: result inválido ${String(observation.result)}.`,
    );
  }
  if (observation.owner !== feature.featureId) {
    errors.push(`${slot.slotId}: owner diverge de ${feature.featureId}.`);
  }
  if (candidateCommit && observation.commitSha !== candidateCommit) {
    errors.push(`${slot.slotId}: STALE_COMMIT ${observation.commitSha}.`);
  }
  for (const field of ["criterionRefs", "inputs", "outputs"]) {
    if (!Array.isArray(observation[field]) || observation[field].length === 0) {
      errors.push(`${slot.slotId}: ${field} deve ser lista não vazia.`);
    }
  }
  if (
    observation.location &&
    !existsSync(absolute(root, observation.location))
  ) {
    errors.push(`MISSING ${observation.location}.`);
  } else if (observation.location && observation.artifactHash) {
    const actualHash = `sha256:${createHash("sha256")
      .update(readFileSync(absolute(root, observation.location)))
      .digest("hex")}`;
    if (actualHash !== observation.artifactHash) {
      errors.push(`${slot.slotId}: artifactHash divergente.`);
    }
  }
  for (const reference of [
    ...(observation.inputs ?? []),
    ...(observation.outputs ?? []),
  ]) {
    if (!existsSync(absolute(root, reference)))
      errors.push(`MISSING ${reference}.`);
  }
  const simulation = (observation.criterionRefs ?? []).some((criterion) =>
    /^(?:BS|BE|BD)-|^(?:G[1-7]|R-34|R-88)$|^INV-(?:27|28)$/u.test(criterion),
  );
  if (simulation) {
    const missing = [];
    if (!observation.rulesetVersion) missing.push("rulesetVersion");
    if (!observation.seedSet) missing.push("seedSet");
    if (missing.length > 0)
      errors.push(`${slot.slotId}: ausentes ${missing.join(" e ")}.`);
  }
  if (observation.seedSet && !existsSync(absolute(root, observation.seedSet))) {
    errors.push(`MISSING ${observation.seedSet}.`);
  }
  if (observation.result === "FAIL" && !observation.failureSummary) {
    errors.push(`${slot.slotId}: FAIL sem failureSummary.`);
  }
}

function absolute(root, path) {
  return isAbsolute(path) ? path : resolve(root, path);
}

function optionalArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function parseRegistry(contents) {
  // The registry deliberately uses JSON-compatible YAML. Prettier may retain
  // flow collections while adding YAML-legal trailing commas; normalize only
  // those commas so the validator needs no runtime YAML dependency.
  return JSON.parse(contents.replace(/,(\s*[}\]])/gu, "$1"));
}

runCli(main);
