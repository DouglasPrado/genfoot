import type { PositionGroup, SquadPlayer } from "./squad-data";

export type FormationKey = "4-4-2" | "4-3-3" | "4-2-1-3" | "4-2-3-1" | "3-5-2";

export const FORMATION_KEYS: readonly FormationKey[] = ["4-2-1-3", "4-3-3", "4-4-2", "4-2-3-1", "3-5-2"];

/** Slot da formação: papel, grupo de posição e coords normalizadas (ataque p/ cima). */
export interface Slot {
  readonly role: string;
  readonly group: PositionGroup;
  readonly x: number; // 0 (esq) .. 1 (dir)
  readonly y: number; // 0 (ataque/topo) .. 1 (defesa/base)
}

const GK: Slot = { role: "GOL", group: "GOL", x: 0.5, y: 0.92 };

export const FORMATIONS: Record<FormationKey, readonly Slot[]> = {
  "4-4-2": [
    GK,
    { role: "LE", group: "DEF", x: 0.14, y: 0.68 },
    { role: "ZAG", group: "DEF", x: 0.38, y: 0.72 },
    { role: "ZAG", group: "DEF", x: 0.62, y: 0.72 },
    { role: "LD", group: "DEF", x: 0.86, y: 0.68 },
    { role: "ME", group: "MEI", x: 0.14, y: 0.44 },
    { role: "MC", group: "MEI", x: 0.38, y: 0.48 },
    { role: "MC", group: "MEI", x: 0.62, y: 0.48 },
    { role: "MD", group: "MEI", x: 0.86, y: 0.44 },
    { role: "ATA", group: "ATA", x: 0.38, y: 0.18 },
    { role: "ATA", group: "ATA", x: 0.62, y: 0.18 },
  ],
  "4-3-3": [
    GK,
    { role: "LE", group: "DEF", x: 0.14, y: 0.68 },
    { role: "ZAG", group: "DEF", x: 0.38, y: 0.72 },
    { role: "ZAG", group: "DEF", x: 0.62, y: 0.72 },
    { role: "LD", group: "DEF", x: 0.86, y: 0.68 },
    { role: "VOL", group: "MEI", x: 0.5, y: 0.56 },
    { role: "MC", group: "MEI", x: 0.3, y: 0.46 },
    { role: "MC", group: "MEI", x: 0.7, y: 0.46 },
    { role: "PTE", group: "ATA", x: 0.18, y: 0.2 },
    { role: "ATA", group: "ATA", x: 0.5, y: 0.15 },
    { role: "PTD", group: "ATA", x: 0.82, y: 0.2 },
  ],
  "4-2-1-3": [
    GK,
    { role: "LE", group: "DEF", x: 0.14, y: 0.68 },
    { role: "ZAG", group: "DEF", x: 0.38, y: 0.72 },
    { role: "ZAG", group: "DEF", x: 0.62, y: 0.72 },
    { role: "LD", group: "DEF", x: 0.86, y: 0.68 },
    { role: "VOL", group: "MEI", x: 0.38, y: 0.55 },
    { role: "VOL", group: "MEI", x: 0.62, y: 0.55 },
    { role: "MEI", group: "MEI", x: 0.5, y: 0.4 },
    { role: "PTE", group: "ATA", x: 0.2, y: 0.2 },
    { role: "ATA", group: "ATA", x: 0.5, y: 0.15 },
    { role: "PTD", group: "ATA", x: 0.8, y: 0.2 },
  ],
  "4-2-3-1": [
    GK,
    { role: "LE", group: "DEF", x: 0.14, y: 0.68 },
    { role: "ZAG", group: "DEF", x: 0.38, y: 0.72 },
    { role: "ZAG", group: "DEF", x: 0.62, y: 0.72 },
    { role: "LD", group: "DEF", x: 0.86, y: 0.68 },
    { role: "VOL", group: "MEI", x: 0.38, y: 0.57 },
    { role: "VOL", group: "MEI", x: 0.62, y: 0.57 },
    { role: "ME", group: "MEI", x: 0.22, y: 0.37 },
    { role: "MEI", group: "MEI", x: 0.5, y: 0.35 },
    { role: "MD", group: "MEI", x: 0.78, y: 0.37 },
    { role: "ATA", group: "ATA", x: 0.5, y: 0.15 },
  ],
  "3-5-2": [
    GK,
    { role: "ZAG", group: "DEF", x: 0.3, y: 0.72 },
    { role: "ZAG", group: "DEF", x: 0.5, y: 0.74 },
    { role: "ZAG", group: "DEF", x: 0.7, y: 0.72 },
    { role: "ALA", group: "MEI", x: 0.12, y: 0.5 },
    { role: "VOL", group: "MEI", x: 0.35, y: 0.54 },
    { role: "MC", group: "MEI", x: 0.5, y: 0.5 },
    { role: "VOL", group: "MEI", x: 0.65, y: 0.54 },
    { role: "ALA", group: "MEI", x: 0.88, y: 0.5 },
    { role: "ATA", group: "ATA", x: 0.38, y: 0.17 },
    { role: "ATA", group: "ATA", x: 0.62, y: 0.17 },
  ],
};

const GROUP_ORDER: Record<PositionGroup, number> = { GOL: 0, DEF: 1, MEI: 2, ATA: 3 };

/**
 * Atribui 11 jogadores aos slots da formação. Retorna os ids alinhados aos slots
 * de FORMATIONS[key].
 *
 * Três passadas, nesta ordem: POSIÇÃO exata (o rótulo do jogador é o papel do
 * slot), depois o GRUPO, depois qualquer um. A passada de posição importa de
 * verdade porque o servidor pondera cada titular por `fillQuality`
 * (`packages/core/src/tactics/formation.ts`): fora da posição natural o jogador
 * rende 80% na mesma linha e menos fora dela. Casando só por grupo, um zagueiro
 * caía na lateral e o time ficava MAIS FRACO escalado do que sem escalação —
 * o que passou a doer quando a escalação virou autosave.
 */
/** Lê id/group/ovr e, quando houver, o rótulo de posição ("ZAG", "LE"…). */
type AssignablePlayer = Pick<SquadPlayer, "id" | "group" | "ovr"> &
  Partial<Pick<SquadPlayer, "position">>;

export function assignToFormation(players: readonly AssignablePlayer[], key: FormationKey): string[] {
  const slots = FORMATIONS[key];
  const pool = [...players].sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || b.ovr - a.ovr);
  const used = new Set<string>();
  const bySlot = new Array<string | undefined>(slots.length);

  // 1ª passada: quem joga exatamente naquele papel, o melhor primeiro.
  slots.forEach((slot, index) => {
    const pick = pool.find((p) => !used.has(p.id) && p.position === slot.role);
    if (pick) {
      used.add(pick.id);
      bySlot[index] = pick.id;
    }
  });
  // 2ª e 3ª: o mesmo setor e, em último caso, qualquer um — nunca deixa buraco.
  slots.forEach((slot, index) => {
    if (bySlot[index] !== undefined) return;
    const pick =
      pool.find((p) => !used.has(p.id) && p.group === slot.group) ??
      pool.find((p) => !used.has(p.id));
    if (pick) {
      used.add(pick.id);
      bySlot[index] = pick.id;
    }
  });
  return bySlot.filter((id): id is string => id !== undefined);
}
