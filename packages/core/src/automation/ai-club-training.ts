import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import {
  GOALKEEPING_ATTRIBUTES,
  MENTAL_ATTRIBUTES,
  PHYSICAL_ATTRIBUTES,
  TECHNICAL_ATTRIBUTES,
} from "../players/player-attributes.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { derivePotentialLayers } from "../players/potential-layers.js";
import type { CohesionWriter } from "../training/train-formation-cohesion.js";
import { sessionRawGainPoints } from "../training/session-gain.js";

/**
 * O treino dos clubes de IA na virada do dia — para que os times sem técnico
 * humano NÃO fiquem parados enquanto o do jogador evolui (balanceamento).
 *
 * Cada clube de IA, por dia: (1) desenvolve seus jogadores com folga de
 * potencial subindo TODOS os atributos por igual (o dono pediu "subir tudo
 * equilibrado" — perfil equilibrado, não pontudo), um passo por dia limitado
 * pelo teto de potencial, enquanto houver folga de sessão (`session-gain`), e
 * (2) sobe o ENTROSAMENTO (treino de formação), igual à coleta do treino em
 * grupo humano. Determinístico; nada de `Date.now`/`Math.random`.
 *
 * Só clube SEM controle humano ativo entra (o `reader` decide). Um jogador que
 * falha é PULADO, não derruba a virada.
 */
export const AI_TRAIN_MAX_PER_CLUB = 30;
/**
 * Quanto cada atributo sobe por jogador/dia. Um passo pequeno e IGUAL em todos
 * os atributos (não só os recomendados) mantém o perfil EQUILIBRADO enquanto o
 * overall sobe rumo ao potencial — o `applyAttributeChange` corta cada atributo
 * no teto utilizável, e o `rawGain` da sessão zera quando o jogador chega lá.
 * VAL-001.
 */
export const AI_DAILY_ATTR_STEP = 1;

/** Todos os atributos treináveis — o passo diário sobe cada um que o jogador tem. */
const ALL_ATTRIBUTE_CODES: readonly string[] = [
  ...TECHNICAL_ATTRIBUTES,
  ...PHYSICAL_ATTRIBUTES,
  ...MENTAL_ATTRIBUTES,
  ...GOALKEEPING_ATTRIBUTES,
];

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

/** Desenvolve UM jogador de IA subindo TODOS os atributos por igual (equilibrado). */
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
  // rawGain é o teto de sessão do jogador: zera quando ele chega ao potencial
  // utilizável (é o freio de "level alto = potencial"). Enquanto houver folga,
  // sobe TODOS os atributos que ele tem, o mesmo passo em cada — equilibrado.
  if (rawGain <= 0) return false;

  let developed = false;
  for (const code of ALL_ATTRIBUTE_CODES) {
    const current = player.attributeValue(code as PlayerAttributeCode);
    if (current === null || current >= 100) continue;
    const applied = player.applyAttributeChange({
      historyId: deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `ai-training:${input.playerId}:${input.worldDate}:${code}`,
        timestampMilliseconds: 0,
      }),
      attributeCode: code as PlayerAttributeCode,
      requestedValue: current + AI_DAILY_ATTR_STEP,
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
