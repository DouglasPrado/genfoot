export interface IdempotencyRecord {
  readonly commandId: string;
  readonly resource: string | undefined;
}

/**
 * Idempotência de transporte por `idempotencyKey` (FR-003 do X-003): a primeira
 * submissão executa e registra o `commandId`; repetições devolvem ALREADY_APPLIED
 * com o mesmo `commandId`, sem reexecutar o caso de uso. Em memória na fundação
 * (processo único); a evolução persiste/compartilha via Redis conforme o canônico.
 */
export class IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord>();

  get(idempotencyKey: string): IdempotencyRecord | undefined {
    return this.records.get(idempotencyKey);
  }

  remember(idempotencyKey: string, record: IdempotencyRecord): void {
    if (!this.records.has(idempotencyKey)) {
      this.records.set(idempotencyKey, record);
    }
  }
}
