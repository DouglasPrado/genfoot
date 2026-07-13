# Research: automação e IA

## Decision 1 — Evaluate then command

**Decision**: policies produzem DecisionProposal; executor revalida e envia command oficial.  
**Rationale**: separa raciocínio de autoridade.  
**Alternatives considered**: escrita direta e API privilegiada foram rejeitadas.

## Decision 2 — Explicação estruturada

**Decision**: registrar fatores normalizados, alternativas, constraints, seed/stream e command.  
**Rationale**: texto livre não é suficiente para replay/auditoria.  
**Alternatives considered**: logs opacos e somente score final foram rejeitados.

## Decision 3 — Heurísticas versionadas por camada

**Decision**: Strategic, Squad, Match e Narrative usam policies separadas sob a mesma engine/ruleset.  
**Rationale**: responsabilidades e deadlines diferem, mas determinismo/autoridade são comuns.  
**Alternatives considered**: um modelo universal ampliaria acoplamento e conhecimento.

## Decision 4 — Generative AI is non-authoritative

**Decision**: geração pode redigir a explicação já decidida; indisponibilidade usa texto determinístico.  
**Rationale**: serviço externo não pode alterar replay.  
**Alternatives considered**: delegar decisão ao modelo foi rejeitado.
