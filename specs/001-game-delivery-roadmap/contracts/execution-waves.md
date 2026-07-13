# Ondas topológicas de execução

**Version**: 1.0.0  
**Baseline**: 2026-07-13  
**Sources**: [feature-index.yaml](feature-index.yaml), [dependency-graph.yaml](dependency-graph.yaml), [milestones.yaml](milestones.yaml)

As ondas indicam a primeira sequência segura de conclusão. Uma feature pode começar antes apenas quando todas as arestas `CONTRACT_ONLY` consumidas estiverem congeladas; ela nunca pode ser concluída antes das predecessoras `FINISHES_AFTER`. Gates de marco podem atrasar uma feature além do nível mínimo do DAG.

## W0 — Fundação congelada

**Features**: FND-001.  
**Start**: baseline e workspace disponíveis.  
**Finish**: M0 PASS e contracts de kernel/simulator FROZEN.

## W1 — Tempo e mundo

**Features**: BC-002.  
**Start**: FND-001 concluída.  
**Finish**: relógio, janelas, temporadas, scheduler e rollover contracts congelados para consumidores.

## W2 — Owners primários e integração

**Features**: BC-003, BC-004, X-002.  
**Start**: contratos de mundo congelados; lanes isolam Clube, Jogador e Eventing.  
**Finish**: aggregates/commands/eventos de clube e jogador congelados; saga/event envelope mínimo disponível.

## W3 — Staff, competição e ledger

**Features**: BC-005, BC-007, BC-009.  
**Start**: contracts de C2/C3 e fundação disponíveis.  
**Finish**: capacidade de staff, calendário/inscrição/homologação e reserva/liquidação/ledger congelados.

## W4 — Mercado e partida

**Features**: BC-006, BC-008.  
**Start**: ledger e saga kernel executáveis; players/clubs/staff/competition contracts congelados.  
**Finish**: SAGA-01/SAGA-05 e runtime único passam invariantes/replay.

## W5 — Automação

**Features**: X-001.  
**Start**: commands/queries C3–C9 congelados.  
**Finish**: Strategic/Squad/Match/Narrative AI emitem apenas commands normais e decisões reproduzíveis.

## W6 — Validação headless e narrativa

**Features**: VAL-001, BC-010.  
**Start**: núcleo headless completo; fatos oficiais esportivos/econômicos disponíveis.  
**Finish**: M1 PASS com lotes/replay e C10 fact-driven validada.

## W7 — Identidade e memória

**Features**: BC-001, BC-011.  
**Start**: VAL-001 libera backend; contracts de automação/eventing/narrativa congelados.  
**Finish**: controle concorrente/sessões e projeções/rebuild passam evidência M2.

## W8 — Anti-abuso e administração

**Features**: BC-012.  
**Start**: identidade, ledger, histórico e DLQ/replay operacionais.  
**Finish**: RBAC/SoD, sanctions/appeals, correction commands, hash-chain e reprocessamento verdes; M2 promovível.

## W9 — Clientes comuns

**Features**: X-003.  
**Start**: M2 PASS; commands/queries/events/errors e recovery protocol congelados.  
**Finish**: Expo/admin, 138 telas, offline whitelist, realtime e acessibilidade prontos para convergência.

## W10 — Golden paths

**Features**: GP-001…GP-016.  
**Start**: X-003 e todas as capacidades participantes concluídas. Algumas fixtures headless podem existir antes, mas a feature vertical só conclui aqui.  
**Finish**: 16 fluxos E2E verdes e M3 PASS para a mesma release/ruleset.

## W11 — Produção

**Features**: OPS-001.  
**Start**: M3 promovido e release congelada. O DAG estrutural permitiria OPS junto a parte de W10, mas o gate de marco bloqueia a promoção operacional.  
**Finish**: carga, segurança, privacidade, restore/DR, deploy/rollback e G1–G8 PASS; decisão GO.

## Regras de avanço

1. `wave(feature) > wave(prerequisite)` para toda aresta explícita.
2. `CONTRACT_ONLY` libera apenas trabalho baseado em contrato versionado; não libera integração final.
3. Uma wave só fecha quando evidências bloqueantes estão PASS; missing/stale equivale a FAIL.
4. Trabalho em wave posterior pode preparar fixtures/protótipos, mas não reivindica status concluído.
5. M0–M4 têm precedência sobre o menor nível matemático do DAG.
