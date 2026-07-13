# Feature Specification: Clientes mobile e admin

**Feature Branch**: `018-mobile-admin-clients` | **Created**: 2026-07-13 | **Status**: PLANNED  
**Feature ID**: X-003 | **Milestone**: M3 | **Owner**: Concern Clientes

**Input**: Entregar Expo mobile e Next.js admin não autoritativos, contratos comuns, offline limitado, realtime recuperável, design system e acessibilidade.

## User Scenarios & Testing

### User Story 1 — Completar os 16 fluxos no mobile (Priority: P1)

Como gestor, quero executar GP-001…GP-016 no app com estado, bloqueios e consequências oficiais compreensíveis.

**Independent Test**: Rodar E2E de cada golden path contra backend autoritativo, cobrindo success/loading/empty/error/blocked/offline.

**Acceptance Scenarios**:

1. **Given** command disponível, **When** usuário confirma conforme risco, **Then** cliente envia contrato oficial e acompanha estado até efeito/projeção.
2. **Given** erro de domínio, **When** resposta chega, **Then** UI preserva input seguro e mostra razão/ação recuperável sem simular sucesso.

### User Story 2 — Recuperar conexão sem duplicar ação (Priority: P2)

Como usuário móvel, quero reconectar e continuar do estado oficial sem command repetido.

**Independent Test**: Desconectar, perder sequences, repetir eventos/commands e provar dedup, gap recovery e snapshot atualizado.

**Acceptance Scenarios**:

1. **Given** gap de realtime, **When** cliente detecta sequence, **Then** pausa aplicação, busca delta/snapshot e retoma.
2. **Given** intent reversível offline dentro do TTL, **When** reconecta, **Then** revalida e envia uma vez; intent vencida não executa.

### User Story 3 — Operar o mundo com segurança no admin (Priority: P3)

Como operador autorizado, quero investigar e agir com RBAC, reautenticação e quatro-olhos.

**Independent Test**: Executar jornadas admin por papel, incluindo forbidden, approval, audit e sessão expirada.

**Acceptance Scenarios**:

1. **Given** ação sensível, **When** operador tenta executar, **Then** UI exige reauth/approval e backend permanece autoridade.
2. **Given** papel sem escopo, **When** rota/ação é acessada, **Then** cliente bloqueia UX e backend também nega.

### Edge Cases

- Deep link com sessão expirada; app em background durante command; resposta 202 longa.
- Evento duplicado/gap, cache de outro mundo/conta, upgrade de contrato incompatível.
- Fonte ampliada, leitor de tela, reduced motion, contraste e teclado admin.
- Offline em ação financeira, transferência, escalação final ou admin: sempre bloqueado.

## Scope & Boundaries

Inclui Expo/React Native mobile, Next.js admin, packages/contracts/ui, 138 telas, design system, cache, offline whitelist+TTL, realtime recovery, acessibilidade e telemetry de UX. Exclui regra/estado oficial, autenticação/commands owners, broker e decisões admin.

Dependências: BC-001/006/007/008/009/010/011/012 por contratos; X-002 e VAL-001 concluídos para integração autoritativa.

## Requirements

- **FR-001**: Clientes MUST ser não autoritativos e MUST NOT calcular/persistir resultado oficial.
- **FR-002**: Mobile/admin MUST consumir contratos comuns versionados de command/query/event/error.
- **FR-003**: Command MUST usar idempotency key, correlationId e estados pending/accepted/rejected/applied.
- **FR-004**: Realtime MUST validar world/stream sequence, deduplicar e recuperar gap por delta/snapshot.
- **FR-005**: Offline MUST permitir leitura cacheada identificada e somente intents reversíveis em whitelist com TTL.
- **FR-006**: Ações irreversíveis/alto risco MUST NOT ser enfileiradas offline.
- **FR-007**: Cada tela aplicável MUST cobrir loading, empty, error, blocked, offline e recovery.
- **FR-008**: Confirmação MUST ser proporcional ao risco e explicar efeito/irreversibilidade.
- **FR-009**: Cache MUST ser segregado por account/world/control e apagado/revalidado na troca.
- **FR-010**: 114 telas mobile e 24 admin MUST mapear arquétipo/layout canônico e golden path.
- **FR-011**: Fluxos críticos MUST atender leitor de tela, foco/teclado, contraste, touch target e reduced motion.
- **FR-012**: Admin MUST refletir RBAC/reauth/SoD sem substituir enforcement backend.
- **FR-013**: Telemetry MUST omitir segredos/PII e correlacionar falhas com IDs seguros.
- **FR-014**: Upgrade incompatível de contrato MUST bloquear com atualização/recuperação segura.

### Key Entities

ClientSession, QueryCacheEntry, OfflineIntent, RealtimeCursor, CommandTracking, ScreenState e AccessibilityProfile (estado local não autoritativo).

## Canonical Sources & Traceability

| Scope                    | Sources                                                                                                            | IDs                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------ | ------------------ |
| Concern/client contracts | `docs/02-tecnico/12-context-map-e-blueprint.md`, “Clientes”; `docs/02-tecnico/08-frontend-cliente-e-tempo-real.md` | R-148, CA-UX-01…06 |
| Design system/telas      | `docs/04-ui-ux/00-visao-geral-e-design-system.md`; `docs/04-ui-ux/24-layouts-canonicos-e-cobertura.md`             | 114+24 telas       |
| Golden paths             | `docs/01-game-design/15-fluxos-completos.md`                                                                       | GP-001…016         |

## Success Criteria

- **SC-001**: GP-001…GP-016 passam E2E nos clientes aplicáveis.
- **SC-002**: Duplicata/gap/reconnect produz zero command ou projeção duplicada em testes.
- **SC-003**: 100% das 138 telas têm layout e estados obrigatórios rastreados.
- **SC-004**: Fluxos críticos passam 100% dos checks de acessibilidade aplicáveis.
- **SC-005**: Zero ação irreversível executa a partir da fila offline.

## Assumptions

- Backend/contracts M2 estão congelados; clientes não compensam lacunas do domínio.
- Expo é alvo iOS/Android; admin Next.js é web operacional responsiva.
