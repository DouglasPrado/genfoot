import {
  DomainError,
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
  type GameWorldId,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  ExecuteDecisionProposal,
  GameWorld,
  WorldAutomation,
  type AutomationControllerRef,
  type AutomationRepository,
  type DecisionOption,
  type GameWorldSnapshot,
  type WorldAutomationSnapshot,
} from "../../src/index.js";

class MemoryAutomationRepository implements AutomationRepository {
  public snapshot: WorldAutomationSnapshot | null = null;

  public findAutomationByWorldId(
    gameWorldId: GameWorldId,
  ): Promise<WorldAutomationSnapshot | null> {
    return Promise.resolve(
      this.snapshot?.gameWorldId === gameWorldId
        ? structuredClone(this.snapshot)
        : null,
    );
  }

  public saveAutomation(
    snapshot: WorldAutomationSnapshot,
    expectedRevision: number | null,
  ): Promise<void> {
    if (
      (expectedRevision === null && this.snapshot !== null) ||
      (expectedRevision !== null &&
        this.snapshot?.revision !== expectedRevision)
    ) {
      throw new DomainError("AUTOMATION_REVISION_CONFLICT", "Conflito.");
    }
    this.snapshot = structuredClone(snapshot);
    return Promise.resolve();
  }
}

const CONTROLLER = "019f0000-0000-7000-8000-0000000000c7" as AutomationControllerRef;
const OPTIONS: DecisionOption[] = [
  { commandDraft: "SIGN_A", score: 50 },
  { commandDraft: "SIGN_B", score: 80 },
  { commandDraft: "SIGN_C", score: 80 },
];

function date(value: string): WorldDate {
  const parsed = WorldDate.parse(value);
  if (!parsed.ok) throw parsed.error;
  return parsed.value;
}

