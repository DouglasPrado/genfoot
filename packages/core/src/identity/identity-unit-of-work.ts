import type { DomainEventLogRepository } from "../foundation/domain-event-log.js";
import type { IdempotencyRepository } from "../foundation/idempotency.js";

import type { ClubControlRepository } from "./club-control-repository.js";
import type { ClubEntryReservationRepository } from "./club-entry-reservation-repository.js";
import type { UserAccountRepository } from "./user-account-repository.js";
import type { WorldParticipantRepository } from "./world-participant-repository.js";

/**
 * As portas de C1, todas ligadas à MESMA transação.
 *
 * Com o mega-agregado, "atômico" era grátis: um blob, um save. Quebrado em
 * roots (R-175), salvar a participação e gravar o evento são duas escritas — e
 * a Decisão 19.10 exige que o evento vá no MESMO commit do agregado que o
 * produziu. Sem isso, o agregado grava, o append falha, e a história fica com
 * buraco que ninguém detecta.
 */
export interface IdentityRepositories {
  readonly accounts: UserAccountRepository;
  readonly participants: WorldParticipantRepository;
  readonly reservations: ClubEntryReservationRepository;
  readonly controls: ClubControlRepository;
  readonly events: DomainEventLogRepository;
  readonly idempotency: IdempotencyRepository;
}

/**
 * Escopo transacional. O caso de uso não abre transação nem sabe o que é uma —
 * pede um escopo e recebe as portas já ligadas a ele.
 *
 * `run` desfaz TUDO se o trabalho lançar: a reserva de idempotência inclusive.
 * Isso é de propósito — comando que falhou não pode deixar a chave presa, senão
 * "clube já tomado" viraria bloqueio permanente.
 */
export interface IdentityUnitOfWork {
  run<T>(work: (repositories: IdentityRepositories) => Promise<T>): Promise<T>;
}
