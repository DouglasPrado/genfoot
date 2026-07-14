# Feature Specification: Mercado, scouting e contratos

**Feature Branch**: `011-market-scouting-contracts`  
**Created**: 2026-07-13  
**Status**: DELIVERED  
**Feature ID**: BC-006  
**Milestone**: M1 — Temporada headless  
**Owner**: C6 Mercado/Contratos  
**Input**: Completar scouting, mercado, transferências, empréstimos, contratos e vínculo jogador–clube.

## User Scenarios & Testing

### User Story 1 — Contratar um jogador com liquidação segura (Priority: P1)

Como gestor, quero descobrir, avaliar e contratar um jogador elegível para melhorar o elenco sem duplicar vínculo ou dinheiro.

**Why this priority**: A transferência definitiva fecha a principal movimentação entre jogador, clube, competição e economia.

**Independent Test**: Executar SAGA-01 com seed fixa, incluindo sucesso, retry e falha após reserva; observar um único vínculo, uma liquidação balanceada e compensação completa.

**Acceptance Scenarios**:

1. **Given** proposta vigente aceita e recursos reservados, **When** todos os checkpoints concluem, **Then** contrato e vínculo entram em vigor uma vez, o ledger liquida e a inscrição pode ser solicitada.
2. **Given** falha depois da reserva, **When** a saga compensa, **Then** a reserva é liberada e jogador, contrato e clubes permanecem consistentes.

### User Story 2 — Negociar com informação imperfeita (Priority: P2)

Como gestor, quero usar scouting e propostas versionadas para decidir sem acessar atributos ou potencial ocultos.

**Why this priority**: Informação imperfeita sustenta justiça, staff e valor esportivo da descoberta.

**Independent Test**: Comparar relatórios de diferentes níveis de scouting e provar que só informação observável, com confiança e validade, entra na decisão.

**Acceptance Scenarios**:

1. **Given** relatório expirado ou insuficiente, **When** uma oferta é preparada, **Then** o sistema explicita incerteza sem revelar o estado autoritativo oculto.
2. **Given** contraproposta concorrente, **When** uma versão obsoleta é aceita, **Then** a operação falha sem alterar negociação ou finanças.

### User Story 3 — Emprestar e retornar deterministicamente (Priority: P3)

Como gestor, quero registrar duração, custos e opção de compra para que empréstimo, retorno ou aquisição sejam previsíveis.

**Why this priority**: SAGA-05 fecha vínculos temporários e evita jogador preso ou contratado duas vezes.

**Independent Test**: Simular início, acompanhamento, expiração, retorno e exercício de opção com retries; cada terminal ocorre uma única vez.

**Acceptance Scenarios**:

1. **Given** empréstimo ativo, **When** chega a data final sem opção exercida, **Then** vínculo temporário encerra e o jogador retorna ao clube de origem.
2. **Given** opção válida e liquidável, **When** é exercida, **Then** a compra substitui o vínculo temporário sem retorno intermediário duplicado.

### Edge Cases

- Jogador já vinculado por contrato incompatível ou inscrito sob restrição.
- Oferta expira durante exame médico, janela fecha ou orçamento muda.
- Dois clubes aceitam versões concorrentes da mesma negociação.
- Retry ocorre após liquidação, mas antes da projeção ou inscrição.
- Menor de idade, atleta lesionado ou empréstimo com responsabilidade médica dividida.

## Scope & Boundaries

Inclui scouting, relatório e shortlist; listing/abordagem; negociação e propostas versionadas; contrato de trabalho; transferência definitiva; empréstimo e opção; vínculo autoritativo jogador–clube; SAGA-01/SAGA-05 e compensações.

Exclui atributos/lifecycle do jogador (C4), estrutura do clube (C3), saldo/reserva/liquidação (C9), inscrição competitiva (C7), transporte da saga (X-002) e UI (X-003). C6 solicita essas ações por contratos; não escreve seus aggregates.

**Dependencies**: BC-003, BC-004 e BC-005 por contrato congelado; BC-009 e X-002 concluídos para iniciar liquidação e sagas.

## Requirements

### Functional Requirements

- **FR-001**: C6 MUST ser o único owner de scouting, negociação, oferta, contrato, empréstimo e vínculo jogador–clube.
- **FR-002**: Relatórios MUST conter escopo, confiança, fonte e validade e MUST NOT revelar conhecimento não observado.
- **FR-003**: Ofertas e contrapropostas MUST ser versionadas; aceite obsoleto MUST falhar sem efeito.
- **FR-004**: Toda ação MUST usar idempotency key e preservar um único efeito sob entrega at-least-once.
- **FR-005**: Transferência MUST seguir SAGA-01 com checkpoints, timeout, retry e compensação.
- **FR-006**: Empréstimo MUST seguir SAGA-05 e registrar período, custos, salários, opção e destino terminal.
- **FR-007**: Reserva/liquidação MUST ocorrer apenas por C9 e conservar valor no ledger.
- **FR-008**: Inscrição MUST ocorrer apenas por C7 e não pode ser confundida com vínculo contratual.
- **FR-009**: Um jogador MUST NOT possuir vínculos profissionais incompatíveis simultâneos.
- **FR-010**: Estado histórico de proposta, contrato e saga MUST ser append-only/versionado e auditável.
- **FR-011**: Regras dependentes de data, janela e arredondamento MUST registrar rulesetVersion.
- **FR-012**: Falha terminal MUST deixar causa e compensações observáveis, sem apagar fatos anteriores.

### Key Entities

- **ScoutingReport**: visão imperfeita versionada sobre um jogador.
- **MarketListing**: disponibilidade e condições públicas de abordagem.
- **Negotiation/OfferVersion**: conversa e proposta imutável em uma versão.
- **PlayerContract**: obrigações, vigência, remuneração e cláusulas.
- **PlayerClubLink**: vínculo autoritativo vigente ou temporário.
- **Transfer/LoanAgreement**: acordo coordenado pelas sagas correspondentes.

## Canonical Sources & Traceability

| Scope                           | Sources                                                                                                                 | Decisions/gates      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Ownership, scouting e contratos | `docs/02-tecnico/12-context-map-e-blueprint.md`, “C6”; `docs/01-game-design/02-sistema-de-jogadores.md`                 | R-26, R-28           |
| Pagamentos e conservação        | `docs/01-game-design/03-economia.md`; `docs/02-tecnico/13-ledger-e-conservacao-economica.md`                            | INV-3a/3b, INV-8…13  |
| Estados e workflows             | `docs/02-tecnico/14-maquinas-de-estado.md`, “Transferência”; `docs/02-tecnico/16-sagas-e-workflows.md`, SAGA-01/SAGA-05 | R-138…R-142          |
| Aceite                          | `docs/02-tecnico/17-criterios-de-aceite-e-bandas.md`, §4.8                                                              | CA de mercado, G1–G7 |

## Success Criteria

- **SC-001**: Sucesso, retry e compensação de SAGA-01/SAGA-05 produzem exatamente um estado terminal em 100% dos cenários de contrato.
- **SC-002**: Zero jogador termina com vínculo profissional incompatível ou liquidação duplicada.
- **SC-003**: Toda movimentação financeira reconcilia com residual zero e toda proposta aceita corresponde à versão vigente.
- **SC-004**: Relatórios de scouting nunca expõem campos fora do conhecimento autorizado.

## Assumptions

- C9 fornece reservas/liquidações idempotentes; X-002 fornece saga durável e fencing.
- O primeiro marco usa o catálogo de regras ratificado; recalibração cria nova rulesetVersion.
- Leilões avançados e monetização não ampliam este primeiro recorte sem novo ID rastreável.
