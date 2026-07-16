import { describe, expect, it } from "vitest";

import {
  addWorldDays,
  deriveOnboardingStep,
  mobileAccountKey,
  projectionAdvancedPast,
} from "./onboarding-model";

const subject = "manager-1";
const account = {
  id: "account-1",
  idempotencyKey: mobileAccountKey(subject),
  status: "ACTIVE",
};

describe("fluxo de entrada no clube", () => {
  it("encerra o processamento somente quando a projeção avança de etapa", () => {
    expect(projectionAdvancedPast("register-account", "register-account")).toBe(
      false,
    );
    expect(projectionAdvancedPast("register-account", "join-world")).toBe(true);
    expect(projectionAdvancedPast(null, "join-world")).toBe(false);
  });

  it("avança apenas conforme a projeção oficial confirma cada efeito", () => {
    expect(deriveOnboardingStep(null, subject).kind).toBe("initialize");
    expect(
      deriveOnboardingStep(
        { accounts: [], participations: [], reservations: [], controls: [] },
        subject,
      ).kind,
    ).toBe("register-account");
    expect(
      deriveOnboardingStep(
        {
          accounts: [account],
          participations: [],
          reservations: [],
          controls: [],
        },
        subject,
      ).kind,
    ).toBe("join-world");
    expect(
      deriveOnboardingStep(
        {
          accounts: [account],
          participations: [{ accountId: account.id, status: "ACTIVE" }],
          reservations: [],
          controls: [],
        },
        subject,
      ).kind,
    ).toBe("choose-club");
    expect(
      deriveOnboardingStep(
        {
          accounts: [account],
          participations: [{ accountId: account.id, status: "ACTIVE" }],
          reservations: [
            {
              id: "reservation-1",
              accountId: account.id,
              clubId: "club-1",
              status: "HELD",
            },
          ],
          controls: [],
        },
        subject,
      ).kind,
    ).toBe("confirm-control");
    expect(
      deriveOnboardingStep(
        {
          accounts: [account],
          participations: [{ accountId: account.id, status: "ACTIVE" }],
          reservations: [],
          controls: [
            {
              id: "control-1",
              accountId: account.id,
              clubId: "club-1",
              status: "ACTIVE",
            },
          ],
        },
        subject,
      ).kind,
    ).toBe("complete");
  });

  it("não reutiliza conta criada para outro sujeito", () => {
    expect(
      deriveOnboardingStep(
        {
          accounts: [{ ...account, idempotencyKey: "mobile-account:other" }],
          participations: [],
          reservations: [],
          controls: [],
        },
        subject,
      ).kind,
    ).toBe("register-account");
  });

  it("calcula expiração pela data lógica do mundo", () => {
    expect(addWorldDays("2026-01-28", 7)).toBe("2026-02-04");
  });

  it("respeita o cooldown de saída e usa request-switch depois dele", () => {
    const ended = {
      accounts: [account],
      participations: [{ accountId: account.id, status: "ENDED" }],
      reservations: [],
      controls: [],
      cooldowns: [{ accountId: account.id, untilOn: "2026-02-01" }],
    };

    expect(deriveOnboardingStep(ended, subject, "2026-01-20")).toEqual({
      kind: "cooldown",
      accountId: account.id,
      untilOn: "2026-02-01",
    });
    expect(deriveOnboardingStep(ended, subject, "2026-02-01")).toMatchObject({
      kind: "choose-club",
      switchMode: true,
    });
  });
});
