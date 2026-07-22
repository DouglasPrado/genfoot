import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import { PlayerAvailability } from "../players/player-lifecycle-types.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { derivePotentialLayers } from "../players/potential-layers.js";

import type {
  IndividualTrainingPlanRepository,
  IndividualTrainingPlanSnapshot,
} from "./individual-training-plan-types.js";
import { projectIndividualPlan } from "./individual-training-projection.js";
import { sessionRawGainPoints } from "./session-gain.js";

/**
 * Aplica os planos INDIVIDUAIS na virada do dia — o motor que faz o plano
 * individual mexer nos números (senão seria dado inerte). Chamado pelos
 * handlers `world:advance-day(s)` depois de avançar o relógio, junto do settle
 * de sessão, do grupo e do treino da IA.
 *
 * Por plano: desenvolve o jogador rumo ao alvo, gastando o orçamento diário de
 * uma sessão (`sessionRawGainPoints`, 1× — a mesma régua do treino manual):
 *  - **ATRIBUTO**: o orçamento CHEIO no atributo-alvo (ganho concentrado).
 *  - **POSIÇÃO**: +1 nas habilidades recomendadas mais fracas, gastando o
 *    orçamento (perfil da posição, equilibrado por baixo).
 *
 * Pula quem NÃO está apto (lesão, suspensão, ou já em sessão manual ativa — que
 * deixa o jogador indisponível): a sessão manual tem precedência, e o restrito
 * não recebe carga. Determinístico. Um plano que falha é PULADO, não derruba a
 * virada.
 */
export interface SettleDueIndividualTrainingPlansInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface SettleDueIndividualTrainingPlansResult {
  readonly developedCount: number;
  readonly skippedCount: number;
}

export interface IndividualTrainingRepositories {
  readonly plans: IndividualTrainingPlanRepository;
  readonly players: PlayerRepository;
}

export interface IndividualTrainingUnitOfWork {
  run<T>(work: (repos: IndividualTrainingRepositories) => Promise<T>): Promise<T>;
}

function ageOn(birthDate: string, worldDate: string): number {
  const b = birthDate.slice(0, 10);
  const d = worldDate.slice(0, 10);
  let age = Number(d.slice(0, 4)) - Number(b.slice(0, 4));
  if (d.slice(5) < b.slice(5)) age -= 1;
  return age;
}

export class SettleDueIndividualTrainingPlans {
  public constructor(private readonly uow: IndividualTrainingUnitOfWork) {}

  public async execute(
    input: SettleDueIndividualTrainingPlansInput,
  ): Promise<Result<SettleDueIndividualTrainingPlansResult, DomainError>> {
    return this.uow.run(async ({ plans, players }) => {
      const active = await plans.findAllActive(input.gameWorldId);
      let developedCount = 0;
      let skippedCount = 0;
      for (const plan of active) {
        const developed = await developToward(players, plan, input);
        if (developed) developedCount += 1;
        else skippedCount += 1;
      }
      return succeed({ developedCount, skippedCount });
    });
  }
}

/** Desenvolve UM jogador rumo ao alvo do seu plano. `false` = pulado/sem ganho. */
async function developToward(
  players: PlayerRepository,
  plan: IndividualTrainingPlanSnapshot,
  input: SettleDueIndividualTrainingPlansInput,
): Promise<boolean> {
  const snapshot = await players.findPlayerById(
    input.gameWorldId as never,
    plan.playerId as never,
  );
  if (snapshot === null) return false;
  // Só apto desenvolve: lesão/suspensão/convocação — e a sessão manual, que
  // deixa o jogador indisponível — pulam (a manual tem precedência).
  if (snapshot.player.availability !== PlayerAvailability.AVAILABLE) return false;

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

  // A MESMA projeção que a tela mostra (fonte única): aplica exatamente o que a
  // M-TRAINING-INDIV projetou — concentrado no atributo, ou espalhado na posição.
  const changes = projectIndividualPlan({
    target: plan.target,
    rawGainPoints: rawGain,
    attributeValueOf: (code) => player.attributeValue(code as PlayerAttributeCode),
  });

  let developed = false;
  for (const change of changes) {
    const applied = player.applyAttributeChange({
      historyId: deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `individual-training:${plan.playerId}:${input.worldDate}:${change.attributeCode}`,
        timestampMilliseconds: 0,
      }),
      attributeCode: change.attributeCode as PlayerAttributeCode,
      requestedValue: change.after,
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
