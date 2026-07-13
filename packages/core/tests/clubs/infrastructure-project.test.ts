import { newEntityId } from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  INFRASTRUCTURE_PROJECT_STEPS,
  InfrastructureProject,
  InfrastructureProjectStatus,
} from "../../src/index.js";
import {
  schedulingRuleset,
  schedulingWorldId,
} from "../helpers/scheduling-fixtures.js";

describe("InfrastructureProject", () => {
  it("executes approval, finance, milestones, license and operation in order", () => {
    const project = createdProject();
    const lease = project.acquireLease("worker-a", 1_000, 100);
    if (!lease.ok) throw lease.error;

    for (const step of INFRASTRUCTURE_PROJECT_STEPS) {
      const claimed = project.claimCurrentStep(lease.value);
      if (!claimed.ok) throw claimed.error;
      expect(claimed.value.stepId).toBe(step);
      if (step === "EXECUTE_MILESTONES") {
        for (const milestone of project.snapshot().milestones) {
          const completed = project.completeMilestone(
            lease.value,
            milestone.id,
            `C9:disbursement:${milestone.id}`,
            milestone.dueOn,
          );
          if (!completed.ok) throw completed.error;
        }
      }
      const completed = project.completeCurrentStep(
        lease.value,
        { step },
        "2026-03-01",
      );
      if (!completed.ok) throw completed.error;
    }

    expect(project.snapshot()).toMatchObject({
      status: InfrastructureProjectStatus.COMPLETED,
      currentStepIndex: 5,
      inspection: { approved: true },
    });
  });

  it("preserves completed milestones as sunk cost during compensation", () => {
    const project = createdProject();
    const lease = project.acquireLease("worker-a", 0, 100);
    if (!lease.ok) throw lease.error;
    completeStep(project, lease.value);
    completeStep(project, lease.value);
    const claimed = project.claimCurrentStep(lease.value);
    if (!claimed.ok) throw claimed.error;
    const milestone = project.snapshot().milestones[0]!;
    const completed = project.completeMilestone(
      lease.value,
      milestone.id,
      "C9:spent:1",
      milestone.dueOn,
    );
    if (!completed.ok) throw completed.error;
    expect(project.beginCompensation(lease.value, "cancelled").ok).toBe(true);
    expect(
      project.completeCompensation(lease.value, {
        releaseFactRef: "C9:release:1",
      }).ok,
    ).toBe(true);
    expect(project.snapshot().status).toBe(InfrastructureProjectStatus.FAILED);
    expect(project.snapshot().milestones[0]?.status).toBe("COMPLETED");
  });
});

function createdProject(): InfrastructureProject {
  const created = InfrastructureProject.create({
    id: newEntityId<"InfrastructureProject">(),
    gameWorldId: schedulingWorldId(),
    clubId: newEntityId<"Club">(),
    rulesetVersion: schedulingRuleset(),
    target: {
      kind: "STADIUM_CAPACITY",
      reference: "stadium:1",
      targetValue: 15_000,
    },
    fundingRequestRef: "funding:1",
    milestones: [
      { id: "M1", name: "Fundação", dueOn: "2026-02-01", amountMinor: 100_000 },
      {
        id: "M2",
        name: "Conclusão",
        dueOn: "2026-03-01",
        amountMinor: 200_000,
      },
    ],
    maxAttemptsPerStep: 3,
  });
  if (!created.ok) throw created.error;
  return created.value;
}

function completeStep(project: InfrastructureProject, token: number): void {
  const claimed = project.claimCurrentStep(token);
  if (!claimed.ok) throw claimed.error;
  const completed = project.completeCurrentStep(token, {}, "2026-01-01");
  if (!completed.ok) throw completed.error;
}
