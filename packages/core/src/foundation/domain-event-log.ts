import type { ChainableEvent } from "./event-chain.js";

/**
 * Evento pronto para gravar, ANTES de entrar na cadeia (R-176).
 *
 * Não tem `sequence`, `prevEventHash` nem `eventHash`: os três são atribuídos no
 * append, porque dependem do que já está gravado no mundo — e o agregado não
 * conhece o mundo (R-175). É por isso que o encadeamento não pode morar no
 * agregado, e não por conveniência.
 */
export type NewDomainEvent = Omit<
  ChainableEvent,
  "sequence" | "prevEventHash" | "eventHash"
>;

/**
 * Porta do log de eventos de domínio (R-176). Substitui o `events[]` dentro do
 * estado, que 12 dos 16 snapshots carregavam, **nunca era drenado** e crescia
 * sem limite dentro do blob reescrito por inteiro a cada save.
 *
 * `append` é append-only: não existe update nem delete. É o que R-133 exige
 * ("banco INSERT-only na auditoria") e o que a implementação anterior violava —
 * `saveAdmin` reescrevia a cadeia inteira a cada comando.
 */
export interface DomainEventLogRepository {
  /**
   * Grava os eventos na ordem recebida, atribuindo `worldSequence` monotônico
   * sem gap nem duplicata (CA-REG-01) e encadeando os hashes de integridade.
   *
   * Todos têm de ser do MESMO mundo: a sequência e a cadeia são por mundo.
   */
  append(events: readonly NewDomainEvent[]): Promise<readonly ChainableEvent[]>;

  /**
   * A cadeia do mundo, em ordem de `sequence`. Alimenta o verificador periódico
   * que R-133 exige (`verifyEventChain`).
   */
  readWorldChain(gameWorldId: string): Promise<readonly ChainableEvent[]>;

  /** Os eventos de UM agregado, em ordem de `aggregateVersion`. */
  readAggregateChain(
    gameWorldId: string,
    aggregateType: string,
    aggregateId: string,
  ): Promise<readonly ChainableEvent[]>;
}
