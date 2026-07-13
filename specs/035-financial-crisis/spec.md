# Feature Specification: Crise financeira

**ID**: GP-016 | **Slug**: `financial-crisis` | **Milestone**: M3 | **Status**: PLANNED  
**Owner**: fluxo multicontexto; C9 possui finanças | **Contributors**: C3, C10, C11, C12, X-001, X-003  
**Created**: 2026-07-13 | **Directory**: `specs/035-financial-crisis`

## User Scenarios & Testing

### User Story 1 — Recuperar um clube sem corromper a economia (P1)

Como gestor, quero receber alertas e aplicar medidas de recuperação para evitar insolvência, entendendo restrições e sanções sem perder arbitrariamente meu clube.

**Independent Test**: provocar risco de caixa, aplicar plano/sanções e confirmar ledger reconciliado, medidas auditáveis e saída por recuperação ou reestruturação.

**Acceptance Scenarios**:

1. **Given** caixa/dívida fora dos limites, **When** o gate financeiro é avaliado, **Then** alerta/crise nasce de fatos reconciliados.
2. **Given** plano válido, **When** medidas são executadas, **Then** cada efeito passa pelo owner/ledger e registra decisão.
3. **Given** descumprimento persistente, **When** sanção é aplicada, **Then** segue política/segregação de funções e preserva fatos/controle conforme regra.

### Edge Cases

- Caixa negativo temporário; receita atrasada; crédito indisponível; correção de ledger; sanções concorrentes; recurso; troca de gestor; mundo pausado.

## Scope & Boundaries

Inclui detecção, alerta, restrições, plano, medidas, monitoramento, sanções/recurso e recuperação/reestruturação. C9 escreve finanças; C3 plano; C12 sanções/auditoria; C10/C11 percebem/comunicam. Não altera resultados ou apaga dívida.

## Requirements

- **FR-001**: detectar risco/crise apenas de ledger e projeções reconciliadas.
- **FR-002**: versionar limiares, restrições, medidas e condições de saída.
- **FR-003**: executar toda medida financeira por transação balanceada/idempotente.
- **FR-004**: aplicar sanções com autorização, segregação, recurso e audit log append-only.
- **FR-005**: impedir direcionamento oculto da IA ou expulsão arbitrária do usuário.
- **FR-006**: preservar histórico e permitir reconstrução do diagnóstico/desfecho.

**Invariants**: INV-3a/3b, INV-8…13, INV-14/17/30/34; CA-ECO, CA-IA, CA-DAT.

## Canonical Sources & Traceability

| Scope              | Source                                                                |
| ------------------ | --------------------------------------------------------------------- |
| Fluxo              | `docs/01-game-design/15-fluxos-completos.md` — “16. Crise financeira” |
| Economia           | GDD 03 e técnico 13                                                   |
| Anti-abuso/sanções | GDD 09 e técnico 09/19                                                |
| Narrativa          | GDD 11/13                                                             |

## Success Criteria

- **SC-001**: residual zero durante 100% das medidas, sanções e correções.
- **SC-002**: 100% das sanções possuem fundamento, autorização, recurso e auditoria.
- **SC-003**: zero fato apagado, benefício oculto de IA ou perda arbitrária de controle.

## Assumptions

- Bandas econômicas/limiares são versionados e calibrados por VAL-001; GP não cria owner próprio.
