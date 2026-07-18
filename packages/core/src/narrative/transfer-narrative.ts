import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";

import {
  NarrativeType,
  type NarrativeItemSnapshot,
} from "./narrative-types.js";

export interface TransferNarrativeInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly buyingClubId: string;
  readonly playerId: string;
  readonly playerName: string;
  readonly feeMinor: bigint;
  readonly currencyId: string;
  readonly occurredOn: string;
}

/**
 * A manchete de uma contratação (C11 §10). Factual: relata o que aconteceu — quem
 * assinou, por quanto —, sem inventar. O id é determinístico pelo fato (mesmo
 * mundo, jogador e data ⇒ mesma manchete), então reprocessar não duplica.
 *
 * A intensidade cresce com a taxa: uma contratação cara é manchete maior. Faixas
 * simples de primeira passada (a curadoria fina é o próximo passo do contexto).
 */
export function buildTransferNarrative(
  input: TransferNarrativeInput,
): NarrativeItemSnapshot {
  const reais = Number(input.feeMinor) / 100;
  return {
    id: deterministicUuidV7({
      worldSeed: input.worldSeed,
      context: `${input.gameWorldId}:narrative:transfer:${input.playerId}:${input.occurredOn}`,
      timestampMilliseconds: timestampOf(input.occurredOn),
    }),
    gameWorldId: input.gameWorldId as never,
    clubId: input.buyingClubId,
    playerId: input.playerId,
    type: NarrativeType.TRANSFER_SPECULATION,
    title: `${input.playerName} é o novo reforço`,
    description: `Contratação fechada por ${formatReais(reais)} — contrato de 3 temporadas.`,
    intensity: intensityForFee(reais),
    occurredOn: input.occurredOn,
  };
}

/** Intensidade 1–5 pela faixa de valor da contratação. */
export function intensityForFee(reais: number): number {
  if (reais >= 50_000_000) return 5;
  if (reais >= 10_000_000) return 4;
  if (reais >= 2_000_000) return 3;
  if (reais >= 500_000) return 2;
  return 1;
}

function formatReais(reais: number): string {
  return `R$ ${reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
