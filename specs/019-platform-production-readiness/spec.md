# Feature Specification: Plataforma e prontidão de produção

**Feature Branch**: `019-platform-production-readiness` | **Created**: 2026-07-13 | **Status**: PLANNED  
**Feature ID**: OPS-001 | **Milestone**: M4 | **Owner**: Plataforma/Operações

**Input**: Entregar operação segura/observável, carga, backups, restore isolado, DR, deploy/rollback e promoção G1–G8.

## User Scenarios & Testing

### User Story 1 — Detectar e conter incidente (Priority: P1)

Como operador, quero métricas, logs, traces, alertas e kill switches para localizar impacto por mundo e degradar com segurança.

**Independent Test**: Injetar falha de API/worker/broker/database, correlacionar ponta a ponta e provar alerta/runbook/read-only sem escrita corrompida.

**Acceptance Scenarios**:

1. **Given** SLO violado, **When** alerta dispara, **Then** owner, mundo, correlation/trace e runbook são identificáveis.
2. **Given** risco à integridade, **When** kill switch/read-only ativa, **Then** commands críticos param e queries seguras continuam conforme política.

### User Story 2 — Restaurar dentro de RPO/RTO (Priority: P2)

Como responsável por continuidade, quero provar backup, restore e DR para recuperar mundos/ledger/PII com integridade.

**Independent Test**: Gameday restaura em storage/credenciais isolados, executa checks/replay e mede RPO/RTO reais.

**Acceptance Scenarios**:

1. **Given** backup válido, **When** restore isolado conclui, **Then** hashes, constraints, ledger e audit chain são verificados antes de liberar.
2. **Given** perda regional simulada, **When** DR é executado, **Then** serviço retorna dentro dos objetivos ou gate falha.

### User Story 3 — Promover e reverter uma release (Priority: P3)

Como release owner, quero deploy progressivo e rollback exercitado somente com G1–G8 verdes.

**Independent Test**: Fazer canary, provocar regressão, rollback/forward-fix e verificar compatibilidade de migration/event/contract.

**Acceptance Scenarios**:

1. **Given** qualquer gate ausente/falho, **When** promoção é solicitada, **Then** decisão é NO-GO.
2. **Given** canary degradado, **When** rollback ocorre, **Then** versão anterior retoma sem perder fatos aceitos.

### Edge Cases

- Backup existente mas ilegível; restore usa credenciais/bucket da origem por engano.
- Migration expand-contract parcialmente aplicada; poison message/backpressure.
- Região indisponível durante rotação de chave; clock skew; custo/capacidade excedidos.
- Rollback de código após evento novo: consumer deve preservar compatibilidade.

## Scope & Boundaries

Inclui API/workers/gateway operação, security/privacy hardening, telemetry/SLO, capacidade/custo, queue health, backup/restore/DR, deployment/migrations/rollback, incident/gameday e go/no-go. Exclui regra/aggregate de negócio; plataforma hospeda owners e não escreve domínio diretamente.

Dependências: BC-012, X-002, X-003 e VAL-001 concluídas.

## Requirements

- **FR-001**: Todos os processos MUST emitir logs estruturados, metrics e traces correlacionados sem segredos/PII.
- **FR-002**: SLOs/alerts MUST ter owner, threshold, janela, severity e runbook testado.
- **FR-003**: Health/readiness MUST distinguir processo vivo de dependências/prontidão real.
- **FR-004**: Filas MUST expor lag, retry, DLQ, poison, ordering e backpressure.
- **FR-005**: Capacity/load MUST validar mundo de referência, picos, soak, autoscaling e limites de custo.
- **FR-006**: AuthN/AuthZ, RBAC, SoD, secrets/keys, rate limits e hardening MUST passar security tests.
- **FR-007**: Privacy MUST cobrir minimização, masking, retenção, anonimização, legal hold e direitos LGPD.
- **FR-008**: Backup MUST ser criptografado, versionado, verificado e armazenado com isolamento/WORM aplicável.
- **FR-009**: Restore MUST ocorrer isolado e verificar constraints, hashes, ledger, audit e replay antes de uso.
- **FR-010**: DR MUST medir RPO/RTO por classe de dado e registrar timeline/gaps.
- **FR-011**: Deployment MUST ser progressivo; migrations/events/contracts MUST seguir expand-contract.
- **FR-012**: Rollback/forward-fix MUST preservar fatos aceitos e ser exercitado em gameday.
- **FR-013**: Promoção MUST exigir G1–G8 PASS para mesma release/ruleset; missing/stale é FAIL.
- **FR-014**: Go/no-go MUST referenciar evidence set imutável e exceções não podem dispensar gate absoluto.

### Key Entities

ServiceLevelObjective, AlertRule, Incident, Runbook, Deployment, MigrationExecution, BackupSet, RestoreExercise, DisasterRecoveryExercise, CapacityReport e ReleasePromotion.

## Canonical Sources & Traceability

| Scope               | Sources                                                  | IDs                          |
| ------------------- | -------------------------------------------------------- | ---------------------------- |
| Operação/plataforma | `docs/02-tecnico/04-plataforma-seguranca-operacoes.md`   | G8                           |
| Capacidade/custo    | `docs/02-tecnico/18-capacidade-e-custo.md`               | R-125…130                    |
| Security/DR/LGPD    | `docs/02-tecnico/19-seguranca-dr-ha.md`                  | R-87, R-95, R-131…137, R-154 |
| Gate                | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`, §8 | G1–G8                        |

## Success Criteria

- **SC-001**: Load/soak atende 100% dos SLOs/capacity bands aprovados sem corrupção.
- **SC-002**: Security/privacy tests têm zero achado bloqueante aberto.
- **SC-003**: Restore e DR medidos atendem 100% dos RPO/RTO por classe.
- **SC-004**: Deploy/rollback gameday preserva 100% dos fatos aceitos.
- **SC-005**: Produção só recebe GO com G1–G8 simultaneamente PASS.

## Assumptions

- Topologia inicial é monólito modular + workers; sharding/mensageria dedicada só por gatilho medido.
- Provedor específico pode mudar sem alterar objetivos/evidence contracts.
