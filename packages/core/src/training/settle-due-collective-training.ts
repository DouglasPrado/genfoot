import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import type { NotificationRepository } from "../notifications/notification-types.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import { PlayerAvailability } from "../players/player-lifecycle-types.js";
import type { PlayerRepository } from "../players/player-repository.js";
import { derivePotentialLayers } from "../players/potential-layers.js";

import { buildCollectiveTrainingNotification } from "./collective-training-report-message.js";
import { focusAttributes } from "./focus-attributes.js";
import { spreadBudget } from "./individual-training-projection.js";
import { sessionRawGainPoints } from "./session-gain.js";
import type { TrainingPlanRepository } from "./training-types.js";

/**
 * O desenvolvimento do plano COLETIVO na virada (fecha a lacuna que o dono viu:
 * o plano coletivo não evoluía ninguém — a R-221 tinha tirado o crescimento da
 * virada, deixando só as sessões). Aqui o crescimento volta à virada, mas
 * IMEDIATO (não bufferizado até a temporada), consistente com a R-221.
 *
 * Por entrada do plano: o jogador APTO evolui rumo ao FOCO da entrada (um
 * conjunto de atributos), espalhado nos mais fracos, com um orçamento MODESTO
 * escalado pela carga (é baseline — aditivo ao que sessão/plano individual dão).
 * RECOVERY não desenvolve (descanso). Emite UM aviso-resumo por clube.
 */
export interface SettleDueCollectiveTrainingInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface SettleDueCollectiveTrainingResult {
  readonly developedCount: number;
  readonly clubsNotified: number;
}

export interface CollectiveTrainingRepositories {
  readonly plans: TrainingPlanRepository;
  readonly players: PlayerRepository;
  readonly notifications: NotificationRepository;
}

export interface CollectiveTrainingUnitOfWork {
  run<T>(work: (repos: CollectiveTrainingRepositories) => Promise<T>): Promise<T>;
}

function ageOn(birthDate: string, worldDate: string): number {
  const b = birthDate.slice(0, 10);
  const d = worldDate.slice(0, 10);
  let age = Number(d.slice(0, 4)) - Number(b.slice(0, 4));
  if (d.slice(5) < b.slice(5)) age -= 1;
  return age;
}

/**
 * Orçamento diário do coletivo por carga (VAL-001): poupando = 0, leve = 1,
 * firme/pesado = 2 — sempre tetado pela folga de sessão do jogador. Modesto: o
 * coletivo é a base; a sessão/plano individual é o extra focado.
 */
function collectiveBudget(workload: number, sessionHeadroom: number): number {
  const tier = workload <= 0 ? 0 : workload < 40 ? 1 : 2;
  return Math.max(0, Math.min(tier, sessionHeadroom));
}

export class SettleDueCollectiveTraining {
  public constructor(private readonly uow: CollectiveTrainingUnitOfWork) {}

  public async execute(
    input: SettleDueCollectiveTrainingInput,
  ): Promise<Result<SettleDueCollectiveTrainingResult, DomainError>> {
    return this.uow.run(async ({ plans, players, notifications }) => {
      const active = await plans.findAllActive(input.gameWorldId);
      let developedCount = 0;
      let clubsNotified = 0;

      for (const plan of active) {
        let clubDeveloped = 0;
        for (const entry of plan.entries) {
          const done = await developEntry(players, {
            gameWorldId: input.gameWorldId,
            playerId: entry.playerId,
            focus: entry.focus,
            workload: entry.workload,
            worldSeed: input.worldSeed,
            worldDate: input.worldDate,
            rulesetVersion: input.rulesetVersion,
          });
          if (done) clubDeveloped += 1;
        }
        if (clubDeveloped > 0) {
          developedCount += clubDeveloped;
          clubsNotified += 1;
          await notifications.append(
            buildCollectiveTrainingNotification({
              gameWorldId: input.gameWorldId,
              worldSeed: input.worldSeed,
              clubId: plan.clubId,
              developedCount: clubDeveloped,
              worldDate: input.worldDate,
            }),
          );
        }
      }

      return succeed({ developedCount, clubsNotified });
    });
  }
}

async function developEntry(
  players: PlayerRepository,
  input: {
    readonly gameWorldId: string;
    readonly playerId: string;
    readonly focus: string;
    readonly workload: number;
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
  if (snapshot.player.availability !== PlayerAvailability.AVAILABLE) return false;

  const codes = focusAttributes(input.focus, snapshot.player.primaryPosition);
  if (codes.length === 0) return false; // RECOVERY / foco sem atributos = descanso

  const loaded = Player.fromSnapshot(snapshot.player);
  if (!loaded.ok) return false;
  const player = loaded.value;

  const usableCeiling = derivePotentialLayers({
    natural: snapshot.player.potentialAbility,
    baselineAbility: snapshot.player.baselineAbility,
    currentAbility: snapshot.player.currentAbility,
  }).usable;
  const headroom = sessionRawGainPoints({
    usableCeiling,
    currentAbility: snapshot.player.currentAbility,
    morale: snapshot.player.dynamicState.morale,
    fatigue: snapshot.player.dynamicState.fatigue,
    age: ageOn(snapshot.person.birthDate, input.worldDate),
    elapsedDays: 1,
    durationDays: 1,
  });
  const budget = collectiveBudget(input.workload, headroom);
  if (budget <= 0) return false;

  const changes = spreadBudget(codes, budget, (code) =>
    player.attributeValue(code as PlayerAttributeCode),
  );

  let developed = false;
  for (const change of changes) {
    const applied = player.applyAttributeChange({
      historyId: deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `collective-training:${input.playerId}:${input.worldDate}:${change.attributeCode}`,
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
