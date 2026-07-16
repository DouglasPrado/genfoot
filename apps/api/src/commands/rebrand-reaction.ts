import {
  ApplyNarrativeRebrandFact,
  InitializeNarrative,
  seedFanbaseSize,
} from "@grinta/core";
import type { WorldRepository } from "@grinta/core";
import type { JsonWorldRepository } from "@grinta/persistence";
import type { GameWorldId } from "@grinta/shared";

/**
 * Orquestração C3 → C10 do rebranding.
 *
 * Depois que um `UpdateClubVisualIdentity` é aplicado com sucesso em C3 (emitindo
 * o fato oficial `ClubRebranded`), garante a narrativa inicializada e aplica o
 * fato de rebranding em C10 — que faz a torcida do clube cair de 10 a 15%
 * (determinístico por `worldSeed`+`factId`, idempotente por `factId` estável
 * derivado da idempotencyKey do comando).
 *
 * Best-effort: o rebranding em C3 é autoritativo e já foi persistido; a reação
 * da torcida é uma consequência eventual e nunca derruba o comando de clube.
 * (Uma saga durável em X-002 seria o lar "definitivo" desse elo; aqui a
 * orquestração é inline no handler, mantendo a queda garantida no servidor.)
 */
export async function applyRebrandReaction(
  repository: JsonWorldRepository,
  worlds: WorldRepository,
  worldId: GameWorldId,
  clubId: string,
  idempotencyKey: string,
): Promise<void> {
  const world = await worlds.findById(worldId);
  if (world === null) return;
  const portfolio = await repository.findClubPortfolioByWorldId(worldId);
  const club = portfolio?.clubs.find((candidate) => candidate.id === clubId);
  if (club === undefined) return;

  await new InitializeNarrative(repository).execute(world);
  await new ApplyNarrativeRebrandFact(repository).execute(worldId, {
    factId: `narrative-rebrand:${idempotencyKey}`,
    clubId: club.id,
    baseSize: seedFanbaseSize(club.reputationBand, club.stadium.capacity),
    rulesetVersion: world.rulesetVersion,
    idempotencyKey,
    worldSeed: world.seed,
    worldDate: world.currentDate,
  });
}
