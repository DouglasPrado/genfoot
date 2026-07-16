import { describe, expect, it } from "vitest";

import { ParticipationStatus } from "../../src/identity/identity-types.js";
import { WorldParticipant } from "../../src/identity/world-participant.js";

const base: {
  gameWorldId: string;
  accountId: string;
  worldSeed: string;
  occurredOn: string;
} = {
  gameWorldId: "019b76da-a800-7787-9462-49c009be1111",
  accountId: "019b76da-a800-7787-9462-49c009be2222",
  worldSeed: "grinta-demo",
  occurredOn: "2026-01-02",
};

function join(over: Partial<typeof base> = {}) {
  const result = WorldParticipant.join({ ...base, ...over });
  if (!result.ok) throw new Error(`esperava sucesso: ${result.error.code}`);
  return result.value;
}

describe("WorldParticipant.join", () => {
  it("entra ativo, na data do mundo, sem saída", () => {
    const snapshot = join().snapshot();
    expect(snapshot.status).toBe(ParticipationStatus.ACTIVE);
    expect(snapshot.joinedOn).toBe("2026-01-02");
    expect(snapshot.leftOn).toBeNull();
    expect(snapshot.version).toBe(1);
  });

  /**
   * O motivo desta task existir. `WorldParticipationSnapshot` não tinha `id` —
   * identificava por `(accountId, gameWorldId)` —, e `ClubControl.worldParticipantId`
   * (schema.prisma:895) é NOT NULL. Sem id aqui, aquela FK é impossível de
   * produzir a partir do domínio.
   */
  it("tem id — sem ele o ClubControl não tem para onde apontar", () => {
    expect(join().snapshot().id).toMatch(/^[0-9a-f-]{36}$/);
  });

  // Determinismo (R-182): sem Date.now()/Math.random(), reprocessar o mesmo
  // ingresso produz o mesmo id.
  it("o id é determinístico", () => {
    expect(join().snapshot().id).toBe(join().snapshot().id);
  });

  it("contas diferentes no mesmo mundo têm ids diferentes", () => {
    expect(join().snapshot().id).not.toBe(
      join({ accountId: "019b76da-a800-7787-9462-49c009be9999" }).snapshot().id,
    );
  });

  // Isolamento por mundo: a mesma conta em dois mundos são duas participações.
  it("a mesma conta em mundos diferentes tem ids diferentes", () => {
    expect(join().snapshot().id).not.toBe(
      join({ gameWorldId: "019b76da-a800-7787-9462-49c009be8888" }).snapshot().id,
    );
  });

  it("recusa data do mundo inválida", () => {
    expect(WorldParticipant.join({ ...base, occurredOn: "02/01/2026" }).ok).toBe(
      false,
    );
  });
});

describe("WorldParticipant.leave", () => {
  it("encerra a participação e registra QUANDO", () => {
    const participant = join();
    const result = participant.leave("2026-03-10");
    expect(result.ok).toBe(true);
    expect(participant.snapshot().status).toBe(ParticipationStatus.ENDED);
    expect(participant.snapshot().leftOn).toBe("2026-03-10");
    expect(participant.snapshot().version).toBe(2);
  });

  it("sair de novo é idempotente — não incha a versão", () => {
    const participant = join();
    participant.leave("2026-03-10");
    participant.leave("2026-04-10");
    expect(participant.snapshot().version).toBe(2);
    expect(participant.snapshot().leftOn).toBe("2026-03-10");
  });

  // Tempo não anda para trás. Sem isto, um comando reprocessado com data velha
  // registraria uma saída anterior ao ingresso.
  it("recusa sair antes de ter entrado", () => {
    const result = join().leave("2026-01-01");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PARTICIPACAO_INVALIDA");
  });

  it("aceita sair no mesmo dia em que entrou", () => {
    expect(join().leave("2026-01-02").ok).toBe(true);
  });
});

/**
 * O schema decide isto, não eu: `@@unique([gameWorldId, userId])` com o
 * comentário "1 participação por usuário/mundo" (schema.prisma:676). Voltar ao
 * mundo REATIVA a linha; não cria outra. O histórico das passagens anteriores
 * vive no DomainEventLog (R-176), não em linhas duplicadas.
 */
