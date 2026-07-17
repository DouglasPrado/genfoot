// O core depois do extermínio da arquitetura morta (R-175).
//
// Sumiram 12 contextos inteiros de mega-agregado (`World<X>` + `revision` +
// `save<X>ByWorldId`) e o adapter JSON que os servia: ~22.800 linhas. Não foram
// "adiados" — foram construídos antes de qualquer cliente provar que eram o
// backend certo, e é por isso que 16 contextos completos conviviam com 11 de 114
// telas. Voltam um a um, já em agregado por entidade sobre Postgres, quando uma
// vertical viva os exigir.
//
// Sobrevive aqui o que é agregado por entidade, regra pura, ou fundação.

export * from "./foundation/canonical-json.js";
export * from "./foundation/deterministic-uuid.js";
export * from "./foundation/domain-event-log.js";
export * from "./foundation/event-chain.js";
export * from "./foundation/idempotency.js";
export * from "./foundation/seeded-random.js";

// C1 — identidade. Migrado: agregados por entidade, Postgres, UnitOfWork.
export * from "./identity/identity-types.js";
export * from "./identity/user-account.js";
export * from "./identity/user-account-repository.js";
export * from "./identity/user-account-use-cases.js";
export * from "./identity/world-participant.js";
export * from "./identity/world-participant-repository.js";
export * from "./identity/club-control.js";
export * from "./identity/club-control-repository.js";
export * from "./identity/club-entry-reservation.js";
export * from "./identity/club-entry-reservation-repository.js";
export * from "./identity/identity-unit-of-work.js";
export * from "./identity/identity-events.js";
export * from "./identity/identity-read-model.js";
export * from "./identity/identity-commands.js";

// C2 — mundo. `GameWorld` é tabela (R-182); o `WorldScheduler` morreu com o
// resto e volta quando o relógio precisar andar.
export * from "./world/game-world.js";
export * from "./world/world-repository.js";
export * from "./world/world-types.js";
export * from "./world/world-use-cases.js";

// C3 — clube. Os agregados por entidade e a porta nova; o `WorldClubPortfolio`
// (672 linhas embrulhando os 16 clubes numa revisão só) morreu.
export * from "./clubs/club.js";
export * from "./clubs/club-repository.js";
export * from "./clubs/club-types.js";
export * from "./clubs/club-bootstrap.js";
export * from "./clubs/visual-identity-catalog.js";
export * from "./clubs/squad.js";
export * from "./clubs/infrastructure-project.js";
export * from "./clubs/infrastructure-project-types.js";

// Gênese — gera o mundo inicial. É o que o admin usa para criar clubes.
export * from "./genesis/genesis-types.js";
export * from "./genesis/player-generation.js";
export * from "./genesis/world-genesis-generator.js";
export * from "./genesis/world-genesis-use-cases.js";
export * from "./genesis/world-genesis-validator.js";

// Regras puras resgatadas dos mega-agregados. Morreu o embrulho, não a regra:
// `match-kernel` é a simulação de partida e só depende de `SeededRandom`.
export * from "./matches/match-kernel.js";
export * from "./matches/match-types.js";
// O grid canônico do GDD §2 (R-188) e a derivação do overall (R-09).
export * from "./players/player-attributes.js";
export * from "./players/player-repository.js";
export * from "./players/player.js";
export * from "./players/player-lifecycle-types.js";
export * from "./scheduling/season.js";
export * from "./scheduling/scheduling-types.js";
export * from "./scheduling/time-window.js";

export * from "./calibration/calibration-types.js";
export * from "./calibration/calibration.js";
export * from "./platform/platform-types.js";
export * from "./platform/platform.js";
export * from "./clients/clients-types.js";
export * from "./clients/clients-runtime.js";
export * from "./clients/screen-registry.js";
export * from "./clients/golden-path-registry.js";
export * from "./clubs/club-read-model.js";
export * from "./world/world-read-model.js";
export * from "./clubs/club-unit-of-work.js";
export * from "./clubs/club-events.js";
export * from "./clubs/club-commands.js";
