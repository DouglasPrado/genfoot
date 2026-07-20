import { describe, expect, it } from "vitest";

import {
  STANCE_OPTIONS,
  buildTalkToPlayerPayload,
  buildTalkToSquadPayload,
  talkIdempotencyKey,
} from "./talk-model.js";

describe("talk-model (R-221 2c mobile)", () => {
  it("oferece elogiar (up) e criticar (down)", () => {
    expect(STANCE_OPTIONS.map((o) => o.stance)).toEqual(["PRAISE", "CRITICIZE"]);
    expect(STANCE_OPTIONS[0].tone).toBe("up");
    expect(STANCE_OPTIONS[1].tone).toBe("down");
  });

  it("monta o payload de talk-to-player", () => {
    expect(buildTalkToPlayerPayload({ clubId: "c", playerId: "p", stance: "PRAISE" }))
      .toEqual({ clubId: "c", playerId: "p", stance: "PRAISE" });
  });

  it("monta o payload de talk-to-squad (sem playerId)", () => {
    expect(buildTalkToSquadPayload({ clubId: "c", stance: "CRITICIZE" }))
      .toEqual({ clubId: "c", stance: "CRITICIZE" });
  });

  /**
   * A chave é escopada ao DIA LÓGICO do mundo.
   *
   * Antes era estável por (command, alvo, postura) e só. Provado contra a API
   * real: o segundo elogio ao mesmo jogador voltava `ALREADY_APPLIED` e a forma
   * NÃO se movia (5 → 8 → 8). Ou seja, o treinador podia elogiar cada jogador
   * exatamente UMA VEZ, para sempre — o botão morria no primeiro toque.
   *
   * Chave eterna não é idempotência, é uso único. Idempotência é "repetir a
   * MESMA conversa não multiplica o efeito"; conversar de novo amanhã é uma
   * conversa nova, e tem que valer.
   */
  it("repetir no MESMO dia do mundo dedupe — um efeito por conversa", () => {
    const args = {
      commandType: "morale:talk-to-player",
      targetId: "p",
      stance: "PRAISE",
      worldDate: "2026-01-09",
    } as const;
    expect(talkIdempotencyKey(args)).toBe(talkIdempotencyKey(args));
    expect(talkIdempotencyKey(args)).toBe(
      "morale:talk-to-player:p:PRAISE:2026-01-09",
    );
  });

  it("no dia SEGUINTE a conversa vale de novo — não é botão de uso único", () => {
    const hoje = talkIdempotencyKey({
      commandType: "morale:talk-to-player",
      targetId: "p",
      stance: "PRAISE",
      worldDate: "2026-01-09",
    });
    const amanha = talkIdempotencyKey({
      commandType: "morale:talk-to-player",
      targetId: "p",
      stance: "PRAISE",
      worldDate: "2026-01-10",
    });
    expect(hoje).not.toBe(amanha);
  });

  it("posturas e alvos diferentes não colidem no mesmo dia", () => {
    const base = {
      commandType: "morale:talk-to-player",
      worldDate: "2026-01-09",
    } as const;
    const elogio = talkIdempotencyKey({ ...base, targetId: "p", stance: "PRAISE" });
    const critica = talkIdempotencyKey({ ...base, targetId: "p", stance: "CRITICIZE" });
    const outro = talkIdempotencyKey({ ...base, targetId: "q", stance: "PRAISE" });
    expect(new Set([elogio, critica, outro]).size).toBe(3);
  });

  it("sem data do mundo a chave NÃO vira eterna — recusa em vez de deduplicar para sempre", () => {
    // Data ausente é falha de leitura, não licença para gravar chave permanente.
    expect(() =>
      talkIdempotencyKey({
        commandType: "morale:talk-to-player",
        targetId: "p",
        stance: "PRAISE",
        worldDate: "",
      }),
    ).toThrow();
  });
});
