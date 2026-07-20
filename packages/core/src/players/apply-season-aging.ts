import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "./player.js";
import type { PlayerRepository } from "./player-repository.js";
import { PHYSICAL_ATTRIBUTES } from "./player-attributes.js";
import { physicalDeclineFor } from "./age-decline.js";
import { decidesToRetire } from "./retirement-decision.js";

/**
 * A virada de temporada envelhece o elenco (R-217, passo 7, INV-29).
 *
 * Para cada jogador ativo do mundo: aplica o declínio físico por idade (perda
 * nos atributos físicos) e faz o roll de aposentadoria (determinístico, R-182).
 * Atributo e `careerStatus` mudam no MESMO commit — a atomicidade é o que torna
 * o replay seguro.
 *
 * Não repõe quem sai: a regeneração (R-114) é outro vertical, com decisão de
 * produto pendente. Enquanto ela não existir, isto ENCOLHE o elenco a cada
 * virada — e é sabido.
 */
export interface SeasonAgingRoster {
  /** Jogadores ativos do mundo, com a idade corrente. */
  activePlayers(
    gameWorldId: string,
  ): Promise<readonly { readonly playerId: string; readonly age: number }[]>;
}

export interface SeasonAgingRepositories {
  readonly players: PlayerRepository;
  readonly roster: SeasonAgingRoster;
}

export interface SeasonAgingUnitOfWork {
  run<T>(work: (repos: SeasonAgingRepositories) => Promise<T>): Promise<T>;
}

export interface ApplySeasonAgingInput {
  readonly gameWorldId: string;
  readonly seasonId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export class ApplySeasonAging {
  public constructor(private readonly uow: SeasonAgingUnitOfWork) {}

  public async execute(
    input: ApplySeasonAgingInput,
  ): Promise<Result<{ declined: number; retired: number }, DomainError>> {
    return this.uow.run(async ({ players, roster }) => {
      const active = await roster.activePlayers(input.gameWorldId);
      let declined = 0;
      let retired = 0;

      for (const { playerId, age } of active) {
        const snapshot = await players.findPlayerById(
          input.gameWorldId as never,
          playerId as never,
        );
        if (snapshot === null) continue;
        const loaded = Player.fromSnapshot(snapshot.player);
        if (!loaded.ok) return loaded;
        const player = loaded.value;

        // Trava de idempotência (INV-29): quem já envelheceu nesta temporada não
        // envelhece de novo. Sem isto, reprocessar a virada declinava o
        // sobrevivente duas vezes — provado por HTTP (63 → 61 em duas chamadas).
        if (player.wasAgedIn(input.seasonId)) continue;

        // ── Declínio físico: perda por atributo, delta negativo.
        let lostSomething = false;
        for (const code of PHYSICAL_ATTRIBUTES) {
          const current = player.attributeValue(code);
          if (current === null) continue;
          const loss = physicalDeclineFor(age, current);
          if (loss <= 0) continue;
          const historyId = deterministicUuidV7({
            worldSeed: input.worldSeed,
            context: `aging-decline:${input.seasonId}:${playerId}:${code}`,
            timestampMilliseconds: 0,
          });
          const applied = player.applyAttributeChange({
            historyId: historyId as never,
            attributeCode: code,
            requestedValue: current - loss,
            cause: "season-aging-decline",
            worldDate: input.worldDate,
            rulesetVersion: input.rulesetVersion,
          });
          if (!applied.ok) return applied;
          if (applied.value !== null) lostSomething = true;
        }
        if (lostSomething) declined += 1;

        // ── Aposentadoria: roll determinístico.
        const retires = decidesToRetire({
          worldSeed: input.worldSeed,
          playerId,
          seasonId: input.seasonId,
          age,
        });
        if (retires) {
          player.retire();
          retired += 1;
        }

        // Carimba a temporada envelhecida — a trava de replay acima só funciona
        // se isto persistir. Sempre, mesmo sem declínio nem aposentadoria: o que
        // marca é "este jogador já passou pela virada desta temporada".
        player.markAged(input.seasonId);

        await players.savePlayer(
          { player: player.snapshot(), person: snapshot.person },
          snapshot.player.version,
        );
      }

      return succeed({ declined, retired });
    });
  }
}
