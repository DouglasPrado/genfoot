# Feature Specification: Clube, elenco e infraestrutura

**Feature ID**: BC-003  
**Directory**: `specs/004-club-squad-infrastructure`  
**Created**: 2026-07-13  
**Status**: DELIVERED
**Milestone**: M1  
**Owner**: C3 · Clube/Estrutura  
**Input**: catálogo mestre, mapa de fontes e documentos canônicos.

**Portfolio**: [catálogo](../001-game-delivery-roadmap/contracts/feature-catalog.md) · [mapa de fontes](../001-game-delivery-roadmap/contracts/source-map.md)  
**Branch**: pacote de design do roadmap mestre

## User Scenarios & Testing

### User Story 1 — Gerir o clube e seu elenco (Priority: P1)

Como operador do domínio, quero permitir que um clube gerencie identidade, elenco, departamentos, estádio, obras e governança sem escrever estado alheio.

**Why this priority**: estabelece o comportamento autoritativo mínimo da feature.

**Independent Test**: mudanças válidas preservam um único vínculo de slot e rejeitam versão concorrente.

**Acceptance Scenarios**

1. **Given** estado válido e versão esperada, **When** o comando P1 é repetido com a mesma chave, **Then** há um único efeito e a mesma resposta observável.
2. **Given** dois mundos, **When** o fluxo roda em ambos, **Then** nenhuma leitura, escrita, seed ou evento cruza `worldId`.

### User Story 2 — Executar uma evolução de infraestrutura (Priority: P2)

Como mantenedor, quero evoluir o domínio preservando histórico, compatibilidade e recuperação.

**Why this priority**: fecha a operação durável depois da fatia principal.

**Independent Test**: um projeto aprovado progride por etapas, cobra C9 por saga e só opera após inspeção.

**Acceptance Scenarios**

1. **Given** falha após persistência parcial, **When** o processamento é retomado, **Then** continua do checkpoint sem duplicar efeitos.
2. **Given** versão/ruleset incompatível, **When** uma mutação é solicitada, **Then** falha de modo tipado sem alterar estado.

### User Story 3 — Personalizar a identidade do clube (Priority: P2)

Como dono do clube, quero personalizar nome, cores (primária/secundária/terciária) e os modelos de camisa e escudo, para expressar a identidade visual do clube — sabendo que uma mudança brusca comunica-se à torcida.

**Why this priority**: entrega a superfície de identidade visual (cosmética) sobre o modelo temporal de identidade já existente, sem tocar em estado competitivo.

**Independent Test**: um rebranding válido abre um novo período de identidade com a identidade visual escolhida e emite `ClubRebranded`; um nome já usado por outro clube do mundo é rejeitado.

**Acceptance Scenarios**

1. **Given** um clube ativo, **When** o dono confirma `UpdateClubVisualIdentity` com nome inédito e paleta/modelos válidos, **Then** a identidade visual é persistida, um novo período de identidade abre e `ClubRebranded` é emitido com os campos alterados.
2. **Given** dois clubes no mesmo mundo, **When** um tenta assumir o nome (normalizado, case-insensitive) do outro, **Then** o comando é rejeitado com `CLUB_NAME_ALREADY_TAKEN` sem alterar estado.
3. **Given** uma paleta com cor malformada, modelo desconhecido ou cor terciária ausente para um modelo de 3 cores, **When** o comando é submetido, **Then** falha com `INVALID_VISUAL_IDENTITY` sem alterar estado.

### Edge Cases

- comando duplicado, concorrente ou fora de ordem;
- referência a outro mundo, aggregate ausente ou versão obsoleta;
- retry depois de timeout e evento já publicado;
- data-limite, coleção vazia, limite de capacidade e snapshot histórico.

## Scope & Boundaries

**Included**: Club, Squad, departamentos, estádio, peças de infraestrutura, comercial, diretoria, manutenção, projetos e identidade visual cosmética (nome, cores, camisas e escudo) com unicidade de nome no mundo.

**Excluded**: contratos de jogador/staff (C6/C5), saldo/reserva (C9), sanções administrativas (C12).

**Ownership**: C3 · Clube/Estrutura escreve somente seus aggregates. Outros contextos são consumidos por IDs, queries versionadas, commands ou eventos públicos.

