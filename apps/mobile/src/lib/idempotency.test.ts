import { describe, expect, it } from "vitest";

import {
  commandIdempotencyKey,
  onDay,
  onEntity,
  onRevision,
} from "./idempotency.js";

describe("commandIdempotencyKey — a ocasião é obrigatória", () => {
  /**
   * Esta suíte existe por causa de QUATRO bugs da mesma classe, todos
   * confirmados contra a API real e todos invisíveis para lint/typecheck/testes:
   * conversa que só funcionava uma vez, treino que só podia ser feito uma vez
   * por jogador na vida, colisão de sessão vazando stack do Prisma, e a segunda
   * edição do plano sumindo em silêncio.
   *
   * A causa foi sempre a mesma: chave montada à mão, sem escopo de ocasião.
   * Como o servidor deduplica pela chave, chave sem escopo = funcionalidade de
   * uso único, e o sintoma é ALREADY_APPLIED — que não é erro, então nada
   * reclama.
   */
  it("mesma ocasião → mesma chave (retentar não multiplica o efeito)", () => {
    const a = commandIdempotencyKey({
      commandType: "morale:talk-to-player",
      target: "p1",
      occasion: onDay("2026-01-09"),
    });
    const b = commandIdempotencyKey({
      commandType: "morale:talk-to-player",
      target: "p1",
      occasion: onDay("2026-01-09"),
    });
    expect(a).toBe(b);
  });

  it("ocasião diferente → chave diferente (amanhã vale de novo)", () => {
    const hoje = commandIdempotencyKey({
      commandType: "morale:talk-to-player",
      target: "p1",
      occasion: onDay("2026-01-09"),
    });
    const amanha = commandIdempotencyKey({
      commandType: "morale:talk-to-player",
      target: "p1",
      occasion: onDay("2026-01-10"),
    });
    expect(hoje).not.toBe(amanha);
  });

  it("alvos e commands diferentes não colidem na mesma ocasião", () => {
    const occasion = onDay("2026-01-09");
    const keys = new Set([
      commandIdempotencyKey({ commandType: "a", target: "p1", occasion }),
      commandIdempotencyKey({ commandType: "a", target: "p2", occasion }),
      commandIdempotencyKey({ commandType: "b", target: "p1", occasion }),
    ]);
    expect(keys.size).toBe(3);
  });

  it("RECUSA ocasião vazia — era exatamente assim que a chave virava eterna", () => {
    expect(() =>
      commandIdempotencyKey({
        commandType: "x",
        target: "p1",
        occasion: "",
      }),
    ).toThrow(/ocasião/i);
  });

  it("RECUSA data de mundo vazia em vez de gerar chave permanente", () => {
    expect(() => onDay("")).toThrow();
    expect(() => onDay("   ")).toThrow();
  });

  it("onEntity escopa pela entidade — a sessão é a ocasião exata", () => {
    expect(onEntity("sessao-1")).not.toBe(onEntity("sessao-2"));
    expect(() => onEntity("")).toThrow();
  });

  it("onRevision inclui o CONTEÚDO, não só a versão", () => {
    // O bug do plano: duas edições diferentes na mesma versão colidiam, e a
    // segunda era descartada em silêncio.
    const edicaoA = onRevision(3, "MENTAL", 30);
    const edicaoB = onRevision(3, "PHYSICAL", 90);
    expect(edicaoA).not.toBe(edicaoB);
    // Mas retentar a MESMA edição continua deduplicando.
    expect(onRevision(3, "MENTAL", 30)).toBe(edicaoA);
  });

  it("onRevision aceita a versão 0 (ainda não existe o agregado)", () => {
    expect(() => onRevision(0, "MENTAL", 30)).not.toThrow();
  });
});
