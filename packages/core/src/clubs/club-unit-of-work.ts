import type { DomainEventLogRepository } from "../foundation/domain-event-log.js";
import type { IdempotencyRepository } from "../foundation/idempotency.js";

import type { ClubRepository } from "./club-repository.js";

/**
 * As portas de C3, ligadas à MESMA transação (Decisão 19.10).
 *
 * Com o mega-agregado, "atômico" era grátis: um blob, um save. Quebrado em roots
 * (R-175), salvar o clube e gravar o evento são duas escritas — e o evento tem de
 * ir no MESMO commit do agregado que o produziu. Sem isso o clube muda, o append
 * falha, e a história fica com um buraco que ninguém detecta.
 *
 * Em C3 isso é ainda mais concreto que em C1: **um clube ocupa 6 tabelas**. Sem
 * transação, metade dele grava — identidade nova sem estádio, departamentos de
 * um clube que não existe mais.
 *
 * A `idempotency` entra aqui, e não no caso de uso: o catálogo fixa
 * `IDEMPOTENCY_KEY_REUSED` como errorCode COMUM de toda mutação
 * (`10-catalogo-de-commands.md:61`) — é do barramento, não de cada command.
 */
export interface ClubRepositories {
  readonly clubs: ClubRepository;
  readonly events: DomainEventLogRepository;
  readonly idempotency: IdempotencyRepository;
}

/**
 * Escopo transacional de C3. O caso de uso não abre transação nem sabe o que é
 * uma — pede um escopo e recebe as portas já ligadas a ele.
 *
 * `run` desfaz TUDO se o trabalho lançar, a reserva de idempotência inclusive.
 * É de propósito: comando que falhou não pode deixar a chave presa, senão um
 * erro recuperável ("nome já usado") viraria bloqueio permanente.
 */
export interface ClubUnitOfWork {
  run<T>(work: (repositories: ClubRepositories) => Promise<T>): Promise<T>;
}
