# Checklists executáveis de saída M0–M4

Itens permanecem desmarcados até uma observation válida preencher o slot. Missing/stale/FAIL bloqueia a saída; marcar manualmente sem evidence ID é inválido.

## M0 — Fundação executável

**Outcome**: Kernel, gênese, relógio e scheduler reproduzíveis com snapshots versionados.  
**Features**: FND-001  
**Execução**: `pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build` mais smoke CLI determinístico.

### Entry

- [ ] M0-ENTRY-01 Baseline técnica ratificada e workspace Node.js 22/PNPM 10 disponível.
- [ ] M0-ENTRY-02 Fonte do domínio, shared kernel e simulator CLI presentes no monorepo.

### Exit criteria

- [ ] M0-EC-01 IDs tipados, data lógica, ruleset, Result/erros e eventos possuem contratos estáveis.
- [ ] M0-EC-02 PCG32 reproduz o golden vector e o mesmo seed/ruleset produz o mesmo estado.
- [ ] M0-EC-03 Um mundo pode ser criado, receber gênese, ser ativado e avançar dias pelo CLI.
- [ ] M0-EC-04 Snapshots possuem versão, escrita atômica e leitura compatível com versões suportadas.
- [ ] M0-EC-05 Scheduler prova ordenação determinística, lease/fencing, retry, cancelamento e idempotência.
- [ ] M0-EC-06 Gates locais de formato, lint, tipos, testes e build terminam com código zero.

### Blocking evidence

- [ ] M0-TEST-WORKSPACE `TEST` prova M0-EC-01, M0-EC-02, M0-EC-04, M0-EC-05.
- [ ] M0-BUILD-WORKSPACE `BUILD` prova M0-EC-06.
- [ ] M0-TRACE-CLI `TRACE` prova M0-EC-03; requer rulesetVersion, seedSet.
- [ ] M0-REVIEW-SNAPSHOT-COMPAT `REVIEW` prova M0-EC-04.

### Integrity and promotion

- [ ] M0-INTEGRITY Todos os artifacts possuem hash, commit, observedAt, owner e candidate metadata coerentes.
- [ ] M0-DECISION Review registra decisão PASS e referencia todos os Evidence IDs; nenhuma ausência foi tratada como verde.
- [ ] M0-ROLLBACK Plano verificado: Não descongelar a fundação; restaurar último snapshot/contract version verde e corrigir em nova alteração.

**Próximo marco**: Todos os slots M0 estão PASS e o contrato da fundação foi congelado.

---

## M1 — Temporada headless

**Outcome**: O universo disputa, encerra e reinicia temporadas completas e calibráveis sem cliente.  
**Features**: BC-002, BC-003, BC-004, BC-005, BC-006, BC-007, BC-008, BC-009, X-001, VAL-001  
**Execução**: Executar suites de invariantes/replay e manifests R-34/R-88/20 temporadas definidos por VAL-001.

### Entry

- [ ] M1-ENTRY-01 M0 promovido e seus contratos públicos congelados.
- [ ] M1-ENTRY-02 Ownership de Mundo, Clube, Jogador, Staff, Mercado, Competição, Partida e Economia declarado.
- [ ] M1-ENTRY-03 A fatia de contratos/eventos/sagas de X-002 necessária ao headless está congelada.

### Exit criteria

- [ ] M1-EC-01 Um mundo executa ao menos 20 temporadas, incluindo homologação e rollover, sem corrupção de estado.
- [ ] M1-EC-02 O mesmo seed, ruleset e stream de comandos reproduz hashes idênticos em simulação e replay.
- [ ] M1-EC-03 Competições, classificação, elegibilidade, lifecycle, demografia e contratos permanecem íntegros.
- [ ] M1-EC-04 Ledger conserva valor, registra faucets/sinks e fecha com residual zero.
- [ ] M1-EC-05 Partida automática, live, offline, lote e replay usam um único kernel autoritativo.
- [ ] M1-EC-06 IA usa os mesmos commands e informações permitidos ao gestor e gera explicação reproduzível.
- [ ] M1-EC-07 Lotes R-34/R-88 e extensões longas atendem INV, BS, BE e BD aplicáveis.
- [ ] M1-EC-08 Todos os critérios aplicáveis de G1–G7 estão PASS para o ruleset candidato.

### Blocking evidence

- [ ] M1-TEST-INVARIANTS `TEST` prova M1-EC-03, M1-EC-04, M1-EC-05.
- [ ] M1-REPORT-20-SEASONS `REPORT` prova M1-EC-01, M1-EC-03, M1-EC-04; requer rulesetVersion, seedSet.
- [ ] M1-TRACE-GOLDEN-REPLAY `TRACE` prova M1-EC-02, M1-EC-05; requer rulesetVersion, seedSet.
- [ ] M1-REPORT-AI-EXPLANATIONS `REPORT` prova M1-EC-06; requer rulesetVersion, seedSet.
- [ ] M1-REPORT-R34-R88 `REPORT` prova M1-EC-07; requer rulesetVersion, seedSet.
- [ ] M1-REVIEW-G1-G7 `REVIEW` prova M1-EC-08; requer rulesetVersion.

