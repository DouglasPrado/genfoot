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
export * from "./world/season-lifecycle.js";
export * from "./world/season-lifecycle-repository.js";
export * from "./world/world-repository.js";
export * from "./world/world-types.js";
export * from "./world/world-use-cases.js";
export * from "./world/world-clock.js";
export * from "./world/advance-world-day.js";

// C3 — clube. Os agregados por entidade e a porta nova; o `WorldClubPortfolio`
// (672 linhas embrulhando os 16 clubes numa revisão só) morreu.
export * from "./clubs/club.js";
export * from "./clubs/club-repository.js";
export * from "./clubs/club-types.js";
export * from "./clubs/club-bootstrap.js";
export * from "./clubs/visual-identity-catalog.js";
export * from "./clubs/visual-identity-generator.js";
export * from "./clubs/squad.js";
export * from "./clubs/squad-repository.js";
export * from "./clubs/infrastructure-project.js";
export * from "./clubs/infrastructure-project-types.js";

// Gênese — gera o mundo inicial. É o que o admin usa para criar clubes.
export * from "./genesis/genesis-types.js";
export * from "./genesis/player-generation.js";
export * from "./genesis/world-genesis-generator.js";
export * from "./genesis/genesis-unit-of-work.js";
export * from "./genesis/player-bootstrap.js";
export * from "./genesis/world-genesis-use-cases.js";
export * from "./genesis/world-genesis-validator.js";

// Regras puras resgatadas dos mega-agregados. Morreu o embrulho, não a regra:
// `match-kernel` é a simulação de partida e só depende de `SeededRandom`.
export * from "./matches/match-kernel.js";
export * from "./matches/match-types.js";
// O grid canônico do GDD §2 (R-188) e a derivação do overall (R-09).
export * from "./players/player-attributes.js";
export * from "./players/potential-layers.js";
export * from "./players/player-repository.js";
export * from "./players/squad-read-model.js";
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
export * from "./finance/ledger-types.js";
export * from "./finance/journal-entry.js";
export * from "./finance/ledger-read-model.js";
export * from "./finance/ledger-repository.js";
export * from "./finance/ledger-bootstrap.js";
export * from "./finance/cost-estimators.js";
export * from "./finance/season-cost-model.js";
export * from "./finance/close-season-finances.js";
export * from "./finance/budget-types.js";
export * from "./finance/budget.js";
export * from "./finance/set-budget.js";
export * from "./finance/spend-guard.js";
export * from "./finance/financial-health.js";
export * from "./finance/club-finance-read-model.js";
export * from "./competitions/competition-types.js";
export * from "./competitions/competition-config.js";
export * from "./competitions/competition.js";
export * from "./competitions/competition-schedule.js";
export * from "./competitions/author-competition.js";
export * from "./competitions/standings.js";
export * from "./competitions/season-outcome.js";
export * from "./competitions/promotion-relegation.js";
export * from "./competitions/season-rollover.js";
export * from "./competitions/team-cohesion.js";
export * from "./competitions/competition-read-model.js";
export * from "./fanbase/fanbase-model.js";
export * from "./fanbase/fanbase-repository.js";
export * from "./fanbase/fanbase-bootstrap.js";
export * from "./narrative/narrative-types.js";
export * from "./narrative/transfer-narrative.js";
export * from "./notifications/notification-types.js";
export * from "./notifications/transfer-notification.js";
export * from "./notifications/push-token.js";
export * from "./staff/staff-types.js";
export * from "./staff/staff-generation.js";
export * from "./staff/staff-bootstrap.js";
export * from "./youth/youth-generation.js";
export * from "./youth/youth-bootstrap.js";
export * from "./youth/promote-youth.js";
export * from "./youth/demote-to-youth.js";
export * from "./matches/match-simulation.js";
export * from "./matches/goal-attribution.js";
export * from "./matches/match-play-repository.js";
export * from "./matches/play-next-round.js";
export * from "./matches/matches-read-model.js";
export * from "./players/player-value.js";
export * from "./players/market-read-model.js";
export * from "./contracts/contract-types.js";
export * from "./contracts/transfer-player.js";
export * from "./contracts/release-player.js";
export * from "./contracts/sell-player.js";
export * from "./contracts/list-player.js";
export * from "./automation/automation-types.js";
export * from "./automation/automation-ports.js";
export * from "./automation/club-ai-profile.js";
export * from "./automation/automation-rule.js";
export * from "./automation/set-offline-plan.js";
export * from "./automation/save-automation.js";
export * from "./automation/run-autopilot.js";
export * from "./presence/presence-model.js";
export * from "./presence/presence-repository.js";

// Treino — a fórmula de evolução do §6 (R-212).
export * from "./training/development-gain.js";
export * from "./training/training-types.js";
export * from "./training/set-training-plan.js";
export * from "./training/training-accrual.js";
export * from "./training/apply-accruals.js";
export * from "./training/accrue-club-training.js";
export * from "./training/apply-season-accruals.js";
export * from "./training/training-session.js";
export * from "./training/session-gain.js";
export * from "./training/training-session-types.js";
export * from "./training/train-formation-cohesion.js";
export * from "./training/start-training-session.js";
export * from "./training/collect-training-session.js";
export * from "./training/settle-due-training-sessions.js";
export * from "./training/group-training-session-types.js";
export * from "./training/start-group-training-session.js";
export * from "./training/collect-group-training-session.js";
export * from "./training/settle-due-group-training-sessions.js";
export * from "./players/player-development-view.js";
export * from "./players/age-decline.js";
export * from "./players/match-form.js";
export * from "./players/talk-to-player.js";
export * from "./players/retirement-decision.js";
export * from "./players/apply-season-aging.js";
export * from "./youth/youth-class.js";
export * from "./youth/scout-report.js";
export * from "./tactics/formation.js";
export * from "./tactics/lineup-types.js";
export * from "./tactics/set-club-lineup.js";
