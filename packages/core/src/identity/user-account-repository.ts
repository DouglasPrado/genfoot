import type { UserAccountSnapshot } from "./user-account.js";

/**
 * Porta da conta de plataforma (R-172).
 *
 * É a primeira porta do domínio SEM `gameWorldId`: a conta é global, e o
 * vínculo por mundo é `WorldParticipant`. As buscas por e-mail e por subject
 * existem porque são as duas chaves únicas do modelo físico — e são o que o
 * login precisa: o provedor entrega um `sub`, e é por ele que se acha a conta.
 */
export interface UserAccountRepository {
  findAccountById(id: string): Promise<UserAccountSnapshot | null>;
  /** `email` deve vir normalizado (ver `normalizeEmail`). */
  findAccountByEmail(email: string): Promise<UserAccountSnapshot | null>;
  /** `sub` do token verificado do provedor (R-171). */
  findAccountByExternalSubject(
    subject: string,
  ): Promise<UserAccountSnapshot | null>;
  saveAccount(
    snapshot: UserAccountSnapshot,
    expectedVersion: number | null,
  ): Promise<void>;
}
