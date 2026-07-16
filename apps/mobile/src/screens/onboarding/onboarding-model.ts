export interface MobileIdentityProjection {
  readonly cooldownDays?: number;
  readonly accounts?: readonly {
    readonly id: string;
    readonly idempotencyKey: string;
    readonly status: string;
  }[];
  readonly participations: readonly {
    readonly accountId: string;
    readonly status: string;
  }[];
  readonly reservations: readonly {
    readonly id: string;
    readonly accountId: string;
    readonly clubId: string;
    readonly status: string;
  }[];
  readonly controls: readonly {
    readonly id: string;
    readonly accountId: string;
    readonly clubId: string;
    readonly status: string;
  }[];
  readonly cooldowns?: readonly {
    readonly accountId: string;
    readonly untilOn: string;
  }[];
}

export type OnboardingStep =
  | { readonly kind: "initialize" }
  | { readonly kind: "register-account" }
  | { readonly kind: "join-world"; readonly accountId: string }
  | {
      readonly kind: "choose-club";
      readonly accountId: string;
      readonly switchMode: boolean;
    }
  | {
      readonly kind: "cooldown";
      readonly accountId: string;
      readonly untilOn: string;
    }
  | {
      readonly kind: "confirm-control";
      readonly accountId: string;
      readonly reservationId: string;
      readonly clubId: string;
    }
  | {
      readonly kind: "complete";
      readonly accountId: string;
      readonly controlId: string;
      readonly clubId: string;
    };

export function mobileAccountKey(subject: string): string {
  return `mobile-account:${subject}`;
}

export function deriveOnboardingStep(
  identity: MobileIdentityProjection | null,
  subject: string,
  worldDate = "",
): OnboardingStep {
  if (identity === null) return { kind: "initialize" };
  const account = (identity.accounts ?? []).find(
    (candidate) =>
      candidate.idempotencyKey === mobileAccountKey(subject) &&
      candidate.status === "ACTIVE",
  );
  if (account === undefined) return { kind: "register-account" };

  const control = identity.controls.find(
    (candidate) =>
      candidate.accountId === account.id && candidate.status === "ACTIVE",
  );
  if (control !== undefined) {
    return {
      kind: "complete",
      accountId: account.id,
      controlId: control.id,
      clubId: control.clubId,
    };
  }

  const reservation = identity.reservations.find(
    (candidate) =>
      candidate.accountId === account.id && candidate.status === "HELD",
  );
  if (reservation !== undefined) {
    return {
      kind: "confirm-control",
      accountId: account.id,
      reservationId: reservation.id,
      clubId: reservation.clubId,
    };
  }

  const participation = identity.participations.find(
    (candidate) => candidate.accountId === account.id,
  );
  if (participation === undefined) {
    return { kind: "join-world", accountId: account.id };
  }
  if (participation.status === "ENDED") {
    const cooldown = (identity.cooldowns ?? []).find(
      (candidate) => candidate.accountId === account.id,
    );
    if (cooldown !== undefined && worldDate < cooldown.untilOn) {
      return {
        kind: "cooldown",
        accountId: account.id,
        untilOn: cooldown.untilOn,
      };
    }
    return { kind: "choose-club", accountId: account.id, switchMode: true };
  }
  return { kind: "choose-club", accountId: account.id, switchMode: false };
}

export function addWorldDays(worldDate: string, days: number): string {
  const date = new Date(`${worldDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Confirma o efeito do command pela mudança observada na projeção oficial. */
export function projectionAdvancedPast(
  submittedStep: OnboardingStep["kind"] | null,
  currentStep: OnboardingStep["kind"],
): boolean {
  return submittedStep !== null && submittedStep !== currentStep;
}