### Integrity and promotion

- [ ] M1-INTEGRITY Todos os artifacts possuem hash, commit, observedAt, owner e candidate metadata coerentes.
- [ ] M1-DECISION Review registra decisão PASS e referencia todos os Evidence IDs; nenhuma ausência foi tratada como verde.
- [ ] M1-ROLLBACK Plano verificado: Manter ruleset anterior; não iniciar integração autoritativa M2 e superseder evidence falha após correção/reexecução.

**Próximo marco**: M1 está integralmente PASS e os contracts de domínio/eventos consumidos pelo backend foram congelados.

---

## M2 — Backend multiplayer

**Outcome**: Persistência, integrações duráveis e operação autoritativa fecham os fluxos sem depender dos clientes.  
**Features**: X-002, BC-001, BC-010, BC-011, BC-012  
**Execução**: Executar migrations, eventing/saga recovery, identity concurrency, projection rebuild e security/admin suites.

### Entry

- [ ] M2-ENTRY-01 M1 promovido para um ruleset candidato reproduzível.
- [ ] M2-ENTRY-02 Commands, queries, eventos, erros e ownership dos contextos headless estão congelados.
- [ ] M2-ENTRY-03 Estratégia expand-contract, isolamento por mundo e constraints físicas foram revisados.

### Exit criteria

- [ ] M2-EC-01 PostgreSQL é a fonte autoritativa, com migrations reversíveis/compatíveis e constraints de integridade.
- [ ] M2-EC-02 Outbox/Inbox/DLQ, ordering, replay e projeções provam entrega at-least-once sem efeitos duplicados.
- [ ] M2-EC-03 Sagas de onboarding, mercado, rollover, infraestrutura e saída retomam de checkpoints e compensam falhas.
- [ ] M2-EC-04 Conta, sessão, participação e controle de clube resistem a concorrência, cooldown e duplicidade.
- [ ] M2-EC-05 Narrativa, notificações, relatórios e memória são reconstruíveis a partir de fatos oficiais.
- [ ] M2-EC-06 Anti-abuso, correções, sanções, recursos, suporte e reprocesso preservam trilha de auditoria.
- [ ] M2-EC-07 Os 16 golden paths possuem cenário headless/contratual executável até a fronteira de cliente.

### Blocking evidence

- [ ] M2-MIGRATION-DATABASE `MIGRATION` prova M2-EC-01.
- [ ] M2-TEST-EVENTING `TEST` prova M2-EC-02.
- [ ] M2-TRACE-SAGA-RECOVERY `TRACE` prova M2-EC-03; requer rulesetVersion, seedSet.
- [ ] M2-TEST-IDENTITY-CONCURRENCY `TEST` prova M2-EC-04.
- [ ] M2-TEST-REBUILD-PROJECTIONS `TEST` prova M2-EC-05.
- [ ] M2-SECURITY-ADMIN-AUDIT `SECURITY_TEST` prova M2-EC-06.
- [ ] M2-REPORT-GOLDEN-PATH-CONTRACTS `REPORT` prova M2-EC-07.

### Integrity and promotion

- [ ] M2-INTEGRITY Todos os artifacts possuem hash, commit, observedAt, owner e candidate metadata coerentes.
- [ ] M2-DECISION Review registra decisão PASS e referencia todos os Evidence IDs; nenhuma ausência foi tratada como verde.
- [ ] M2-ROLLBACK Plano verificado: Manter backend em ambiente não promovido/read-only; reverter adapter/migration por expand-contract ou forward-fix sem apagar fatos.

**Próximo marco**: M2 está PASS e contratos comuns de cliente, sequência realtime e política offline foram congelados.

---

## M3 — MVP jogável

**Outcome**: Mobile e admin concluem os 16 golden paths sobre contratos oficiais e não autoritativos.  
**Features**: X-003, GP-001, GP-002, GP-003, GP-004, GP-005, GP-006, GP-007, GP-008, GP-009, GP-010, GP-011, GP-012, GP-013, GP-014, GP-015, GP-016  
**Execução**: Executar GP-001…GP-016 E2E, matrix de 138 telas, realtime/offline e accessibility builds/tests.

### Entry

- [ ] M3-ENTRY-01 M2 promovido e APIs/contratos comuns versionados e congelados.
- [ ] M3-ENTRY-02 Design system, matriz de 138 telas e critérios de acessibilidade rastreados.
- [ ] M3-ENTRY-03 Whitelist offline e protocolo de recuperação de duplicata/gap aprovados.

