import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { recommendedAttributes } from "../players/position-attributes.js";
import { derivePotentialLayers } from "../players/potential-layers.js";
import type { CohesionWriter } from "../training/train-formation-cohesion.js";
import { perAttributeGain, sessionRawGainPoints } from "../training/session-gain.js";

/**
 * O treino dos clubes de IA na virada do dia — para que os times sem técnico
 * humano NÃO fiquem parados enquanto o do jogador evolui (balanceamento).
 *
 * Cada clube de IA, por dia: (1) desenvolve seus jogadores com folga de
 * potencial na habilidade RECOMENDADA mais fraca (o mesmo ganho diário e as
 * mesmas fórmulas do treino humano — `session-gain` + `position-attributes`), e
 * (2) sobe o ENTROSAMENTO (treino de formação), igual à coleta do treino em
 * grupo humano. Determinístico; nada de `Date.now`/`Math.random`.
 *
 * Só clube SEM controle humano ativo entra (o `reader` decide). Um jogador que
 * falha é PULADO, não derruba a virada.
 */
export const AI_TRAIN_MAX_PER_CLUB = 30;
/**
 * Quantas habilidades recomendadas a IA desenvolve por jogador/dia. >1 faz o
 * overall subir mais rápido (a IA chega a level alto rumo ao potencial numa
 * temporada) — cada uma recebe o ganho CHEIO (não dividido). VAL-001.
 */
export const AI_ATTRS_PER_PLAYER = 2;

export interface AiTrainingReader {
  /** Clubes do mundo sem controle humano ativo (os "de IA"). */
  aiClubIds(gameWorldId: string): Promise<readonly string[]>;
  /** Ids dos jogadores APTOS do clube, mais folga de potencial primeiro (limitado). */
  availablePlayerIds(
    gameWorldId: string,
    clubId: string,
    limit: number,
  ): Promise<readonly string[]>;
}

export interface AiTrainingRepositories {
  readonly reader: AiTrainingReader;
  readonly players: PlayerRepository;
  readonly cohesion: CohesionWriter;
}

export interface AiTrainingUnitOfWork {
  run<T>(work: (repos: AiTrainingRepositories) => Promise<T>): Promise<T>;
}

export interface RunAiClubsTrainingInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface RunAiClubsTrainingResult {
  readonly clubsTrained: number;
  readonly playersDeveloped: number;
}

function ageOn(birthDate: string, worldDate: string): number {
  const b = birthDate.slice(0, 10);
  const d = worldDate.slice(0, 10);
  let age = Number(d.slice(0, 4)) - Number(b.slice(0, 4));
  if (d.slice(5) < b.slice(5)) age -= 1;
  return age;
}

export class RunAiClubsTraining {
  public constructor(private readonly uow: AiTrainingUnitOfWork) {}

  public async execute(
    input: RunAiClubsTrainingInput,
  ): Promise<Result<RunAiClubsTrainingResult, DomainError>> {
    return this.uow.run(async ({ reader, players, cohesion }) => {
      const clubIds = await reader.aiClubIds(input.gameWorldId);
      let playersDeveloped = 0;

      for (const clubId of clubIds) {
        const playerIds = await reader.availablePlayerIds(
          input.gameWorldId,
          clubId,
          AI_TRAIN_MAX_PER_CLUB,
        );

        for (const playerId of playerIds) {
          const developed = await developPlayer(players, {
            gameWorldId: input.gameWorldId,
            playerId,
            worldSeed: input.worldSeed,
            worldDate: input.worldDate,
            rulesetVersion: input.rulesetVersion,
          });
          if (developed) playersDeveloped += 1;
        }

        // Treino de EQUIPE: sobe o entrosamento (mesma escrita do humano).
        await cohesion.raiseByFormationTraining(input.gameWorldId, clubId);
      }

      return succeed({ clubsTrained: clubIds.length, playersDeveloped });
    });
  }
}

/** Desenvolve UM jogador de IA na sua habilidade recomendada mais fraca. */
async function developPlayer(
  players: PlayerRepository,
  input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly worldSeed: string;
    readonly worldDate: string;
    readonly rulesetVersion: RulesetVersion;
  },
): Promise<boolean> {
  const snapshot = await players.findPlayerById(
    input.gameWorldId as never,
    input.playerId as never,
  );
  if (snapshot === null) return false;
  const loaded = Player.fromSnapshot(snapshot.player);
  if (!loaded.ok) return false;
  const player = loaded.value;

  const usableCeiling = derivePotentialLayers({
    natural: snapshot.player.potentialAbility,
    baselineAbility: snapshot.player.baselineAbility,
    currentAbility: snapshot.player.currentAbility,
  }).usable;
  const rawGain = sessionRawGainPoints({
    usableCeiling,
    currentAbility: snapshot.player.currentAbility,
    morale: snapshot.player.dynamicState.morale,
    fatigue: snapshot.player.dynamicState.fatigue,
    age: ageOn(snapshot.person.birthDate, input.worldDate),
    elapsedDays: 1,
    durationDays: 1,
  });
  if (rawGain <= 0) return false;

  // As RECOMENDADAS mais fracas com espaço até 100 — onde o ganho rende. Treina
  // as N mais fracas (cada uma com o ganho cheio) para o overall subir de fato.
  const targets = recommendedAttributes(snapshot.player.primaryPosition)
    .map((code) => ({ code, value: player.attributeValue(code as PlayerAttributeCode) }))
    .filter((c): c is { code: string; value: number } => c.value !== null && c.value < 100)
    .sort((a, b) => a.value - b.value)
    .slice(0, AI_ATTRS_PER_PLAYER);
  if (targets.length === 0) return false;

  let developed = false;
  for (const target of targets) {
    const gain = perAttributeGain({
      rawGain,
      attributeCount: 1,
      attributeCurrentValue: player.attributeValue(target.code as PlayerAttributeCode) ?? target.value,
    });
    if (gain <= 0) continue;
    const currentValue =
      player.attributeValue(target.code as PlayerAttributeCode) ?? target.value;
    const applied = player.applyAttributeChange({
      historyId: deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `ai-training:${input.playerId}:${input.worldDate}:${target.code}`,
        timestampMilliseconds: 0,
      }),
      attributeCode: target.code as PlayerAttributeCode,
      requestedValue: currentValue + gain,
      cause: "training-session",
      worldDate: input.worldDate,
      rulesetVersion: input.rulesetVersion,
    });
    if (applied.ok && applied.value !== null) developed = true;
  }
  if (!developed) return false;
  await players.savePlayer(
    { player: player.snapshot(), person: snapshot.person },
    snapshot.player.version,
  );
  return true;
}