**Dependencies**: FND-001, BC-002. A dependência libera trabalho apenas quando seu contrato e evidência requerida estiverem disponíveis.

**Current state**: C3 entrega 16 clubes e elencos determinísticos, gestão versionada e idempotente, departamentos, estádio, comercial, governança, manutenção e projetos SAGA-04 recuperáveis em snapshot v6.

**Target state**: Entregue para o escopo C3. Saldo/reserva, licenciamento competitivo e eventing durável continuam nos owners C9, C7 e X-002 e são consumidos somente por portas versionadas.

## Requirements

### Functional Requirements

- **FR-001** C3 deve possuir Club, Squad, departamentos, estádio, projetos e decisões da diretoria.
- **FR-002** Toda mutação deve exigir worldId, clubId, versão esperada e chave de idempotência.
- **FR-003** O Squad deve referenciar jogadores por ID de C4/C6 sem alterar contrato ou carreira.
- **FR-004** Níveis de estrutura devem respeitar capacidade, tempo, manutenção, deterioração e dependências.
- **FR-005** Obras devem seguir SAGA-04 e não confirmar etapa financeira sem fato de C9.
- **FR-006** Governança deve registrar decisão, autor, justificativa e vigência.
- **FR-007** A identidade do clube deve suportar identidade visual cosmética (cores primária/secundária/terciária em hex, modelo de camisa 1, camisa 2 e escudo por id de catálogo), versionada junto do período de identidade. Cores e modelos devem ser validados; a cor terciária é obrigatória se — e só se — algum modelo escolhido usa 3 cores.
- **FR-008** O nome do clube deve ser único no mundo (normalizado, case-insensitive). Alterações de identidade que colidem são rejeitadas de modo tipado sem alterar estado. Um rebranding emite o fato oficial `ClubRebranded` (consumido por C10 para reação da torcida).

### Domain Rules and Invariants

- **INV-001**: R-27; R-148; SAGA-04; um owner por aggregate; dinheiro somente em C9.
- **INV-002**: toda escrita é isolada por `worldId`, versionada e idempotente.
- **INV-003**: regras comportamentais registram `rulesetVersion`; histórico não é reinterpretado.
- **INV-004**: eventos são consequência de commit local e nunca concedem escrita cruzada.

### Conceptual Entities

Consulte [data-model.md](data-model.md). Contratos observáveis estão em [contracts/README.md](contracts/README.md).

## Canonical Sources & Traceability

| Requirement group    | Canonical source                                                                 | Decisions / coverage                                                 |
| -------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| FR-001 e invariantes | `docs/02-tecnico/12-context-map-e-blueprint.md` — C3 · Clube/Estrutura           | R-27; R-148; SAGA-04; um owner por aggregate; dinheiro somente em C9 |
| FR-002 e invariantes | `docs/01-game-design/04-estrutura-do-clube-e-staff.md` — estrutura e governança  | baseline R-02…R-148                                                  |
| FR-003 e invariantes | `docs/01-game-design/08-estadio-regiao-e-clima.md` — estádio, manutenção e obras | baseline R-02…R-148                                                  |
| FR-004 e invariantes | `docs/02-tecnico/16-sagas-e-workflows.md` — SAGA-04                              | baseline R-02…R-148                                                  |

Aliases seguem C1…C12 e concerns do `source-map.md`. Não há conflito aberto; qualquer divergência futura bloqueia implementação e deve ser reconciliada no catálogo.

## Success Criteria

- **SC-001**: todos os cenários P1 passam com retry e concorrência sem efeito duplicado.
- **SC-002**: replay com mesma entrada, seed e ruleset produz os mesmos hashes aplicáveis.
- **SC-003**: 100% das escritas carregam `worldId`, versão esperada e chave idempotente.
- **SC-004**: evidências atuais e pendentes permanecem separadas; ausência de prova resulta em pendência.
- **SC-005**: rebranding válido persiste identidade visual e emite `ClubRebranded`; nome duplicado e paleta inválida são rejeitados sem efeito colateral; a identidade visual sobrevive ao round-trip de persistência.

## Assumptions

- A baseline ratificada de 2026-07-13 é normativa.
- Contratos entre owners são versionados e congelados antes de implementação paralela.
- Trabalho excluído permanece nos IDs owners indicados; este pacote não assume sua autoridade.
