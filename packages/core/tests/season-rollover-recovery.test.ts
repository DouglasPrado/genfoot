import { describe, expect, it } from "vitest";

import { SeasonRollover, SeasonRolloverStatus } from "../src/index.js";
import {
  schedulingWorldId,
  seasonRolloverFixture,
} from "./helpers/scheduling-fixtures.js";

describe("SeasonRollover recovery", () => {
  it("retoma o checkpoint sem concluir com fencing antigo", () => {
    const created = SeasonRollover.create(
      seasonRolloverFixture(schedulingWorldId()),
    );
    if (!created.ok) throw created.error;
    const first = created.value.acquireLease("worker-a", 1_000, 100);
    if (!first.ok) throw first.error;
    const claimed = created.value.claimCurrentStep(first.value);
    if (!claimed.ok) throw claimed.error;

    const takeover = created.value.acquireLease("worker-b", 1_101, 100);
    if (!takeover.ok) throw takeover.error;
    expect(
      created.value.completeCurrentStep(first.value, {}, "2026-04-01"),
    ).toMatchObject({
      ok: false,
      error: { code: "STALE_FENCING_TOKEN" },
    });
    expect(created.value.claimCurrentStep(takeover.value)).toMatchObject({
      ok: true,
      value: { stepNumber: 1 },
    });
  });

  it("envia falha ao manual review quando esgota tentativas", () => {
    const created = SeasonRollover.create(
      seasonRolloverFixture(schedulingWorldId(), { maxAttemptsPerStep: 1 }),
    );
    if (!created.ok) throw created.error;
    const lease = created.value.acquireLease("worker", 0, 100);
    if (!lease.ok) throw lease.error;
    const claimed = created.value.claimCurrentStep(lease.value);
    if (!claimed.ok) throw claimed.error;

    expect(
      created.value.failCurrentStep(lease.value, "estrutural"),
    ).toMatchObject({ ok: true });
    expect(created.value.snapshot().status).toBe(
      SeasonRolloverStatus.MANUAL_REVIEW,
    );
  });
});