describe("WorldParticipant.rejoin", () => {
  it("reativa quem tinha saído e limpa a data de saída", () => {
    const participant = join();
    participant.leave("2026-03-10");
    const result = participant.rejoin("2026-06-01");
    expect(result.ok).toBe(true);
    expect(participant.snapshot().status).toBe(ParticipationStatus.ACTIVE);
    expect(participant.snapshot().leftOn).toBeNull();
    expect(participant.snapshot().version).toBe(3);
  });

  it("voltar quando já está ativo é idempotente", () => {
    const participant = join();
    participant.rejoin("2026-06-01");
    expect(participant.snapshot().version).toBe(1);
  });

  it("recusa voltar antes de ter saído", () => {
    const participant = join();
    participant.leave("2026-03-10");
    expect(participant.rejoin("2026-02-01").ok).toBe(false);
  });

  // O id não muda ao reativar: é a MESMA participação, e a FK do ClubControl
  // continuaria apontando para ela.
  it("mantém o id ao reativar", () => {
    const participant = join();
    const id = participant.snapshot().id;
    participant.leave("2026-03-10");
    participant.rejoin("2026-06-01");
    expect(participant.snapshot().id).toBe(id);
  });
});

/**
 * Cooldown NÃO é agregado. O context map (:67) lista seis roots em C1 e ele não
 * está entre eles — é responsabilidade ("Cooldowns de conta"), não entidade. E
 * é 1 por (conta, mundo), que é exatamente 1 por participação: cabe como
 * atributo. Dar-lhe tabela inventaria um root que o canônico não tem.
 *
 * O histórico de cooldowns anteriores vive no DomainEventLog (R-176).
 */
describe("WorldParticipant.startCooldown", () => {
  it("registra até quando a conta está de castigo no mundo", () => {
    const participant = join();
    const result = participant.startCooldown("2026-04-09");
    expect(result.ok).toBe(true);
    expect(participant.snapshot().cooldownUntilOn).toBe("2026-04-09");
    expect(participant.snapshot().version).toBe(2);
  });

  it("nasce sem cooldown", () => {
    expect(join().snapshot().cooldownUntilOn).toBeNull();
  });

  it("o mesmo cooldown de novo é idempotente", () => {
    const participant = join();
    participant.startCooldown("2026-04-09");
    participant.startCooldown("2026-04-09");
    expect(participant.snapshot().version).toBe(2);
  });

  // Sair de novo durante o castigo estende; nunca encurta. Encurtar deixaria um
  // comando reprocessado com data velha perdoar o castigo.
  it("estende o cooldown, mas nunca o encurta", () => {
    const participant = join();
    participant.startCooldown("2026-04-09");
    participant.startCooldown("2026-05-09");
    expect(participant.snapshot().cooldownUntilOn).toBe("2026-05-09");
    participant.startCooldown("2026-02-01");
    expect(participant.snapshot().cooldownUntilOn).toBe("2026-05-09");
  });

  it("recusa data inválida", () => {
    expect(join().startCooldown("09/04/2026").ok).toBe(false);
  });
});

describe("WorldParticipant.isInCooldownOn", () => {
  it("sem cooldown, nunca está de castigo", () => {
    expect(join().isInCooldownOn("2026-04-09")).toBe(false);
  });

  it("está de castigo antes do fim", () => {
    const participant = join();
    participant.startCooldown("2026-04-09");
    expect(participant.isInCooldownOn("2026-04-08")).toBe(true);
  });

  // O castigo vale até o fim do dia de `cooldownUntilOn` — mesma regra do prazo
  // da reserva.
  it("ainda está de castigo no último dia", () => {
    const participant = join();
    participant.startCooldown("2026-04-09");
    expect(participant.isInCooldownOn("2026-04-09")).toBe(true);
  });

  it("está livre no dia seguinte", () => {
    const participant = join();
    participant.startCooldown("2026-04-09");
    expect(participant.isInCooldownOn("2026-04-10")).toBe(false);
  });
});

describe("WorldParticipant.fromSnapshot", () => {
  it("aceita snapshot válido", () => {
    expect(WorldParticipant.fromSnapshot(join().snapshot()).ok).toBe(true);
  });

  // Estado e data têm que concordar. ACTIVE com data de saída é contradição, e
  // deixá-la passar faria o `leave` idempotente devolver a data errada.
  it("recusa ativo com data de saída", () => {
    const snapshot = { ...join().snapshot(), leftOn: "2026-03-10" };
    const result = WorldParticipant.fromSnapshot(snapshot);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("PARTICIPACAO_INVALIDA");
  });

  it("recusa encerrado sem data de saída", () => {
    const snapshot = {
      ...join().snapshot(),
      status: ParticipationStatus.ENDED,
      leftOn: null,
    };
    expect(WorldParticipant.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa saída anterior ao ingresso", () => {
    const snapshot = {
      ...join().snapshot(),
      status: ParticipationStatus.ENDED,
      leftOn: "2026-01-01",
    };
    expect(WorldParticipant.fromSnapshot(snapshot).ok).toBe(false);
  });

  it("recusa versão inválida", () => {
    expect(
      WorldParticipant.fromSnapshot({ ...join().snapshot(), version: 0 }).ok,
    ).toBe(false);
  });
});
