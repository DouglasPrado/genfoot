import { succeed, type Result } from "@grinta/shared";
import type { DomainError, RulesetVersion } from "@grinta/shared";

import { deterministicUuidV7 } from "../foundation/deterministic-uuid.js";
import { Player } from "../players/player.js";
import type { PlayerAttributeCode } from "../players/player-lifecycle-types.js";
import { PlayerAvailability } from "../players/player-lifecycle-types.js";
import type { PlayerRepository } from "../players/player-repository.js";

import { projectIndividualPlan } from "./individual-training-projection.js";
import {
  MENTOR_DAILY_BONUS,
  type MentorshipRepository,
} from "./mentorship-types.js";

/**
 * A evolução ACELERADA da mentoria na virada do dia — o efeito que o doc de tela
 * promete ("acelerar o desenvolvimento com veteranos/líderes"). Chamado pelos
 * handlers `world:advance-day(s)` junto dos demais settles.
 *
 * Por vínculo: o pupilo APTO ganha +1 na habilidade recomendada mais fraca da
 * SUA posição (reusa `projectIndividualPlan`, target POSIÇÃO, orçamento fixo do
 * mentor). É ADITIVO ao plano individual/sessão — a mentoria acelera por cima.
 * Determinístico; pula quem não está apto; um vínculo que falha é PULADO.
 */
export interface SettleDueMentorshipsInput {
  readonly gameWorldId: string;
  readonly worldSeed: string;
  readonly worldDate: string;
  readonly rulesetVersion: RulesetVersion;
}

export interface SettleDueMentorshipsResult {
  readonly acceleratedCount: number;
  readonly skippedCount: number;
}

export interface MentorshipRepositories {
  readonly mentorships: MentorshipRepository;
  readonly players: PlayerRepository;
}

export interface MentorshipUnitOfWork {
  run<T>(work: (repos: MentorshipRepositories) => Promise<T>): Promise<T>;
}

export class SettleDueMentorships {
  public constructor(private readonly uow: MentorshipUnitOfWork) {}

  public async execute(
    input: SettleDueMentorshipsInput,
  ): Promise<Result<SettleDueMentorshipsResult, DomainError>> {
    return this.uow.run(async ({ mentorships, players }) => {
      const links = await mentorships.findAllActive(input.gameWorldId);
      let acceleratedCount = 0;
      let skippedCount = 0;
      for (const link of links) {
        const done = await accelerate(players, link.menteeId, input);
        if (done) acceleratedCount += 1;
        else skippedCount += 1;
      }
      return succeed({ acceleratedCount, skippedCount });
    });
  }
}

async function accelerate(
  players: PlayerRepository,
  menteeId: string,
  input: SettleDueMentorshipsInput,
): Promise<boolean> {
  const snapshot = await players.findPlayerById(
    input.gameWorldId as never,
    menteeId as never,
  );
  if (snapshot === null) return false;
  if (snapshot.player.availability !== PlayerAvailability.AVAILABLE) return false;

  const loaded = Player.fromSnapshot(snapshot.player);
  if (!loaded.ok) return false;
  const player = loaded.value;

  // Evolução acelerada: +1 na recomendada mais fraca da posição do pupilo.
  const changes = projectIndividualPlan({
    target: { kind: "POSITION", position: snapshot.player.primaryPosition },
    rawGainPoints: MENTOR_DAILY_BONUS,
    attributeValueOf: (code) => player.attributeValue(code as PlayerAttributeCode),
  });

  let developed = false;
  for (const change of changes) {
    const applied = player.applyAttributeChange({
      historyId: deterministicUuidV7({
        worldSeed: input.worldSeed,
        context: `mentorship:${menteeId}:${input.worldDate}:${change.attributeCode}`,
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