function world(seed = "automation-001"): GameWorldSnapshot {
  const rulesetVersion = parseRulesetVersion("1.0.0");
  if (!rulesetVersion.ok) throw rulesetVersion.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed,
    startDate: date("2026-01-01"),
    rulesetVersion: rulesetVersion.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

function activeRule(seed = "automation-001") {
  const gameWorld = world(seed);
  const created = WorldAutomation.initialize(gameWorld);
  if (!created.ok) throw created.error;
  const value = created.value;
  const rule = value.createAutomationRule({
    controllerId: CONTROLLER,
    scope: "SQUAD",
    trigger: "MATCHDAY",
    action: "SET_LINEUP",
    risk: 20,
    priority: 1,
    validFrom: "2026-01-01",
    validUntil: "2026-12-31",
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "rule:1",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-01",
  });
  if (!rule.ok) throw rule.error;
  const activated = value.activateAutomationRule({
    ruleId: rule.value.id,
    rulesetVersion: gameWorld.rulesetVersion,
    idempotencyKey: "activate:1",
    worldSeed: gameWorld.seed,
    worldDate: "2026-01-02",
  });
  if (!activated.ok) throw activated.error;
  return { gameWorld, value, ruleId: rule.value.id };
}

function evaluate(
  ctx: ReturnType<typeof activeRule>,
  key = "decision:1",
) {
  return ctx.value.evaluateDecision({
    ruleId: ctx.ruleId,
    asOf: "2026-03-01",
    seedStream: "strategic:1",
    options: OPTIONS,
    factors: ["forma", "fadiga"],
    rulesetVersion: ctx.gameWorld.rulesetVersion,
    idempotencyKey: key,
    worldSeed: ctx.gameWorld.seed,
    worldDate: "2026-03-01",
  });
}

describe("Automation and decision AI", () => {
  it("gerencia o ciclo da regra e bloqueia decisão sem regra ativa", () => {
    const gameWorld = world();
    const created = WorldAutomation.initialize(gameWorld);
    if (!created.ok) throw created.error;
    const value = created.value;
    const rule = value.createAutomationRule({
      controllerId: CONTROLLER,
      scope: "SQUAD",
      trigger: "MATCHDAY",
      action: "SET_LINEUP",
      risk: 20,
      priority: 1,
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "rule:x",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!rule.ok) throw rule.error;
    expect(rule.value.status).toBe("DRAFT");

    expect(
      value.evaluateDecision({
        ruleId: rule.value.id,
        asOf: "2026-03-01",
        seedStream: "s",
        options: OPTIONS,
        factors: [],
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "d:x",
        worldSeed: gameWorld.seed,
        worldDate: "2026-03-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "RULE_NOT_ACTIVE" } });

    const activate = value.activateAutomationRule({
      ruleId: rule.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "act:x",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    expect(activate).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(
      value.snapshot().events.some((e) => e.type === "AutomationRuleActivated"),
    ).toBe(true);

    value.suspendAutomationRule({
      ruleId: rule.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "sus:x",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-03",
    });
    const revoke = value.revokeAutomationRule({
      ruleId: rule.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "rev:x",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-04",
    });
    expect(revoke).toMatchObject({ ok: true, value: { status: "REVOKED" } });
    expect(
      value.activateAutomationRule({
        ruleId: rule.value.id,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "act:again",
        worldSeed: gameWorld.seed,
        worldDate: "2026-01-05",
      }),
    ).toMatchObject({ ok: false, error: { code: "RULE_TRANSITION_INVALID" } });
  });

  it("escolhe a decisão de forma determinística e explicável", () => {
    const first = activeRule("determinismo");
    const firstDecision = evaluate(first);
    const second = activeRule("determinismo");
    const secondDecision = evaluate(second);
    if (!firstDecision.ok || !secondDecision.ok) throw new Error("falhou");

    expect(firstDecision.value.chosenScore).toBe(80);
    expect(["SIGN_B", "SIGN_C"]).toContain(firstDecision.value.chosenCommand);
    expect(firstDecision.value.chosenCommand).toBe(
      secondDecision.value.chosenCommand,
    );
    expect(firstDecision.value.id).toBe(secondDecision.value.id);
    expect(firstDecision.value.alternatives).toHaveLength(2);
    expect(firstDecision.value.factors).toEqual(["forma", "fadiga"]);
  });

  it("recusa decisão sem opções válidas", () => {
    const ctx = activeRule();
    expect(
      ctx.value.evaluateDecision({
        ruleId: ctx.ruleId,
        asOf: "2026-03-01",
        seedStream: "s",
        options: [],
        factors: [],
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "d:empty",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-03-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "NO_VALID_OPTION" } });
  });

  it("executa a proposta uma única vez por decisão", () => {
    const ctx = activeRule();
    const decision = evaluate(ctx);
    if (!decision.ok) throw decision.error;

    const submitted = ctx.value.executeDecisionProposal({
      decisionId: decision.value.id,
      accept: true,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "exec:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(submitted).toMatchObject({ ok: true, value: { status: "SUBMITTED" } });
    const revision = ctx.value.snapshot().revision;

    const repeated = ctx.value.executeDecisionProposal({
      decisionId: decision.value.id,
      accept: false,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "exec:1:dup",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(repeated).toEqual(submitted);
    expect(ctx.value.snapshot().revision).toBe(revision);
  });

  it("desativa regras do controlador na troca de controle de forma idempotente", () => {
    const ctx = activeRule();
    const first = ctx.value.disableOnControlChange({
      controllerId: CONTROLLER,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "control:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(first).toEqual({ ok: true, value: 1 });
    expect(ctx.value.findRule(ctx.ruleId)!.status).toBe("SUSPENDED");
    const revision = ctx.value.snapshot().revision;

    const repeated = ctx.value.disableOnControlChange({
      controllerId: CONTROLLER,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "control:1",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-04-01",
    });
    expect(repeated).toEqual({ ok: true, value: 1 });
    expect(ctx.value.snapshot().revision).toBe(revision);
  });

  it("executa proposta idempotente via caso de uso", async () => {
    const ctx = activeRule();
    const decision = evaluate(ctx);
    if (!decision.ok) throw decision.error;
    const repository = new MemoryAutomationRepository();
    repository.snapshot = ctx.value.snapshot();
    const useCase = new ExecuteDecisionProposal(repository);
    const input = {
      decisionId: decision.value.id,
      accept: true,
      rulesetVersion: ctx.gameWorld.rulesetVersion,
      idempotencyKey: "exec:uc",
      worldSeed: ctx.gameWorld.seed,
      worldDate: "2026-03-02",
    };
    const firstRun = await useCase.execute(ctx.gameWorld.id, input);
    const revision = repository.snapshot.revision;
    const repeated = await useCase.execute(ctx.gameWorld.id, {
      ...input,
      idempotencyKey: "exec:uc:dup",
    });

    expect(firstRun).toMatchObject({ ok: true, value: { status: "SUBMITTED" } });
    expect(repeated).toEqual(firstRun);
    expect(repository.snapshot.revision).toBe(revision);
  });

  it("recua sob precedência humana e bloqueia conhecimento oculto", () => {
    const ctx = activeRule("precedencia");
    // precedência humana: decisão humana recente conflitante bloqueia a automação
    expect(
      ctx.value.evaluateDecision({
        ruleId: ctx.ruleId,
        asOf: "2026-03-01",
        seedStream: "s",
        options: OPTIONS,
        factors: ["forma"],
        humanPrecedenceActive: true,
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "d:human",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-03-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "HUMAN_PRECEDENCE" } });
    // filtro de conhecimento: um fator oculto não autorizado é recusado
    expect(
      ctx.value.evaluateDecision({
        ruleId: ctx.ruleId,
        asOf: "2026-03-01",
        seedStream: "s",
        options: OPTIONS,
        factors: ["HIDDEN:potencial-oculto"],
        rulesetVersion: ctx.gameWorld.rulesetVersion,
        idempotencyKey: "d:hidden",
        worldSeed: ctx.gameWorld.seed,
        worldDate: "2026-03-01",
      }),
    ).toMatchObject({ ok: false, error: { code: "KNOWLEDGE_FORBIDDEN" } });
  });

  it("auto-executa só baixo risco; alto risco vira proposta pendente + explicação", () => {
    const gameWorld = world("risco");
    const created = WorldAutomation.initialize(gameWorld);
    if (!created.ok) throw created.error;
    const value = created.value;
    const rule = value.createAutomationRule({
      controllerId: CONTROLLER,
      scope: "STRATEGIC",
      trigger: "TRANSFER_WINDOW",
      action: "BUY_STAR",
      risk: 85,
      priority: 1,
      validFrom: "2026-01-01",
      validUntil: "2026-12-31",
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "rule:risk",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-01",
    });
    if (!rule.ok) throw rule.error;
    value.activateAutomationRule({
      ruleId: rule.value.id,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "act:risk",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-02",
    });
    const decision = value.evaluateDecision({
      ruleId: rule.value.id,
      asOf: "2026-03-01",
      seedStream: "strategic",
      options: OPTIONS,
      factors: ["orçamento", "HIDDEN:info-privada"],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "d:risk",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-01",
    });
    // o fator oculto barra a decisão de alto risco
    expect(decision).toMatchObject({ ok: false, error: { code: "KNOWLEDGE_FORBIDDEN" } });

    // agora sem conhecimento oculto: a decisão é proposta
    const ok = value.evaluateDecision({
      ruleId: rule.value.id,
      asOf: "2026-03-01",
      seedStream: "strategic",
      options: OPTIONS,
      factors: ["orçamento"],
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "d:risk2",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-01",
    });
    if (!ok.ok) throw ok.error;

    // auto-execução de alto risco é bloqueada → permanece pendente
    expect(
      value.executeDecisionProposal({
        decisionId: ok.value.id,
        accept: true,
        auto: true,
        rulesetVersion: gameWorld.rulesetVersion,
        idempotencyKey: "exec:auto",
        worldSeed: gameWorld.seed,
        worldDate: "2026-03-02",
      }),
    ).toMatchObject({ ok: false, error: { code: "HIGH_RISK_REQUIRES_APPROVAL" } });

    // com aprovação humana (auto=false) a proposta é submetida
    const human = value.executeDecisionProposal({
      decisionId: ok.value.id,
      accept: true,
      rulesetVersion: gameWorld.rulesetVersion,
      idempotencyKey: "exec:human",
      worldSeed: gameWorld.seed,
      worldDate: "2026-03-02",
    });
    expect(human).toMatchObject({ ok: true, value: { status: "SUBMITTED" } });

    // GetDecisionExplanation não revela conhecimento oculto
    const explanation = value.explainDecision(ok.value.id);
    expect(explanation!.factors).toEqual(["orçamento"]);
    expect(explanation!.chosenCommand).toBe(ok.value.chosenCommand);
  });
});
