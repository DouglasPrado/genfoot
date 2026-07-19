/**
 * A porta de presença (X-001). Um upsert é auto-atômico, então segue o padrão
 * do `MatchPlayRepository`: repositório direto, sem UnitOfWork. O `lastSeenAt` é
 * carimbado pelo adapter (relógio de parede na borda), não pelo domínio.
 */
export interface PresenceRepository {
  /** Marca o usuário presente no mundo AGORA (heartbeat). */
  recordOnline(gameWorldId: string, userId: string): Promise<void>;
  /** Marca o usuário como ausente (saiu). */
  recordOffline(gameWorldId: string, userId: string): Promise<void>;
}
