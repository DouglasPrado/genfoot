import { newEntityId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  InfrastructureProject,
  InfrastructureProjectStatus,
} from "../../src/index.js";
import {
  schedulingRuleset,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

describe("InfrastructureProject recovery", () => {
  it("rejects stale fencing after lease takeover", () => {
    const project = fixture();
    const first = project.acquireLease("worker-a", 1_000, 100);
    if (!first.ok) throw first.error;
    const claimed = project.claimCurrentStep(first.value);
    if (!claimed.ok) throw claimed.error;
    const takeover = project.acquireLease("worker-b", 1_101, 100);
    if (!takeover.ok) throw takeover.error;

    expect(
      project.completeCurrentStep(first.value, {}, "2026-01-01"),
    ).toMatchObject({ ok: false, error: { code: "STALE_FENCING_TOKEN" } });
    expect(project.claimCurrentStep(takeover.value)).toMatchObject({
      ok: true,
      value: { stepId: "APPROVE" },
    });
  });

  it("moves to manual review when retry budget is exhausted", () => {
    const project = fixture(1);
    const lease = project.acquireLease("worker", 0, 100);
    if (!lease.ok) throw lease.error;
    const claimed = project.claimCurrentStep(lease.value);
    if (!claimed.ok) throw claimed.error;
    expect(project.failCurrentStep(lease.value, "structural").ok).toBe(true);
    expect(project.snapshot().status).toBe(
      InfrastructureProjectStatus.MANUAL_REVIEW,
    );
  });
});

function fixture(maxAttemptsPerStep = 3): InfrastructureProject {
  const created = InfrastructureProject.create({
    id: newEntityId<"InfrastructureProject">(),
    gameWorldId: schedulingWorldId(),
    clubId: newEntityId<"Club">(),
    rulesetVersion: schedulingRuleset(),
    commandId: "project-command-recovery",
    idempotencyKey: "project:create:recovery",
    actorId: "board:1",
    proposedAt: "2026-01-01",
    target: { kind: "DEPARTMENT_LEVEL", reference: "TRAINING", targetValue: 2 },
    fundingRequestRef: "funding:recovery",
    milestones: [
      { id: "M1", name: "Entrega", dueOn: "2026-02-01", amountMinor: 10_000 },
    ],
    maxAttemptsPerStep,
  });
  if (!created.ok) throw created.error;
  return created.value;
}
