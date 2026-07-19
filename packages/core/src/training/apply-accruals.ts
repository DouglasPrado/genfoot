import { succeed, fail, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import type { Player } from "../players/player.js";
import type {
  PlayerAttributeCode,
  PlayerDevelopmentHistoryId,
} from "../players/player-lifecycle-types.js";
import { GAIN_SCALE } from "./development-gain.js";

/**
 * Aplicação do accrual na virada de temporada (INV-29/R-113).
 *
 * O buffer acumulado durante a temporada é consumido AQUI, uma vez, e o atributo
 * muda de verdade. Fora daqui, atributo estrutural não se mexe — é o que torna
 * o replay determinístico: reprocessar a temporada não reaplica o ganho, porque
 * o buffer é zerado na aplicação (quem zera é a borda, com base em `consumed`).
 */
export interface AccrualToApply {
  readonly attributeCode: string;
  /** Delta escalado em pontos-base acumulado no buffer (R-82), pode ser ±. */
  readonly pendingDeltaMinor: bigint;
}

export interface ApplyAccrualsResult {
  /** Os `attributeCode` cujo buffer foi consumido — a borda os zera. */
  readonly consumed: readonly string[];
}

export function applyAccruals(
  player: Player,
  accruals: readonly AccrualToApply[],
  meta: {
    readonly historyId: PlayerDevelopmentHistoryId;
    readonly worldDate: string;
    readonly rulesetVersion: RulesetVersion;
  },
): Result<ApplyAccrualsResult, DomainError> {
  const consumed: string[] = [];

  for (const accrual of accruals) {
    const code = accrual.attributeCode as PlayerAttributeCode;
    const current = player.attributeValue(code);
    // Atributo que não se aplica à posição (grid de goleiro num zagueiro): o
    // buffer é ruído. Não consumir — deixar quieto é diferente de aplicar zero;
    // consumir apagaria a evidência de que veio treino errado para cá.
    if (current === null) continue;

    // pontos-base → pontos de atributo. Migalhas (< 1 ponto) arredondam a zero
    // mas o buffer É consumido: senão o resto se acumularia para sempre sem
    // nunca virar ponto.
    const deltaPoints = Math.round(Number(accrual.pendingDeltaMinor) / GAIN_SCALE);
    consumed.push(accrual.attributeCode);
    if (deltaPoints === 0) continue;

    const result = player.applyAttributeChange({
      historyId: meta.historyId,
      attributeCode: code,
      requestedValue: current + deltaPoints,
      cause: "season-rollover-accrual",
      worldDate: meta.worldDate,
      rulesetVersion: meta.rulesetVersion,
    });
    if (!result.ok) {
      return fail(result.error);
    }
  }

  // A base da próxima temporada é a habilidade a que o jogador chegou (R-216).
  player.rebaseline();

  return succeed({ consumed });
}
