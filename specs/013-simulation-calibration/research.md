# Research: simulação e calibração

## Decision 1 — Manifesto content-addressed

**Decision**: commit, ruleset, seeds, cenários, streams e toolchain formam manifest imutável com digest.  
**Rationale**: impede mistura de candidatos.  
**Alternatives considered**: flags soltas e “latest” foram rejeitados.

## Decision 2 — Shards determinísticos

**Decision**: shard é partição explícita do seed manifest; resume registra exatamente cada seed concluída.  
**Rationale**: paralelismo sem viés/duplicação.  
**Alternatives considered**: fila aleatória sem manifest foi rejeitada.

## Decision 3 — Bruto e agregado

**Decision**: preservar observações por seed e derivar relatórios agregados reproduzíveis.  
**Rationale**: médias não podem esconder invariantes/outliers.  
**Alternatives considered**: guardar só percentis foi rejeitado.

## Decision 4 — Gate fail-closed

**Decision**: ausente, stale, incompatível ou FAIL resulta NO-GO.  
**Rationale**: gate absoluto ratificado.  
**Alternatives considered**: score ponderado e waiver informal foram rejeitados.
