export interface RealtimeEvent {
  readonly eventId: string;
  readonly worldId: string;
  readonly streamId: string;
  readonly sequence: number;
  /** Token opaco que permite retomar exatamente desta sequence. */
  readonly resumeToken: string;
  readonly eventType: string;
  readonly eventVersion: number;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly payload: Record<string, unknown>;
}

/**
 * Porta de publicação em tempo real. O transporte (Socket.IO gateway) implementa
 * esta interface; commands publicam os eventos de domínio produzidos. O gateway
 * não é fonte de verdade — apenas acelera a entrega (docs §08).
 */
export interface RealtimePublisher {
  publish(
    worldId: string,
    correlationId: string,
    events: readonly Record<string, unknown>[],
  ): readonly RealtimeEvent[];
}
