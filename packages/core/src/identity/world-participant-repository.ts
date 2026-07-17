import type { WorldParticipantSnapshot } from "./world-participant.js";

/**
 * Porta do vínculo conta ↔ mundo (R-175).
 *
 * O escopo é `(gameWorldId, id)`, como o context map exige por root — e não
 * `find<X>ByWorldId` devolvendo o mundo inteiro sob um `revision` só. Ler uma
 * participação passa a custar uma linha, não o contexto de identidade inteiro.
 *
 * `expectedVersion === null` significa "esta participação não existe": um
 * insert puro, que o `@@unique([gameWorldId, userId])` arbitra se dois
 * ingressos simultâneos correrem juntos.
 */
export interface WorldParticipantRepository {
  findParticipantById(
    gameWorldId: string,
    id: string,
  ): Promise<WorldParticipantSnapshot | null>;

  findParticipantByAccount(
    gameWorldId: string,
    accountId: string,
  ): Promise<WorldParticipantSnapshot | null>;

  saveParticipant(
    snapshot: WorldParticipantSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
