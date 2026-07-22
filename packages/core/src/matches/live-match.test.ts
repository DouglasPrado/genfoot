import { describe, expect, it } from "vitest";

import { LiveMatch, type LiveMatchSnapshot } from "./live-match.js";

const MANIFEST = {
  seed: "mundo-seed",
  engineBuild: "c5-v1",
  timestepChances: 12,
  homeStrength: 62,
  awayStrength: 58,
  inputHash: "abc",
};

const base = (over: Partial<LiveMatchSnapshot> = {}): LiveMatchSnapshot => ({
  id: "019f782e-4198-77f8-baa0-6d54bcfa9c31",
  gameWorldId: "019f782c-3033-71fc-86d7-2820a7206070",
  homeClubId: "casa",
  awayClubId: "fora",
  status: "SCHEDULED",
  manifest: MANIFEST,
  currentTick: 0,
  rngCursor: 0,
  nextSequence: 1,
  homeGoals: 0,
  awayGoals: 0,
  homeShots: 0,
  awayShots: 0,
  commandLog: [],
  version: 1,
  ...over,
});

describe("LiveMatch.start", () => {
  it("uma partida agendada começa no minuto zero, sem gol", () => {
    const result = LiveMatch.fromSnapshot(base()).start();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("IN_PROGRESS");
    expect(result.value.currentTick).toBe(0);
  });

  it("começar duas vezes é idempotente, não erro", () => {
    const started = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }));
    const again = started.start();
    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.value.currentTick).toBe(0);
  });

  it("partida encerrada não recomeça", () => {
    const result = LiveMatch.fromSnapshot(base({ status: "FINISHED" })).start();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MATCH_ALREADY_FINISHED");
  });
});

describe("LiveMatch.advanceTo", () => {
  it("avança o relógio e o placar acompanha o kernel", () => {
    const match = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }));
    const result = match.advanceTo(6);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentTick).toBe(6);
    expect(result.value.homeGoals + result.value.awayGoals).toBeGreaterThanOrEqual(0);
  });

  /**
   * A garantia central do C5-V2: avançar de 6 em 6 tem de dar exatamente o
   * mesmo estado que avançar 12 de uma vez. Sem isso, "online ≡ offline" é só
   * promessa — quem acompanha e quem não acompanha veriam jogos diferentes.
   */
  it("avançar em pedaços dá o MESMO resultado que avançar de uma vez", () => {
    const inteiro = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }))
      .advanceTo(12);
    let picado = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }));
    for (const tick of [3, 7, 12]) {
      const step = picado.advanceTo(tick);
      expect(step.ok).toBe(true);
      if (!step.ok) return;
      picado = LiveMatch.fromSnapshot(step.value);
    }
    expect(inteiro.ok).toBe(true);
    if (!inteiro.ok) return;
    expect(picado.snapshot().homeGoals).toBe(inteiro.value.homeGoals);
    expect(picado.snapshot().awayGoals).toBe(inteiro.value.awayGoals);
  });

  it("não anda para trás: pedir um tick já passado não desfaz o jogo", () => {
    const match = LiveMatch.fromSnapshot(
      base({ status: "IN_PROGRESS", currentTick: 8 }),
    );
    const result = match.advanceTo(3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentTick).toBe(8);
  });

  it("passar do fim regulamentar para no fim", () => {
    const result = LiveMatch.fromSnapshot(
      base({ status: "IN_PROGRESS" }),
    ).advanceTo(999);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentTick).toBe(MANIFEST.timestepChances);
  });

  it("partida que não começou não avança", () => {
    const result = LiveMatch.fromSnapshot(base()).advanceTo(4);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MATCH_NOT_IN_PROGRESS");
  });
});

describe("LiveMatch.submitCoachCommand", () => {
  it("aceita a ação do técnico e a registra no log com sequência", () => {
    const match = LiveMatch.fromSnapshot(
      base({ status: "IN_PROGRESS", currentTick: 4 }),
    );
    const result = match.submitCoachCommand({
      side: "HOME",
      delta: 6,
      actor: "conta-do-usuario",
      commandType: "match:attack",
      idempotencyKey: "acao-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.commandLog).toHaveLength(1);
    const entry = result.value.commandLog[0]!;
    expect(entry.matchSequence).toBe(1);
    // A ação vale a partir do tick CORRENTE: não se muda o passado.
    expect(entry.tick).toBe(4);
    expect(result.value.nextSequence).toBe(2);
  });

  it("a mesma chave de idempotência não registra a ação duas vezes", () => {
    const first = LiveMatch.fromSnapshot(
      base({ status: "IN_PROGRESS" }),
    ).submitCoachCommand({
      side: "HOME",
      delta: 6,
      actor: "u",
      commandType: "match:attack",
      idempotencyKey: "mesma",
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const second = LiveMatch.fromSnapshot(first.value).submitCoachCommand({
      side: "HOME",
      delta: 6,
      actor: "u",
      commandType: "match:attack",
      idempotencyKey: "mesma",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.commandLog).toHaveLength(1);
  });

  it("a ação MUDA o jogo daqui para a frente", () => {
    // Mesma partida, mesma semente: a única diferença é a ordem do técnico.
    const semAcao = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }))
      .advanceTo(12);
    const comAcao = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }))
      .submitCoachCommand({
        side: "HOME",
        delta: 40,
        actor: "u",
        commandType: "match:attack",
        idempotencyKey: "k",
      });
    expect(semAcao.ok && comAcao.ok).toBe(true);
    if (!semAcao.ok || !comAcao.ok) return;
    const depois = LiveMatch.fromSnapshot(comAcao.value).advanceTo(12);
    expect(depois.ok).toBe(true);
    if (!depois.ok) return;
    // Com um empurrão grande no ataque, a casa não pode terminar com MENOS
    // gols do que sem ordem nenhuma.
    expect(depois.value.homeGoals).toBeGreaterThanOrEqual(semAcao.value.homeGoals);
  });

  it("partida encerrada não aceita mais ordem", () => {
    const result = LiveMatch.fromSnapshot(
      base({ status: "FINISHED" }),
    ).submitCoachCommand({
      side: "HOME",
      delta: 6,
      actor: "u",
      commandType: "match:attack",
      idempotencyKey: "k",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MATCH_NOT_IN_PROGRESS");
  });

  it("delta fora da faixa é recusado — ação não é bônus livre", () => {
    const result = LiveMatch.fromSnapshot(
      base({ status: "IN_PROGRESS" }),
    ).submitCoachCommand({
      side: "HOME",
      delta: 999,
      actor: "u",
      commandType: "match:attack",
      idempotencyKey: "k",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MATCH_COMMAND_DELTA_OUT_OF_RANGE");
  });
});

describe("LiveMatch.finish", () => {
  it("só encerra depois do apito — antes do fim, recusa", () => {
    const result = LiveMatch.fromSnapshot(
      base({ status: "IN_PROGRESS", currentTick: 5 }),
    ).finish();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("MATCH_STILL_RUNNING");
  });

  it("encerra no fim regulamentar e fixa o placar", () => {
    const running = LiveMatch.fromSnapshot(base({ status: "IN_PROGRESS" }))
      .advanceTo(12);
    expect(running.ok).toBe(true);
    if (!running.ok) return;
    const finished = LiveMatch.fromSnapshot(running.value).finish();
    expect(finished.ok).toBe(true);
    if (!finished.ok) return;
    expect(finished.value.status).toBe("FINISHED");
    expect(finished.value.homeGoals).toBe(running.value.homeGoals);
  });
});
