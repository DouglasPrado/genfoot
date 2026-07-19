import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { Player } from "../players/player.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { applyAccruals, type AccrualToApply } from "./apply-accruals.js";

/**
 * A virada de temporada aplica o accrual (INV-29/R-113).
 *
 * Uma vez por temporada, o buffer acumulado vira mudança de atributo — e é
 * ZERADO no mesmo commit. É o único ponto em que atributo estrutural se move
 * (R-113), e a atomicidade é o que torna o replay seguro: ou o jogador evolui e
 * o buffer some juntos, ou nada acontece. Aplicar e não zerar reaplicaria o
 * ganho na próxima virada; zerar e não aplicar perderia o treino da temporada.
 */
export interface SeasonAccrualRow {
  readonly playerId: string;
  readonly attributeCode: string;
  readonly pendingDeltaMinor: bigint;
}

export interface SeasonAccrualStore {
  listForSeason(
    gameWorldId: string,
    seasonId: string,
  ): Promise<readonly SeasonAccrualRow[]>;
  clearConsumed(
    playerId: string,
    seasonId: string,
    attributeCodes: readonly string[],
  ): Promise<void>;
}

export interface SeasonAccrualRepositories {
  readonly players: PlayerRepository;
  readonly accruals: SeasonAccrualStore;
}

export interface SeasonAccrualUnitOfWork {
  run<T>(work: (repos: SeasonAccrualRepositories) => Promise<T>): Promise<T>;
}

export interface ApplySeasonAccrualsInput {
  readonly gameWorldId: string;
  readonly seasonId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export class ApplySeasonAccruals {
  public constructor(private readonly uow: SeasonAccrualUnitOfWork) {}

  public async execute(
    input: ApplySeasonAccrualsInput,
  ): Promise<Result<{ playersAffected: number }, DomainError>> {
    return this.uow.run(async ({ players, accruals }) => {
      const rows = await accruals.listForSeason(
        input.gameWorldId,
        input.seasonId,
      );
      // Agrupa por jogador: um save por jogador, não um por atributo — o Player
      // é o agregado, e aplicar atributo a atributo gastaria N versões dele.
      const byPlayer = new Map<string, AccrualToApply[]>();
      for (const row of rows) {
        const list = byPlayer.get(row.playerId) ?? [];
        list.push({
          attributeCode: row.attributeCode,
          pendingDeltaMinor: row.pendingDeltaMinor,
        });
        byPlayer.set(row.playerId, list);
      }

      let playersAffected = 0;
      for (const [playerId, accrualList] of byPlayer) {
        const snapshot = await players.findPlayerById(
          input.gameWorldId as never,
          playerId as never,
        );
        // Buffer de jogador que não está mais no repositório (vendido, aposentado
        // entre o treino e a virada): limpa o buffer órfão e segue. Não é erro —
        // é o mundo tendo andado.
        if (snapshot === null) {
          await accruals.clearConsumed(
            playerId,
            input.seasonId,
            accrualList.map((a) => a.attributeCode),
          );
          continue;
        }

        const player = Player.fromSnapshot(snapshot.player);
        if (!player.ok) return player;

        const historyId = deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `accrual-apply:${playerId}:${input.seasonId}`,
          timestampMilliseconds: 0,
        });
        const applied = applyAccruals(player.value, accrualList, {
          historyId: historyId as never,
          worldDate: input.worldDate,
          rulesetVersion: input.rulesetVersion,
        });
        if (!applied.ok) return applied;

        await players.savePlayer(
          { player: player.value.snapshot(), person: snapshot.person },
          snapshot.player.version,
        );
        // Zera SÓ o que foi consumido, no mesmo commit — a trava de replay.
        await accruals.clearConsumed(
          playerId,
          input.seasonId,
          applied.value.consumed,
        );
        playersAffected += 1;
      }

      return succeed({ playersAffected });
    });
  }
}
