import { DomainError, fail, succeed, type Result } from "@grinta/shared";
import type { RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import { derivePotentialLayers } from "../players/potential-layers.js";

import { projectSessionGainPoints } from "./session-gain.js";
import { sessionElapsedDays } from "./training-session.js";
import type {
  TrainingSessionRepositories,
  TrainingSessionSnapshot,
  TrainingSessionUnitOfWork,
} from "./training-session-types.js";

/**
 * Coleta/encerra a sessão e APLICA o ganho NA HORA (R-221 Fase 2a,
 * `training:collect-session`).
 *
 * O ganho é o diário (fórmula canônica) pelos dias efetivamente treinados,
 * tetado na duração — coletar antes do fim rende PARCIAL. Aplica direto no
 * atributo (não bufferiza até a virada), respeitando o teto do potencial
 * aproveitável (R-216). O jogador volta a ficar disponível e sai cansado
 * (o treino fatiga).
 *
 * A fórmula do ganho vive agora em `session-gain` (pura, compartilhada com a
 * projeção da tela). Aqui sobra só a fadiga por dia, que é efeito da coleta.
 */
const TRAINING_FATIGUE_PER_DAY = 3;

export interface CollectTrainingSessionInput {
  readonly gameWorldId: string;
  readonly playerId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface CollectTrainingSessionResult {
  readonly attributeCode: string;
  readonly gainPoints: number;
  readonly elapsedDays: number;
  readonly complete: boolean;
}


/** Idade em anos cheios de uma data de nascimento até a data corrente. */
function ageOn(birthDate: string, worldDate: string): number {
  const b = birthDate.slice(0, 10);
  const d = worldDate.slice(0, 10);
  let age = Number(d.slice(0, 4)) - Number(b.slice(0, 4));
  if (d.slice(5) < b.slice(5)) age -= 1;
  return age;
}

/**
 * Encerra UMA sessão já carregada: aplica o ganho (parcial pelo tempo, tetado no
 * potencial aproveitável), libera o jogador (`endTraining`), fatiga e fecha a
 * sessão — num único commit sobre os repos dados. Compartilhado pela coleta
 * manual (`CollectTrainingSession`) e pelo settle da virada de dia
 * (`SettleDueTrainingSessions`), para que os dois caminhos apliquem EXATAMENTE o
 * mesmo efeito. Não abre transação: recebe os repos de quem já está numa.
 */
export async function settleTrainingSession(
  repos: TrainingSessionRepositories,
  input: {
    readonly session: TrainingSessionSnapshot;
    readonly worldSeed: string;
    readonly worldDate: string;
    readonly rulesetVersion: RulesetVersion;
  },
): Promise<Result<CollectTrainingSessionResult, DomainError>> {
  const { sessions, players } = repos;
  const { session } = input;

  const snapshot = await players.findPlayerById(
    session.gameWorldId as never,
    session.playerId as never,
  );
  if (snapshot === null) {
    return fail(
      new DomainError("PLAYER_NOT_FOUND", "Jogador não encontrado.", {
        playerId: session.playerId,
      }),
    );
  }
  const loaded = Player.fromSnapshot(snapshot.player);
  if (!loaded.ok) return loaded;
  const player = loaded.value;

  const code = session.attributeCode as PlayerAttributeCode;
  const current = player.attributeValue(code);
  const elapsedDays = sessionElapsedDays(session.startDate, input.worldDate);

  let gainPoints = 0;
  if (current !== null) {
    const ceiling = derivePotentialLayers({
      natural: snapshot.player.potentialAbility,
      baselineAbility: snapshot.player.baselineAbility,
      currentAbility: snapshot.player.currentAbility,
    }).usable;
    // A MESMA conta que a projeção da tela usa (session-gain), para que o que
    // o jogador vê antes de coletar bata com o que a coleta aplica.
    gainPoints = projectSessionGainPoints({
      attributeCurrentValue: current,
      usableCeiling: ceiling,
      currentAbility: snapshot.player.currentAbility,
      morale: snapshot.player.dynamicState.morale,
      fatigue: snapshot.player.dynamicState.fatigue,
      age: ageOn(snapshot.person.birthDate, input.worldDate),
      elapsedDays,
      durationDays: session.durationDays,
    });
    if (gainPoints > 0) {
      const applied = player.applyAttributeChange({
        historyId: deterministicUuidV7({
          worldSeed: input.worldSeed,
          context: `training-session:${session.id}`,
          timestampMilliseconds: 0,
        }),
        attributeCode: code,
        requestedValue: current + gainPoints,
        cause: "training-session",
        worldDate: input.worldDate,
        rulesetVersion: input.rulesetVersion,
      });
      if (!applied.ok) return applied;
      // O clamp/teto pode ter aparado o ganho: reporta o efetivo.
      gainPoints = applied.value === null ? 0 : applied.value.nextValue - current;
    }
  }

  // O jogador volta ao elenco e sai cansado — o treino fatiga.
  player.endTraining();
  const effectiveDays = Math.min(elapsedDays, session.durationDays);
  player.addFatigue(effectiveDays * TRAINING_FATIGUE_PER_DAY);

  const closed: TrainingSessionSnapshot = {
    ...session,
    active: false,
    version: session.version + 1,
  };
  await sessions.save(closed, session.version);
  await players.savePlayer(
    { player: player.snapshot(), person: snapshot.person },
    snapshot.player.version,
  );

  return succeed({
    attributeCode: session.attributeCode,
    gainPoints,
    elapsedDays,
    complete: elapsedDays >= session.durationDays,
  });
}

export class CollectTrainingSession {
  public constructor(private readonly uow: TrainingSessionUnitOfWork) {}

  public async execute(
    input: CollectTrainingSessionInput,
  ): Promise<Result<CollectTrainingSessionResult, DomainError>> {
    return this.uow.run(async (repos) => {
      const session = await repos.sessions.findActiveByPlayer(
        input.gameWorldId,
        input.playerId,
      );
      if (session === null) {
        return fail(
          new DomainError(
            "NO_ACTIVE_TRAINING_SESSION",
            "O jogador não tem sessão de treino ativa.",
            { playerId: input.playerId },
          ),
        );
      }
      return settleTrainingSession(repos, {
        session,
        worldSeed: input.worldSeed,
        worldDate: input.worldDate,
        rulesetVersion: input.rulesetVersion,
      });
    });
  }
}
