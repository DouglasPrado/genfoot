import {
  newGameWorldId,
  parseRulesetVersion,
  WorldDate,
} from "@grinta/shared";
import { describe, expect, it } from "vitest";

import {
  GameWorld,
  WorldMarket,
  type GameWorldSnapshot,
  type MarketClubRef,
  type MarketPersonRef,
  type MarketPlayerRef,
} from "../../src/index.js";

// GP-010 · Player loan — convergência C6: o jogador é emprestado (vínculo LOAN no
// destino durante a janela) e retorna exatamente uma vez ao clube de origem. Em
// todo momento há um único vínculo ativo. (A propriedade suspensa da origem é
// simplificada em nível de convergência.)

const PLAYER = "019f0000-0000-7000-8000-0000000000p1" as MarketPlayerRef;
const PERSON = "019f0000-0000-7000-8000-0000000000e1" as MarketPersonRef;
const ORIGIN = "019f0000-0000-7000-8000-0000000000o1" as MarketClubRef;
const DEST = "019f0000-0000-7000-8000-0000000000d1" as MarketClubRef;

function world(): GameWorldSnapshot {
  const ruleset = parseRulesetVersion("1.0.0");
  if (!ruleset.ok) throw ruleset.error;
  const startDate = WorldDate.parse("2026-01-01");
  if (!startDate.ok) throw startDate.error;
  const created = GameWorld.create({
    id: newGameWorldId(),
    seed: "gp-010",
    startDate: startDate.value,
    rulesetVersion: ruleset.value,
  });
  if (!created.ok) throw created.error;
  return created.value.snapshot();
}

describe("GP-010 Player loan (convergence)", () => {
  it("empresta e retorna exatamente uma vez com um único vínculo ativo", () => {
    const gameWorld = world();
    const ruleset = gameWorld.rulesetVersion;
    const marketR = WorldMarket.initialize(gameWorld);
    if (!marketR.ok) throw marketR.error;
    const market = marketR.value;

    // Origem detém o jogador.
    const originContract = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: ORIGIN,
      feeMinor: 0,
      wageMinor: 30,
      startsOn: "2025-07-01",
      endsOn: "2028-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:origin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-05",
    });
    if (!originContract.ok) throw originContract.error;

    // Empresta: a janela de origem se encerra e o destino ativa um vínculo LOAN.
    const originPaused = market.terminateContract({
      contractId: originContract.value.id,
      endedOn: "2026-01-31",
      rulesetVersion: ruleset,
      idempotencyKey: "pause:origin",
      worldSeed: gameWorld.seed,
      worldDate: "2026-01-31",
    });
    if (!originPaused.ok) throw originPaused.error;
    const loan = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: DEST,
      feeMinor: 0,
      wageMinor: 30,
      startsOn: "2026-02-01",
      endsOn: "2026-06-30",
      kind: "LOAN",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:loan",
      worldSeed: gameWorld.seed,
      worldDate: "2026-02-01",
    });
    expect(loan).toMatchObject({ ok: true, value: { kind: "LOAN", status: "ACTIVE" } });
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(DEST);
    if (!loan.ok) throw loan.error;

    // Retorna: o vínculo LOAN encerra exatamente uma vez.
    const returned = market.terminateContract({
      contractId: loan.value.id,
      endedOn: "2026-06-30",
      rulesetVersion: ruleset,
      idempotencyKey: "return:loan",
      worldSeed: gameWorld.seed,
      worldDate: "2026-06-30",
    });
    expect(returned).toMatchObject({ ok: true, value: { status: "TERMINATED" } });
    const revision = market.snapshot().revision;
    const returnAgain = market.terminateContract({
      contractId: loan.value.id,
      endedOn: "2026-07-01",
      rulesetVersion: ruleset,
      idempotencyKey: "return:again",
      worldSeed: gameWorld.seed,
      worldDate: "2026-07-01",
    });
    expect(returnAgain).toMatchObject({ ok: true, value: { status: "TERMINATED" } });
    expect(market.snapshot().revision).toBe(revision); // idempotente: retorno único

    // Reativa o vínculo de origem após o retorno (único ativo).
    const restored = market.activateContract({
      personId: PERSON,
      playerId: PLAYER,
      clubId: ORIGIN,
      feeMinor: 0,
      wageMinor: 30,
      startsOn: "2026-07-01",
      endsOn: "2028-06-30",
      kind: "PERMANENT",
      rulesetVersion: ruleset,
      idempotencyKey: "contract:restore",
      worldSeed: gameWorld.seed,
      worldDate: "2026-07-01",
    });
    expect(restored).toMatchObject({ ok: true, value: { status: "ACTIVE" } });
    expect(market.activeLinkFor(PLAYER)!.clubId).toBe(ORIGIN);
    expect(market.summary().activeLinkCount).toBe(1);
  });
});
