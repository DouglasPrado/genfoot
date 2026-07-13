# Checklist reutilizável de conclusão

Use por feature/release. `[ ]` aplicável bloqueia conclusão; N/A exige justificativa.

## Domínio e contratos

- [ ] FR/SC/CA aplicáveis rastreados e verdes.
- [ ] Ownership único e isolamento por mundo comprovados.
- [ ] Commands, queries, eventos e erros versionados por contrato.
- [ ] Retry, concorrência, idempotência e compensação testados.
- [ ] Histórico/ruleset/replay compatíveis com versões anteriores.

## Testes e determinismo

- [ ] Unitários, propriedades, invariantes e contratos verdes.
- [ ] Integração/E2E do escopo verde.
- [ ] Seed set, ruleset e resultHash registrados quando aplicáveis.
- [ ] R-34/R-88 e BS/BE/BD verdes quando aplicáveis.
- [ ] Zero INV-1…INV-37 violada.

## Dados

- [ ] Migrations expand/contract e rollback/forward-fix testados.
- [ ] DB-01…DB-16 aplicáveis têm enforcement real.
- [ ] Backup/restore protege a mudança.
- [ ] Projeções podem ser reconstruídas sem virar fonte oficial.

## Produto e operação

- [ ] Loading/empty/error/blocked/offline/stale cobertos.
- [ ] Acessibilidade e prevenção de erro crítico verificadas.
- [ ] Segurança, privacidade, RBAC e auditoria aprovados.
- [ ] Carga/soak, SLO, observabilidade e alertas aprovados.
- [ ] Restore, DR, deploy e rollback exercitados quando release/M4.

## Evidência

- [ ] Registry possui observation para todo slot bloqueante.
- [ ] Artefatos/hashes/commit/ambiente/comandos são reproduzíveis.
- [ ] Nenhuma observation está stale.
- [ ] Resultado agregado e G1–G8 foram calculados sem média.
- [ ] Reviewer/owner registraram go/no-go e pendências.

**Conclusão**: somente todos os itens aplicáveis verdes permitem DELIVERED/promoção.
