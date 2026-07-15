import {
  InspectClubPortfolio,
  InspectNarrative,
  seedFanbaseSize,
} from "@grinta/core";
import type { JsonWorldRepository } from "@grinta/persistence";
import {
  succeed,
  type DomainError,
  type GameWorldId,
  type Result,
} from "@grinta/shared";

/**
 * Projeção `narrative` para o X-003: o summary de C10 acrescido do tamanho da
 * torcida (headcount) por clube. Usa o valor gravado quando existe (ex.: já caiu
 * por um rebranding) ou a semente determinística por porte do clube (reputação +
 * capacidade do estádio) como default para clubes ainda não tocados.
 */
export async function composeNarrativeProjection(
  repository: JsonWorldRepository,
  worldId: GameWorldId,
): Promise<Result<unknown, DomainError>> {
  const summary = await new InspectNarrative(repository).summary(worldId);
  if (!summary.ok) return summary;
  const narrative = await new InspectNarrative(repository).world(worldId);
  if (!narrative.ok) return narrative;

  const portfolio = await new InspectClubPortfolio(repository).world(worldId);
  const clubs = portfolio.ok
    ? portfolio.value.clubs.map((club) => {
        const stored = narrative.value.fanbases.find(
          (fanbase) => fanbase.clubId === club.id,
        );
        return {
          clubId: club.id,
          fanbaseSize:
            stored?.fanbaseSize ??
            seedFanbaseSize(club.reputationBand, club.stadium.capacity),
          overall: stored?.overall ?? 50,
        };
      })
    : [];
  return succeed({ ...summary.value, clubs });
}
