import { describe, expect, it } from "vitest";
import { GOLDEN_PATH_REGISTRY } from "@grinta/core";

import { registeredCommandTypes } from "../src/commands/command-registry.js";

/**
 * Catraca de integridade do golden path (R-215).
 *
 * O `GOLDEN_PATH_REGISTRY` é o mapa das jornadas PROJETADAS — ele legitimamente
 * cita commands que ainda não existem, porque a R-175 removeu 12 contextos e
 * eles voltam um a um. O que não é legítimo é não haver como distinguir o que
 * já existe do que é projeto: `player:promote-youth` (inexistente) e
 * `youth:promote-player` (real) conviveram no repositório sem nada apontar a
 * divergência.
 *
 * Esta lista é a dívida declarada. Nome que não está no registry NEM aqui
 * quebra o teste — dívida nova não entra em silêncio. Quando o handler é
 * escrito, ele sai daqui, e a lista encolhendo mede quanto do jogo projetado
 * existe de fato.
 *
 * Roda sem banco de propósito: é comparação de duas listas estáticas, e um
 * teste de integridade de catálogo que exige Postgres não roda quando mais
 * importa.
 */
const PENDENTES: readonly string[] = [
  // GP-002 — retorno após ausência
  "identity:start-session",
  "automation:get-explanation",
  // GP-004 — início de temporada
  "competition:create-edition",
  "competition:generate-fixtures",
  "scheduler:schedule-tasks",
  // GP-006 — encerramento de temporada
  "competition:homologate",
  "season:rollover:start",
  "season:rollover:resume",
  // GP-007 — preparação e partida
  "match:create-manifest",
  "match:start",
  "match:submit-command",
  "match:finalize",
  // GP-008/009/010 — mercado (contratação, venda, empréstimo)
  "market:request-scouting",
  "market:open-negotiation",
  "market:submit-offer",
  "market:start-transfer",
  "market:accept-offer",
  "market:start-loan",
  "market:exercise-loan-option",
  "market:return-loaned-player",
  // GP-012 — lesão e recuperação
  "player:open-medical-case",
  "player:reassess-medical",
  // GP-013 — ciclo financeiro
  "ledger:reconcile",
  "ledger:accrue-debt",
  "ledger:close-period",
  // GP-014 — infraestrutura
  "infrastructure:start",
  "infrastructure:resume",
  "infrastructure:abort",
  // GP-015/016 — narrativa e crise
  "narrative:open-crisis",
  "narrative:submit-recovery",
  "narrative:resolve-crisis",
];

describe("integridade do golden path", () => {
  it("nenhum commandType novo fora do registry e fora da lista de pendências", () => {
    const existentes = new Set(registeredCommandTypes());
    const declarados = new Set(PENDENTES);
    const surpresas = GOLDEN_PATH_REGISTRY.flatMap((path) =>
      path.commandTypes
        .filter((c) => !existentes.has(c) && !declarados.has(c))
        .map((c) => `${path.id} → ${c}`),
    );
    expect(surpresas).toEqual([]);
  });

  it("a lista de pendências não guarda command já construído", () => {
    // Sem isto a catraca enferruja: handler escrito continuaria listado como
    // dívida, e a lista pararia de medir o que diz medir.
    const existentes = new Set(registeredCommandTypes());
    expect(PENDENTES.filter((c) => existentes.has(c))).toEqual([]);
  });

  it("a lista de pendências não guarda command que ninguém cita", () => {
    const citados = new Set(
      GOLDEN_PATH_REGISTRY.flatMap((path) => path.commandTypes),
    );
    expect(PENDENTES.filter((c) => !citados.has(c))).toEqual([]);
  });

  it("o registry de commands não está vazio (senão os testes acima seriam vácuo)", () => {
    expect(registeredCommandTypes().length).toBeGreaterThan(20);
  });
});
