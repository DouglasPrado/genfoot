/**
 * Sincronização da escalação local com o elenco oficial (C3).
 *
 * O domínio guarda o elenco como memberships { playerId, slot, category } com
 * slot único ("S01".."S23"). A convenção de titularidade é o número do slot:
 * S01–S11 = titulares (na ordem dos slots da formação), S12+ = reservas.
 * Sincronizar = para cada jogador cujo slot muda, `RemoveSquadMember` e depois
 * `AssignSquadSlot` com o slot novo — removes primeiro (libera os slots),
 * assigns depois. Cada sub-command bem-sucedido incrementa a versão do squad
 * em 1, então o chamador encadeia `expectedVersion` sequencialmente.
 */

export interface LineupMembership {
  readonly playerId: string;
  readonly slot: string;
  readonly category: string;
}

export type LineupSyncCommand =
  | {
      readonly type: "RemoveSquadMember";
      readonly playerId: string;
    }
  | {
      readonly type: "AssignSquadSlot";
      readonly playerId: string;
      readonly slot: string;
      readonly category: string;
    };

function slotFor(index: number): string {
  return `S${String(index + 1).padStart(2, "0")}`;
}

/** Slot desejado por jogador: campo (ordem da formação) → S01..S11; banco → S12+. */
export function desiredSlots(
  onPitchIds: readonly string[],
  benchIds: readonly string[],
): ReadonlyMap<string, string> {
  const desired = new Map<string, string>();
  onPitchIds.forEach((playerId, index) => {
    desired.set(playerId, slotFor(index));
  });
  benchIds.forEach((playerId, index) => {
    desired.set(playerId, slotFor(onPitchIds.length + index));
  });
  return desired;
}

/** True se algum jogador está num slot diferente do desejado. */
export function lineupDiffers(
  memberships: readonly LineupMembership[],
  desired: ReadonlyMap<string, string>,
): boolean {
  return memberships.some((membership) => {
    const target = desired.get(membership.playerId);
    return target !== undefined && target !== membership.slot;
  });
}

/**
 * Plano mínimo de sub-commands do `club:command` para levar as memberships ao
 * estado desejado. Jogadores fora do mapa desejado não são tocados.
 */
export function planLineupSync(
  memberships: readonly LineupMembership[],
  desired: ReadonlyMap<string, string>,
): readonly LineupSyncCommand[] {
  const changed = memberships.filter((membership) => {
    const target = desired.get(membership.playerId);
    return target !== undefined && target !== membership.slot;
  });
  const removes: LineupSyncCommand[] = changed.map((membership) => ({
    type: "RemoveSquadMember",
    playerId: membership.playerId,
  }));
  const assigns: LineupSyncCommand[] = changed.map((membership) => ({
    type: "AssignSquadSlot",
    playerId: membership.playerId,
    slot: desired.get(membership.playerId)!,
    category: membership.category,
  }));
  return [...removes, ...assigns];
}
