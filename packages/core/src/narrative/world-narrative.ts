import {
  DomainError,
  WorldDate,
  fail,
  succeed,
  type Result,
  type RulesetVersion,
} from "@grinta/shared";

import { deterministicUuidV7, timestampOf } from "../foundation/deterministic-uuid.js";
import { SeededRandom } from "../foundation/seeded-random.js";
import type { GameWorldSnapshot } from "../world/world-types.js";
import type {
  MatchOutcome,
  SupporterBaseChangedEvent} from "./narrative-types.js";
import {
  CrisisStatus,
  FanbaseSegment,
  MediaStoryStatus,
  PromiseStatus,
  type ClubFanbaseSnapshot,
  type ConversationSnapshot,
  type MediaStoryPublishedEvent,
  type MediaStorySnapshot,
  type NarrativeClubRef,
  type NarrativeCrisisChangedEvent,
  type NarrativeCrisisSnapshot,
  type NarrativeDomainEvent,
  type NarrativePromiseSnapshot,
  type NarrativeSummary,
  type PromiseMadeEvent,
  type PromiseSettledEvent,
  type ReputationChangedEvent,
  type RivalrySnapshot,
  type SegmentSatisfaction,
  type SupporterSatisfactionChangedEvent,
  type WorldNarrativeSnapshot,
} from "./narrative-types.js";

const INITIAL_SEGMENTS: readonly SegmentSatisfaction[] = [
  { segment: FanbaseSegment.ULTRAS, satisfaction: 50, reactivity: 100 },
  { segment: FanbaseSegment.FAMILY, satisfaction: 50, reactivity: 60 },
  { segment: FanbaseSegment.CASUAL, satisfaction: 50, reactivity: 40 },
];
const DEFAULT_REPUTATION = 50;
/** Piso do headcount da torcida — um rebranding nunca zera a torcida. */
const MIN_FANBASE_SIZE = 500;

/**
 * Semente determinística do tamanho da torcida a partir do porte do clube
 * (banda de reputação + capacidade do estádio). Pura — usada tanto para o
 * default da projeção quanto como base do primeiro fato de rebranding.
 */
export function seedFanbaseSize(
  reputationBand: number,
  stadiumCapacity: number,
): number {
  const rep = Number.isFinite(reputationBand) ? Math.max(0, reputationBand) : 0;
  const capacity =
    Number.isFinite(stadiumCapacity) && stadiumCapacity > 0
      ? Math.floor(stadiumCapacity)
      : 10_000;
  return Math.floor(capacity * (8 + rep * 4));
}

export class WorldNarrative {
  private constructor(private state: WorldNarrativeSnapshot) {}

  public static initialize(
    world: GameWorldSnapshot,
  ): Result<WorldNarrative, DomainError> {
    return WorldNarrative.fromSnapshot({
      gameWorldId: world.id,
      rulesetVersion: world.rulesetVersion,
      fanbases: [],
      reputation: [],
      promises: [],
      crises: [],
      appliedFactIds: [],
      events: [],
      revision: 1,
    });
  }

  public static fromSnapshot(
    snapshot: WorldNarrativeSnapshot,
  ): Result<WorldNarrative, DomainError> {
    if (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1) {
      return fail(invalidNarrative("A revisão da narrativa é inválida."));
    }
    for (const fanbase of snapshot.fanbases) {
      if (
        fanbase.segments.some(
          (segment) => segment.satisfaction < 0 || segment.satisfaction > 100,
        ) ||
        fanbase.overall < 0 ||
        fanbase.overall > 100
      ) {
        return fail(invalidNarrative("Satisfação fora de 0–100."));
      }
    }
    for (const event of snapshot.events) {
      if (event.gameWorldId !== snapshot.gameWorldId) {
        return fail(invalidNarrative("Evento de narrativa inválido."));
      }
    }
    return succeed(new WorldNarrative(snapshot));
  }

