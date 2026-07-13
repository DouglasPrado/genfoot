# Research: clientes mobile e admin

## Decision 1 — Contratos únicos

**Decision**: commands/queries/events/errors versionados em package comum consumido por ambos.  
**Rationale**: evita deriva mobile/admin.  
**Alternatives considered**: DTOs copiados por app rejeitados.

## Decision 2 — Cache segregado e derivado

**Decision**: keys incluem account/world/control/contract version; troca limpa/revalida.  
**Rationale**: impede vazamento e estado stale cruzado.  
**Alternatives considered**: cache global por endpoint rejeitado.

## Decision 3 — Offline whitelist fail-closed

**Decision**: só intents reversíveis declaradas, TTL e revalidação; demais ações bloqueadas.  
**Rationale**: intenção vencida não pode alterar competição/economia.  
**Alternatives considered**: fila genérica offline rejeitada.

## Decision 4 — Sequence recovery

**Decision**: cursor por stream detecta duplicate/gap e recupera delta/snapshot.  
**Rationale**: WebSocket não é fonte nem garantia de entrega.

## Decision 5 — Design system acessível

**Decision**: tokens/primitives incorporam foco, semântica, contraste, escala e motion.  
**Rationale**: 138 telas tornam correção tardia cara.
