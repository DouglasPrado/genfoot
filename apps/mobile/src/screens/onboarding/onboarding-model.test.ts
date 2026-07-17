import { describe, expect, it } from "vitest";

import {
  addWorldDays,
  deriveOnboardingStep,
  projectionAdvancedPast,
  type MobileIdentityProjection,
} from "./onboarding-model";

const accountId = "019f6d00-0000-7000-8000-000000000001";
const clubId = "019b76da-a800-7df7-a02d-20b050660e28";

function projection(
  over: Partial<MobileIdentityProjection> = {},
): MobileIdentityProjection {
  return { participations: [], reservations: [], controls: [], ...over };
}

describe("fluxo de entrada no clube", () => {
  /**
   * O modelo antigo derivava a conta de `identity.accounts[]`, procurando pela
   * `idempotencyKey` (`mobile-account:<subject>`). Dois defeitos num campo:
   *
   * 1. O read model de C1 (R-175) NÃO tem `accounts` — tem `participations`.
   *    O `?? []` engolia a divergência, `account` era sempre `undefined`, e o
   *    app ficava preso em `register-account` para sempre. O teste passava
   *    porque a FIXTURE tinha `accounts` — ele concordava consigo mesmo.
   * 2. A `idempotencyKey` deixou de ser estado do agregado (R-176): virou
   *    `attemptKey`, semente de id, que o read model não expõe nem deve.
   *
   * Agora o `accountId` vem da SESSÃO: o `/auth/session` verifica o token do
   * Clerk e resolve a conta do jogo (R-171/R-172). Quem sabe a conta é quem a
   * resolveu — não a tela, garimpando projeção.
   */
  it("sem conta na sessão, o passo é autenticar — não 'registrar conta'", () => {
    expect(deriveOnboardingStep(projection(), null).kind).toBe("authenticate");
  });

  it("projeção ausente é carregando, não erro", () => {
    expect(deriveOnboardingStep(null, accountId).kind).toBe("loading");
  });

  it("conta sem participação → entrar no mundo", () => {
    expect(deriveOnboardingStep(projection(), accountId)).toEqual({
      kind: "join-world",
      accountId,
    });
  });

  it("participando, sem reserva → escolher clube", () => {
    const step = deriveOnboardingStep(
      projection({ participations: [{ accountId, status: "ACTIVE" }] }),
      accountId,
    );
    expect(step).toEqual({ kind: "choose-club", accountId, switchMode: false });
  });

  it("com reserva HELD → confirmar (assumir o clube)", () => {
    const step = deriveOnboardingStep(
      projection({
        participations: [{ accountId, status: "ACTIVE" }],
        reservations: [{ id: "res-1", accountId, clubId, status: "HELD" }],
      }),
      accountId,
    );
    expect(step).toEqual({
      kind: "confirm-control",
      accountId,
      reservationId: "res-1",
      clubId,
    });
  });

  /** Reserva CONFIRMED não é pendência: ela já virou controle. */
  it("reserva confirmada não prende o jogador na tela de confirmar", () => {
    const step = deriveOnboardingStep(
      projection({
        participations: [{ accountId, status: "ACTIVE" }],
        reservations: [{ id: "res-1", accountId, clubId, status: "CONFIRMED" }],
        controls: [{ id: "ctl-1", accountId, clubId, status: "ACTIVE" }],
      }),
      accountId,
    );
    expect(step.kind).toBe("complete");
  });

  it("com controle ativo → completo", () => {
    const step = deriveOnboardingStep(
      projection({
        participations: [{ accountId, status: "ACTIVE" }],
        controls: [{ id: "ctl-1", accountId, clubId, status: "ACTIVE" }],
      }),
      accountId,
    );
    expect(step).toEqual({ kind: "complete", accountId, controlId: "ctl-1", clubId });
  });

  /** O controle de OUTRA conta não completa o meu onboarding. */
  it("controle de outro jogador não conta", () => {
    const step = deriveOnboardingStep(
      projection({
        participations: [{ accountId, status: "ACTIVE" }],
        controls: [
          { id: "ctl-1", accountId: "outro", clubId, status: "ACTIVE" },
        ],
      }),
      accountId,
    );
    expect(step.kind).toBe("choose-club");
  });

  it("controle ENCERRADO não completa — o jogador largou o clube", () => {
    const step = deriveOnboardingStep(
      projection({
        participations: [{ accountId, status: "ACTIVE" }],
        controls: [{ id: "ctl-1", accountId, clubId, status: "ENDED" }],
      }),
      accountId,
    );
    expect(step.kind).toBe("choose-club");
  });

  describe("saiu do mundo", () => {
    const saiu = (untilOn?: string) =>
      projection({
        participations: [{ accountId, status: "ENDED" }],
        ...(untilOn === undefined
          ? {}
          : { cooldowns: [{ accountId, untilOn }] }),
      });

    it("dentro do cooldown → espera, e diz até quando", () => {
      const step = deriveOnboardingStep(saiu("2026-02-10"), accountId, "2026-02-01");
      expect(step).toEqual({ kind: "cooldown", accountId, untilOn: "2026-02-10" });
    });

    /**
     * O cooldown vale ATÉ O FIM do dia `untilOn` (`world-participant.ts`:
     * `isInCooldownOn` compara `<=`). No próprio dia ainda espera.
     */
    it("no último dia do cooldown ainda espera", () => {
      expect(
        deriveOnboardingStep(saiu("2026-02-10"), accountId, "2026-02-10").kind,
      ).toBe("cooldown");
    });

    it("no dia seguinte, escolhe outro clube em modo troca", () => {
      const step = deriveOnboardingStep(saiu("2026-02-10"), accountId, "2026-02-11");
      expect(step).toEqual({ kind: "choose-club", accountId, switchMode: true });
    });

    it("sem cooldown registrado, escolhe direto", () => {
      expect(deriveOnboardingStep(saiu(), accountId, "2026-02-01").kind).toBe(
        "choose-club",
      );
    });
  });

  it("encerra o processamento somente quando a projeção avança de etapa", () => {
    expect(projectionAdvancedPast("join-world", "join-world")).toBe(false);
    expect(projectionAdvancedPast("join-world", "choose-club")).toBe(true);
    expect(projectionAdvancedPast(null, "join-world")).toBe(false);
  });

  it("calcula expiração pela data lógica do mundo", () => {
    expect(addWorldDays("2026-01-30", 3)).toBe("2026-02-02");
  });
});