  public applyMatchFact(
    input: Readonly<{
      factId: string;
      clubId: NarrativeClubRef;
      outcome: MatchOutcome;
      expected: MatchOutcome;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubFanbaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (this.state.appliedFactIds.includes(input.factId)) {
      return succeed(this.fanbaseFor(input.clubId));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const base = outcomeDelta(input.outcome, input.expected);
    const current = this.fanbaseFor(input.clubId);
    const segments: SegmentSatisfaction[] = current.segments.map((segment) => ({
      ...segment,
      satisfaction: clampScore(
        segment.satisfaction + Math.round((base * segment.reactivity) / 100),
      ),
    }));
    const overall = Math.round(
      segments.reduce((sum, s) => sum + s.satisfaction, 0) / segments.length,
    );
    const fanbase: ClubFanbaseSnapshot = {
      clubId: input.clubId,
      segments,
      overall,
    };
    const factors = [
      `outcome:${input.outcome}`,
      `expected:${input.expected}`,
      `base:${base}`,
    ];
    const event: SupporterSatisfactionChangedEvent = {
      id: this.eventId(input.worldSeed, `satisfaction:${input.idempotencyKey}`, date.value.toString()),
      type: "SupporterSatisfactionChanged",
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      factId: input.factId,
      overall,
      factors,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      fanbases: this.upsertFanbase(fanbase),
      appliedFactIds: [...this.state.appliedFactIds, input.factId],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(fanbase);
  }

  /**
   * Consome o fato oficial `ClubRebranded` (de C3): reduz o tamanho da torcida
   * do clube de 10 a 15% de forma determinística e emite `SupporterBaseChanged`.
   * Idempotente por `factId`. `baseSize` (semente derivada do porte do clube por
   * quem tem acesso a C3) é usado apenas se o clube ainda não tem tamanho gravado.
   */
  public applyRebrandFact(
    input: Readonly<{
      factId: string;
      clubId: NarrativeClubRef;
      baseSize: number;
      changedFields?: readonly string[];
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<ClubFanbaseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (this.state.appliedFactIds.includes(input.factId)) {
      return succeed(this.fanbaseFor(input.clubId));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const current = this.fanbaseFor(input.clubId);
    const currentSize =
      current.fanbaseSize ?? Math.max(0, Math.floor(input.baseSize));
    // Queda determinística em [100, 150] permille = 10,0%–15,0%.
    const dropPermille = new SeededRandom({
      worldSeed: input.worldSeed,
      context: `rebrand-drop:${input.factId}`,
    }).nextInt(100, 151);
    const newSize = Math.max(
      MIN_FANBASE_SIZE,
      Math.floor((currentSize * (1000 - dropPermille)) / 1000),
    );
    const fanbase: ClubFanbaseSnapshot = {
      ...current,
      clubId: input.clubId,
      fanbaseSize: newSize,
    };
    const factors = [
      "reason:REBRAND",
      `dropPermille:${dropPermille}`,
      `previousSize:${currentSize}`,
      ...(input.changedFields ?? []).map((field) => `changed:${field}`),
    ];
    const event: SupporterBaseChangedEvent = {
      id: this.eventId(
        input.worldSeed,
        `supporter-base:${input.idempotencyKey}`,
        date.value.toString(),
      ),
      type: "SupporterBaseChanged",
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      factId: input.factId,
      previousSize: currentSize,
      newSize,
      dropPermille,
      reason: "REBRAND",
      factors,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      fanbases: this.upsertFanbase(fanbase),
      appliedFactIds: [...this.state.appliedFactIds, input.factId],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(fanbase);
  }

  public makePublicPromise(
    input: Readonly<{
      clubId: NarrativeClubRef;
      metric: string;
      targetValue: number;
      deadline: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NarrativePromiseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.promises.find(
      (promise) => promise.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.metric.trim() === "" || !Number.isFinite(input.targetValue)) {
      return fail(
        new DomainError("INVALID_PROMISE", "Métrica e alvo inválidos."),
      );
    }
    const conflict = this.state.promises.some(
      (promise) =>
        promise.clubId === input.clubId &&
        promise.metric === input.metric.trim() &&
        promise.status === PromiseStatus.ACTIVE,
    );
    if (conflict) {
      return fail(
        new DomainError(
          "PROMISE_CONFLICT",
          "Já existe uma promessa ativa para a métrica.",
          { clubId: input.clubId, metric: input.metric },
        ),
      );
    }
    const deadline = WorldDate.parse(input.deadline);
    if (!deadline.ok) return deadline;
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const promiseId = deterministicUuidV7<"NarrativePromise">({
      worldSeed: input.worldSeed,
      context: `promise:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const promise: NarrativePromiseSnapshot = {
      id: promiseId,
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      metric: input.metric.trim(),
      targetValue: input.targetValue,
      deadline: deadline.value.toString(),
      status: PromiseStatus.ACTIVE,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    const event: PromiseMadeEvent = {
      id: this.eventId(input.worldSeed, `promise-made:${input.idempotencyKey}`, date.value.toString()),
      type: "PromiseMade",
      gameWorldId: this.state.gameWorldId,
      promiseId,
      clubId: input.clubId,
      metric: promise.metric,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      promises: [...this.state.promises, promise],
      events: [...this.state.events, event],
      revision: this.state.revision + 1,
    };
    return succeed(promise);
  }

  public evaluatePromise(
    input: Readonly<{
      promiseId: string;
      achievedValue: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NarrativePromiseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.promises.findIndex(
      ({ id }) => id === input.promiseId,
    );
    if (index < 0) {
      return fail(
        new DomainError("PROMISE_NOT_FOUND", "Promessa não encontrada.", {
          promiseId: input.promiseId,
        }),
      );
    }
    const promise = this.state.promises[index]!;
    if (promise.status !== PromiseStatus.ACTIVE) {
      return succeed(promise);
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const fulfilled = input.achievedValue >= promise.targetValue;
    const settled: NarrativePromiseSnapshot = {
      ...promise,
      status: fulfilled ? PromiseStatus.FULFILLED : PromiseStatus.BROKEN,
      version: promise.version + 1,
    };
    const promises = [...this.state.promises];
    promises[index] = settled;
    const reputationDelta = fulfilled ? 5 : -8;
    const nextScore = clampScore(
      this.reputationFor(promise.clubId) + reputationDelta,
    );
    const settledEvent: PromiseSettledEvent = {
      id: this.eventId(input.worldSeed, `promise-settled:${input.idempotencyKey}`, date.value.toString()),
      type: fulfilled ? "PromiseFulfilled" : "PromiseBroken",
      gameWorldId: this.state.gameWorldId,
      promiseId: promise.id,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const reputationEvent: ReputationChangedEvent = {
      id: this.eventId(input.worldSeed, `reputation:${input.idempotencyKey}`, date.value.toString()),
      type: "ReputationChanged",
      gameWorldId: this.state.gameWorldId,
      clubId: promise.clubId,
      score: nextScore,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    this.state = {
      ...this.state,
      promises,
      reputation: this.upsertReputation(promise.clubId, nextScore),
      events: [...this.state.events, settledEvent, reputationEvent],
      revision: this.state.revision + 1,
    };
    return succeed(settled);
  }

  public openCrisis(
    input: Readonly<{
      clubId: NarrativeClubRef;
      cause: string;
      severity: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NarrativeCrisisSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const existing = this.state.crises.find(
      (crisis) => crisis.idempotencyKey === input.idempotencyKey,
    );
    if (existing !== undefined) return succeed(existing);
    if (input.cause.trim() === "" || !clampable(input.severity)) {
      return fail(new DomainError("INVALID_CRISIS", "Causa/severidade inválidas."));
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const crisisId = deterministicUuidV7<"NarrativeCrisis">({
      worldSeed: input.worldSeed,
      context: `crisis:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const crisis: NarrativeCrisisSnapshot = {
      id: crisisId,
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      cause: input.cause.trim(),
      severity: input.severity,
      status: CrisisStatus.OPEN,
      recoveryPlan: null,
      idempotencyKey: input.idempotencyKey,
      version: 1,
    };
    this.state = {
      ...this.state,
      crises: [...this.state.crises, crisis],
      events: [...this.state.events, this.crisisEvent("NarrativeCrisisOpened", input, crisisId, input.clubId, date.value.toString())],
      revision: this.state.revision + 1,
    };
    return succeed(crisis);
  }

  public submitRecoveryPlan(
    input: Readonly<{
      crisisId: string;
      plan: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NarrativeCrisisSnapshot, DomainError> {
    return this.transitionCrisis(input.crisisId, input, (crisis) => {
      if (crisis.status !== CrisisStatus.OPEN) return "INVALID";
      if (input.plan.trim() === "") return "INVALID";
      return {
        ...crisis,
        status: CrisisStatus.RECOVERY,
        recoveryPlan: input.plan.trim(),
        version: crisis.version + 1,
      };
    });
  }

  public resolveCrisis(
    input: Readonly<{
      crisisId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NarrativeCrisisSnapshot, DomainError> {
    return this.transitionCrisis(
      input.crisisId,
      input,
      (crisis) => {
        if (crisis.status !== CrisisStatus.RECOVERY) return "INVALID";
        return { ...crisis, status: CrisisStatus.RESOLVED, version: crisis.version + 1 };
      },
      "NarrativeCrisisResolved",
    );
  }

  public chooseConversationOption(
    input: Readonly<{
      clubId: NarrativeClubRef;
      context: string;
      options: readonly string[];
      choice: string;
      frame: string;
      factRefs: readonly string[];
      visibility?: string;
      reputationEffect?: number;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<MediaStorySnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const replay = this.findEvent("MediaStoryPublished", input.idempotencyKey);
    if (replay !== undefined) {
      const story = (this.state.mediaStories ?? []).find(
        ({ id }) => id === replay.storyId,
      );
      if (story !== undefined) return succeed(story);
    }
    if (input.context.trim() === "" || input.options.length === 0) {
      return fail(
        new DomainError("INVALID_CONVERSATION", "Contexto e opções obrigatórios."),
      );
    }
    if (!input.options.includes(input.choice)) {
      return fail(
        new DomainError(
          "OPTION_NOT_AVAILABLE",
          "A opção escolhida não está entre as aprovadas.",
          { choice: input.choice },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const conversationId = deterministicUuidV7<"Conversation">({
      worldSeed: input.worldSeed,
      context: `conversation:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const storyId = deterministicUuidV7<"MediaStory">({
      worldSeed: input.worldSeed,
      context: `media-story:${input.idempotencyKey}`,
      timestampMilliseconds: timestampOf(date.value.toString()),
    });
    const reputationEffect = clampEffect(input.reputationEffect ?? 0);
    const conversation: ConversationSnapshot = {
      id: conversationId,
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      context: input.context.trim(),
      options: [...input.options],
      choice: input.choice,
      reputationEffect,
      idempotencyKey: input.idempotencyKey,
    };
    const story: MediaStorySnapshot = {
      id: storyId,
      gameWorldId: this.state.gameWorldId,
      clubId: input.clubId,
      factRefs: [...input.factRefs],
      frame: input.frame,
      status: MediaStoryStatus.PUBLISHED,
      visibility: input.visibility ?? "PUBLIC",
      idempotencyKey: input.idempotencyKey,
    };
    const event: MediaStoryPublishedEvent = {
      id: this.eventId(input.worldSeed, `media-published:${input.idempotencyKey}`, date.value.toString()),
      type: "MediaStoryPublished",
      gameWorldId: this.state.gameWorldId,
      storyId,
      clubId: input.clubId,
      frame: input.frame,
      worldDate: date.value.toString(),
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
    const events: NarrativeDomainEvent[] = [...this.state.events, event];
    let reputation = this.state.reputation;
    if (reputationEffect !== 0) {
      const nextScore = clampScore(
        this.reputationFor(input.clubId) + reputationEffect,
      );
      reputation = this.upsertReputation(input.clubId, nextScore);
      events.push({
        id: this.eventId(input.worldSeed, `reputation-media:${input.idempotencyKey}`, date.value.toString()),
        type: "ReputationChanged",
        gameWorldId: this.state.gameWorldId,
        clubId: input.clubId,
        score: nextScore,
        worldDate: date.value.toString(),
        rulesetVersion: input.rulesetVersion,
        idempotencyKey: input.idempotencyKey,
      });
    }
    this.state = {
      ...this.state,
      conversations: [...(this.state.conversations ?? []), conversation],
      mediaStories: [...(this.state.mediaStories ?? []), story],
      reputation,
      events,
      revision: this.state.revision + 1,
    };
    return succeed(story);
  }

  public cancelPromise(
    input: Readonly<{
      promiseId: string;
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
  ): Result<NarrativePromiseSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.promises.findIndex(
      ({ id }) => id === input.promiseId,
    );
    if (index < 0) {
      return fail(
        new DomainError("PROMISE_NOT_FOUND", "Promessa não encontrada.", {
          promiseId: input.promiseId,
        }),
      );
    }
    const promise = this.state.promises[index]!;
    if (promise.status === PromiseStatus.CANCELLED) return succeed(promise);
    if (promise.status !== PromiseStatus.ACTIVE) {
      return fail(
        new DomainError("PROMISE_TERMINAL", "A promessa já foi encerrada.", {
          promiseId: promise.id,
        }),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    if (date.value.toString() > promise.deadline) {
      return fail(
        new DomainError("PROMISE_EXPIRED", "A promessa venceu; não pode ser cancelada.", {
          promiseId: promise.id,
          deadline: promise.deadline,
        }),
      );
    }
    const cancelled: NarrativePromiseSnapshot = {
      ...promise,
      status: PromiseStatus.CANCELLED,
      version: promise.version + 1,
    };
    const promises = [...this.state.promises];
    promises[index] = cancelled;
    this.state = {
      ...this.state,
      promises,
      revision: this.state.revision + 1,
    };
    return succeed(cancelled);
  }

  public setRivalry(
    input: Readonly<{
      clubA: NarrativeClubRef;
      clubB: NarrativeClubRef;
      intensity: number;
      rulesetVersion: RulesetVersion;
    }>,
  ): Result<RivalrySnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    if (input.clubA === input.clubB || !clampable(input.intensity)) {
      return fail(new DomainError("INVALID_RIVALRY", "Clubes/intensidade inválidos."));
    }
    // par normalizado: rivalidade é simétrica
    const [first, second] =
      input.clubA < input.clubB
        ? [input.clubA, input.clubB]
        : [input.clubB, input.clubA];
    const rivalry: RivalrySnapshot = {
      clubA: first,
      clubB: second,
      intensity: input.intensity,
    };
    const others = (this.state.rivalries ?? []).filter(
      (current) => !(current.clubA === first && current.clubB === second),
    );
    this.state = {
      ...this.state,
      rivalries: [...others, rivalry],
      revision: this.state.revision + 1,
    };
    return succeed(rivalry);
  }

  public fanbaseFor(clubId: string): ClubFanbaseSnapshot {
    return (
      this.state.fanbases.find((fanbase) => fanbase.clubId === clubId) ?? {
        clubId: clubId as NarrativeClubRef,
        segments: INITIAL_SEGMENTS.map((segment) => ({ ...segment })),
        overall: 50,
      }
    );
  }

  public reputationFor(clubId: string): number {
    return (
      this.state.reputation.find((entry) => entry.clubId === clubId)?.score ??
      DEFAULT_REPUTATION
    );
  }

  public summary(): NarrativeSummary {
    return {
      fanbaseCount: this.state.fanbases.length,
      activePromiseCount: this.state.promises.filter(
        ({ status }) => status === PromiseStatus.ACTIVE,
      ).length,
      openCrisisCount: this.state.crises.filter(
        ({ status }) => status !== CrisisStatus.RESOLVED,
      ).length,
      mediaStoryCount: (this.state.mediaStories ?? []).length,
      rivalryCount: (this.state.rivalries ?? []).length,
      eventCount: this.state.events.length,
    };
  }

  private findEvent<T extends NarrativeDomainEvent["type"]>(
    type: T,
    idempotencyKey: string,
  ): Extract<NarrativeDomainEvent, { type: T }> | undefined {
    return this.state.events.find(
      (event): event is Extract<NarrativeDomainEvent, { type: T }> =>
        event.type === type && event.idempotencyKey === idempotencyKey,
    );
  }

  public snapshot(): WorldNarrativeSnapshot {
    return this.state;
  }

  private transitionCrisis(
    crisisId: string,
    input: Readonly<{
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
      worldDate: string;
    }>,
    decide: (crisis: NarrativeCrisisSnapshot) => NarrativeCrisisSnapshot | "INVALID",
    resolvedEvent?: "NarrativeCrisisResolved",
  ): Result<NarrativeCrisisSnapshot, DomainError> {
    if (input.rulesetVersion !== this.state.rulesetVersion) {
      return fail(rulesetMismatch());
    }
    const index = this.state.crises.findIndex(({ id }) => id === crisisId);
    if (index < 0) {
      return fail(
        new DomainError("CRISIS_NOT_OPEN", "Crise não encontrada.", { crisisId }),
      );
    }
    const decision = decide(this.state.crises[index]!);
    if (decision === "INVALID") {
      return fail(
        new DomainError(
          "CRISIS_NOT_OPEN",
          "Transição inválida para o estado atual da crise.",
          { crisisId },
        ),
      );
    }
    const date = WorldDate.parse(input.worldDate);
    if (!date.ok) return date;
    const crises = [...this.state.crises];
    crises[index] = decision;
    const events =
      resolvedEvent !== undefined
        ? [
            ...this.state.events,
            this.crisisEvent(resolvedEvent, input, decision.id, decision.clubId, date.value.toString()),
          ]
        : this.state.events;
    this.state = {
      ...this.state,
      crises,
      events,
      revision: this.state.revision + 1,
    };
    return succeed(decision);
  }

  private crisisEvent(
    type: "NarrativeCrisisOpened" | "NarrativeCrisisResolved",
    input: Readonly<{
      rulesetVersion: RulesetVersion;
      idempotencyKey: string;
      worldSeed: string;
    }>,
    crisisId: NarrativeCrisisSnapshot["id"],
    clubId: NarrativeClubRef,
    worldDate: string,
  ): NarrativeCrisisChangedEvent {
    return {
      id: this.eventId(input.worldSeed, `${type}:${input.idempotencyKey}`, worldDate),
      type,
      gameWorldId: this.state.gameWorldId,
      crisisId,
      clubId,
      worldDate,
      rulesetVersion: input.rulesetVersion,
      idempotencyKey: input.idempotencyKey,
    };
  }

  private upsertFanbase(fanbase: ClubFanbaseSnapshot): ClubFanbaseSnapshot[] {
    const others = this.state.fanbases.filter(
      (current) => current.clubId !== fanbase.clubId,
    );
    return [...others, fanbase];
  }

  private upsertReputation(clubId: NarrativeClubRef, score: number) {
    const others = this.state.reputation.filter(
      (entry) => entry.clubId !== clubId,
    );
    return [...others, { clubId, score }];
  }

  private eventId(
    worldSeed: string,
    context: string,
    worldDate: string,
  ): NarrativeDomainEvent["id"] {
    return deterministicUuidV7<"NarrativeEvent">({
      worldSeed,
      context,
      timestampMilliseconds: timestampOf(worldDate),
    });
  }
}

function outcomeDelta(outcome: string, expected: string): number {
  const table: Record<string, number> = {
    "WIN|WIN": 2,
    "WIN|DRAW": 5,
    "WIN|LOSS": 8,
    "DRAW|WIN": -3,
    "DRAW|DRAW": 1,
    "DRAW|LOSS": 4,
    "LOSS|WIN": -8,
    "LOSS|DRAW": -5,
    "LOSS|LOSS": -2,
  };
  return table[`${outcome}|${expected}`] ?? 0;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clampEffect(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-10, Math.min(10, Math.round(value)));
}

function clampable(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 100;
}

function invalidNarrative(message: string): DomainError {
  return new DomainError("INVALID_NARRATIVE_STATE", message);
}

function rulesetMismatch(): DomainError {
  return new DomainError(
    "RULESET_VERSION_MISMATCH",
    "O command usa um ruleset diferente da narrativa.",
  );
}

