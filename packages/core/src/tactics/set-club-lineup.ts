import { DomainError, fail, succeed, type Result } from "@grinta/shared";

import {
  deterministicUuidV7,
  timestampOf,
} from "../foundation/deterministic-uuid.js";
import type { PlayerPosition } from "../genesis/genesis-types.js";

import { fillQuality, formationSlots, isKnownFormation } from "./formation.js";
import type {
  LineupContextReader,
  LineupEvent,
  LineupRepository,
  LineupSnapshot,
  LineupStarterSnapshot,
  LineupWarning,
} from "./lineup-types.js";

/**
 * Definir a escalação corrente do clube — command `tactics:set-lineup`
 * (`M-LINEUP`, R-220 Fase 1).
 *
 * Valida o essencial (formação conhecida, 11 titulares, sem repetido, todos no
 * elenco) e AVISA sobre jogador fora de posição sem bloquear (a escalação é do
 * treinador — R-220/§B). Concorrência otimista por `expectedVersion`, como o
 * plano de treino. Id determinístico por `(mundo, clube)`: um lineup por clube.
 */
export interface SetClubLineupInput {
  readonly gameWorldId: string;
  readonly clubId: string;
  readonly worldSeed: string;
  readonly occurredOn: string;
  readonly formation: string;
  /** 11 ids de titular, em ORDEM de slot (índice i → slot i da formação). */
  readonly starters: readonly string[];
  readonly bench: readonly string[];
  readonly expectedVersion: number | null;
}

export interface SetClubLineupResult {
  readonly lineup: LineupSnapshot;
  readonly warnings: readonly LineupWarning[];
  readonly events: readonly LineupEvent[];
}

const STARTERS = 11;

const invalid = (message: string, details?: Record<string, unknown>) =>
  fail(new DomainError("LINEUP_INVALID", message, details));

export class SetClubLineup {
  public constructor(
    private readonly repository: LineupRepository,
    private readonly context: LineupContextReader,
  ) {}

  public async execute(
    input: SetClubLineupInput,
  ): Promise<Result<SetClubLineupResult, DomainError>> {
    const slots = formationSlots(input.formation);
    if (!isKnownFormation(input.formation) || slots === null) {
      return invalid("Formação desconhecida.", { formation: input.formation });
    }
    if (input.starters.length !== STARTERS) {
      return invalid("A escalação precisa de exatamente 11 titulares.", {
        titulares: input.starters.length,
      });
    }

    // Sem repetição entre titulares E banco: um jogador está em UM lugar.
    const vistos = new Set<string>();
    for (const id of [...input.starters, ...input.bench]) {
      if (vistos.has(id)) {
        return invalid("O mesmo jogador aparece duas vezes na escalação.", {
          playerId: id,
        });
      }
      vistos.add(id);
    }

    const squad = await this.context.squadPlayers(
      input.gameWorldId,
      input.clubId,
    );
    const positionOf = new Map<string, PlayerPosition>(
      squad.map((p) => [p.playerId, p.primaryPosition]),
    );
    for (const id of [...input.starters, ...input.bench]) {
      if (!positionOf.has(id)) {
        return fail(
          new DomainError(
            "PLAYER_NOT_IN_SQUAD",
            "Jogador não pertence ao elenco do clube.",
            { playerId: id },
          ),
        );
      }
    }

    const existing = await this.repository.findByClub(
      input.gameWorldId,
      input.clubId,
    );
    const versaoAtual = existing?.version ?? null;
    if (versaoAtual !== input.expectedVersion) {
      return fail(
        new DomainError(
          "AGGREGATE_VERSION_CONFLICT",
          "A escalação mudou desde a leitura; recarregue e reenvie.",
          { expectedVersion: input.expectedVersion, actualVersion: versaoAtual },
        ),
      );
    }

    // Cada titular assume o slot do seu índice; fillQuality pondera fora-de-posição.
    const warnings: LineupWarning[] = [];
    const starters: LineupStarterSnapshot[] = input.starters.map(
      (playerId, slotIndex): LineupStarterSnapshot => {
        const slotPosition = slots[slotIndex]!;
        const q = fillQuality(positionOf.get(playerId)!, slotPosition);
        if (q < 1) warnings.push({ playerId, slotPosition, fillQuality: q });
        return { playerId, slotIndex, slotPosition, fillQuality: q };
      },
    );

    const lineup: LineupSnapshot = {
      id:
        existing?.id ??
        deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `${input.gameWorldId}:lineup:${input.clubId}`,
          timestampMilliseconds: timestampOf(input.occurredOn),
        }),
      gameWorldId: input.gameWorldId,
      clubId: input.clubId,
      formation: input.formation,
      starters,
      bench: input.bench,
      version: (versaoAtual ?? 0) + 1,
    };

    await this.repository.save(lineup, versaoAtual);

    return succeed({
      lineup,
      warnings,
      events: [
        {
          type: "LineupSet",
          lineupId: lineup.id,
          clubId: lineup.clubId,
          formation: lineup.formation,
        },
      ],
    });
  }
}
