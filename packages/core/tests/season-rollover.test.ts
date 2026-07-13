import { describe, expect, it } from "vitest";

import {
  SEASON_ROLLOVER_STEPS,
  SeasonRollover,
  SeasonRolloverPhase,
  SeasonRolloverStatus,
} from "../src/index.js";
import {
  schedulingWorldId,
  seasonRolloverFixture,
} from "./helpers/scheduling-fixtures.js";

describe("SeasonRollover", () => {
  it("executa os 20 checkpoints em ordem e exige VERIFYING após o passo 17", () => {
    const created = SeasonRollover.create(
      seasonRolloverFixture(schedulingWorldId()),
    );
    if (!created.ok) throw created.error;
    const lease = created.value.acquireLease("worker-a", 1_000, 100);
    if (!lease.ok) throw lease.error;

    for (let index = 0; index < 17; index += 1) {
      const claimed = created.value.claimCurrentStep(lease.value);
      if (!claimed.ok) throw claimed.error;
      expect(claimed.value.stepId).toBe(SEASON_ROLLOVER_STEPS[index]);
      const completed = created.value.completeCurrentStep(
        lease.value,
        { step: index + 1 },
        `2026-04-${String(index + 1).padStart(2, "0")}`,
      );
      if (!completed.ok) throw completed.error;
    }

    expect(created.value.snapshot().phase).toBe(SeasonRolloverPhase.VERIFYING);
    expect(created.value.claimCurrentStep(lease.value)).toMatchObject({
      ok: false,
      error: { code: "ROLLOVER_VERIFICATION_REQUIRED" },
    });
    expect(
      created.value.confirmVerification(lease.value, {
        standingsConsistent: true,
        ledgerBalanced: true,
        populationInBand: true,
      }),
    ).toMatchObject({ ok: true });

    for (let index = 17; index < 20; index += 1) {
      const claimed = created.value.claimCurrentStep(lease.value);
      if (!claimed.ok) throw claimed.error;
      expect(claimed.value.stepId).toBe(SEASON_ROLLOVER_STEPS[index]);
      const completed = created.value.completeCurrentStep(
        lease.value,
        {},
        "2026-04-20",
      );
      if (!completed.ok) throw completed.error;
    }

    expect(created.value.snapshot()).toMatchObject({
      status: SeasonRolloverStatus.COMPLETED,
      phase: SeasonRolloverPhase.COMPLETED,
      currentStepIndex: 20,
    });
  });

  it("não permite premiação antes de homologação porque o cursor é linear", () => {
    const created = SeasonRollover.create(
      seasonRolloverFixture(schedulingWorldId()),
    );
    if (!created.ok) throw created.error;
    const lease = created.value.acquireLease("worker", 0, 100);
    if (!lease.ok) throw lease.error;
    expect(created.value.claimCurrentStep(lease.value)).toMatchObject({
      ok: true,
      value: { stepId: "FINISH_PENDING_MATCHES", stepNumber: 1 },
    });
  });
});
