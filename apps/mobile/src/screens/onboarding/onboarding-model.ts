/**
 * A projeção de identidade do mundo, como o read model de C1 a entrega
 * (`identity-detail`).
 *
 * `accounts[]` NÃO existe aqui, e a ausência é o ponto: o modelo antigo procurava
 * a conta nesse campo, achava `undefined` para sempre e prendia o app em
 * "registrar conta". O campo nunca existiu no read model — e a `idempotencyKey`
 * que ele usava como chave deixou de ser estado do agregado (R-176): virou
 * `attemptKey`, semente de id, que a leitura não expõe nem deve.
 *
 * Quem sabe qual é a conta é a SESSÃO: o `/auth/session` verifica o token do
 * provedor e resolve a conta do jogo (R-171/R-172).
 */
export interface MobileIdentityProjection {
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
  /** Sem conta na sessão: o jogador precisa entrar (Clerk). */
  | { readonly kind: "authenticate" }
  /** A projeção ainda não chegou. É espera, não erro. */
  | { readonly kind: "loading" }
  | { readonly kind: "join-world"; readonly accountId: string }
  | {
      readonly kind: "choose-club";
      readonly accountId: string;
      /** Já teve clube neste mundo: é troca, não primeira entrada. */
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

/**
 * Em que ponto do onboarding o jogador está — derivado só da projeção OFICIAL.
 *
 * O cliente é não-autoritativo: ele não guarda "já cliquei em entrar", ele
 * pergunta ao servidor o que é verdade. É isso que faz o retry, o app fechado no
 * meio e a corrida entre dois aparelhos convergirem para o mesmo lugar.
 *
 * A ordem dos casos importa: controle vence reserva, reserva vence participação.
 * Quem já assumiu o clube não pode ser mandado de volta a confirmar.
 */
export function deriveOnboardingStep(
  identity: MobileIdentityProjection | null,
  accountId: string | null,
  worldDate = "",
): OnboardingStep {
  if (accountId === null) return { kind: "authenticate" };
  if (identity === null) return { kind: "loading" };

  const meu = <T extends { accountId: string }>(lista: readonly T[]) =>
    lista.filter((item) => item.accountId === accountId);

  const control = meu(identity.controls).find(
    (candidate) => candidate.status === "ACTIVE",
  );
  if (control !== undefined) {
    return {
      kind: "complete",
      accountId,
      controlId: control.id,
      clubId: control.clubId,
    };
  }

  // Só HELD é pendência. `CONFIRMED` já virou controle, e `RELEASED`/`EXPIRED`
  // são passado — tratá-los como pendência prenderia o jogador numa tela de
  // confirmar reserva que não existe mais.
  const reservation = meu(identity.reservations).find(
    (candidate) => candidate.status === "HELD",
  );
  if (reservation !== undefined) {
    return {
      kind: "confirm-control",
      accountId,
      reservationId: reservation.id,
      clubId: reservation.clubId,
    };
  }

  const participation = meu(identity.participations)[0];
  if (participation === undefined) return { kind: "join-world", accountId };

  if (participation.status === "ENDED") {
    const cooldown = meu(identity.cooldowns ?? [])[0];
    // `<=`: o cooldown vale ATÉ O FIM do dia `untilOn` — é o mesmo `<=` de
    // `WorldParticipant.isInCooldownOn`. Um `<` aqui deixaria o app oferecer um
    // clube que a API vai recusar com ACCOUNT_COOLDOWN_ACTIVE.
    if (cooldown !== undefined && worldDate <= cooldown.untilOn) {
      return { kind: "cooldown", accountId, untilOn: cooldown.untilOn };
    }
    return { kind: "choose-club", accountId, switchMode: true };
  }
  return { kind: "choose-club", accountId, switchMode: false };
}

export function addWorldDays(worldDate: string, days: number): string {
  const date = new Date(`${worldDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Confirma o efeito do command pela mudança observada na projeção oficial.
 *
 * Timeout NÃO é sucesso (CLAUDE.md §6): o app não avança porque o POST voltou —
 * avança porque a leitura oficial mudou de etapa.
 */
export function projectionAdvancedPast(
  submittedStep: OnboardingStep["kind"] | null,
  currentStep: OnboardingStep["kind"],
): boolean {
  return submittedStep !== null && submittedStep !== currentStep;
}