### Exit criteria

- [ ] M3-EC-01 GP-001…GP-016 passam ponta a ponta nos clientes contra o backend autoritativo.
- [ ] M3-EC-02 Clientes não calculam nem persistem estado oficial e ações irreversíveis não entram na fila offline.
- [ ] M3-EC-03 Realtime detecta duplicatas e gaps, recupera snapshot/projeção e retoma a sequência.
- [ ] M3-EC-04 Telas aplicáveis cobrem loading, empty, error, blocked, offline e recuperação.
- [ ] M3-EC-05 Fluxos críticos passam critérios de acessibilidade em mobile e admin.
- [ ] M3-EC-06 Builds reproduzíveis dos clientes e backend são produzidos para a release candidata.

### Blocking evidence

- [ ] M3-TEST-GP-E2E `TEST` prova M3-EC-01; requer rulesetVersion, seedSet.
- [ ] M3-REVIEW-NON-AUTHORITATIVE `REVIEW` prova M3-EC-02.
- [ ] M3-TRACE-REALTIME-RECOVERY `TRACE` prova M3-EC-03.
- [ ] M3-REPORT-SCREEN-STATES `REPORT` prova M3-EC-04.
- [ ] M3-TEST-ACCESSIBILITY `TEST` prova M3-EC-05.
- [ ] M3-BUILD-RELEASE `BUILD` prova M3-EC-06.

### Integrity and promotion

- [ ] M3-INTEGRITY Todos os artifacts possuem hash, commit, observedAt, owner e candidate metadata coerentes.
- [ ] M3-DECISION Review registra decisão PASS e referencia todos os Evidence IDs; nenhuma ausência foi tratada como verde.
- [ ] M3-ROLLBACK Plano verificado: Não publicar release aos usuários; manter clientes/backend anteriores e invalidar artifacts/cache do candidato.

**Próximo marco**: M3 está PASS e a release candidata foi congelada para carga, segurança e gameday.

---

## M4 — Produção

**Outcome**: Release segura, observável, recuperável e promovida com G1–G8 simultaneamente verdes.  
**Features**: OPS-001  
**Execução**: Executar load/soak, security/privacy, restore/DR e deploy/rollback gamedays para a mesma release/ruleset.

### Entry

- [ ] M4-ENTRY-01 M3 promovido e release/ruleset candidatos imutáveis durante a validação.
- [ ] M4-ENTRY-02 SLOs, RPO/RTO, capacidade, privacidade, backup, rollback e runbooks aprovados como critérios.
- [ ] M4-ENTRY-03 Ambiente de carga e restore isolado representa a topologia de produção.

### Exit criteria

- [ ] M4-EC-01 G1–G8 estão simultaneamente PASS para a mesma release e ruleset.
- [ ] M4-EC-02 Carga e soak atendem SLOs e limites de capacidade sem violar isolamento ou integridade.
- [ ] M4-EC-03 Testes de segurança e privacidade não possuem achado bloqueante aberto.
- [ ] M4-EC-04 Restore isolado e exercício regional medem RPO/RTO dentro dos objetivos aprovados.
- [ ] M4-EC-05 Deploy, rollback, observabilidade, alertas e runbooks são exercitados em gameday.
- [ ] M4-EC-06 A decisão go/no-go referencia todas as evidências, owners e exceções com prazo.

### Blocking evidence

- [ ] M4-REVIEW-G1-G8 `REVIEW` prova M4-EC-01; requer rulesetVersion.
- [ ] M4-LOAD-SOAK `LOAD_TEST` prova M4-EC-02; requer rulesetVersion, seedSet.
- [ ] M4-SECURITY-PRIVACY `SECURITY_TEST` prova M4-EC-03.
- [ ] M4-GAMEDAY-RESTORE-DR `GAMEDAY` prova M4-EC-04.
- [ ] M4-GAMEDAY-DEPLOY-ROLLBACK `GAMEDAY` prova M4-EC-05.
- [ ] M4-REPORT-GO-NO-GO `REPORT` prova M4-EC-06.

### Integrity and promotion

- [ ] M4-INTEGRITY Todos os artifacts possuem hash, commit, observedAt, owner e candidate metadata coerentes.
- [ ] M4-DECISION Review registra decisão PASS e referencia todos os Evidence IDs; nenhuma ausência foi tratada como verde.
- [ ] M4-ROLLBACK Plano verificado: NO-GO ou rollback/forward-fix exercitado; ativar kill switch/read-only quando integridade estiver em risco.

**Próximo marco**: Não há marco posterior; PASS autoriza promoção, FAIL ou ausência mantém NO-GO.

---
