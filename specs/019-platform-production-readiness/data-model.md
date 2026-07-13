# Data model: plataforma e produção

| Entity             | Fields                                                    | Rules                |
| ------------------ | --------------------------------------------------------- | -------------------- |
| SLO                | service, SLI, target, window, budget, owner               | versionado           |
| AlertRule          | SLO, threshold, severity, runbook, owner                  | testada              |
| Incident           | severity, timeline, impact, worlds, status                | append-only timeline |
| Deployment         | release, environment, strategy, status, evidence          | progressivo          |
| MigrationExecution | version, phase, compatibility, status                     | expand-contract      |
| BackupSet          | classes, createdAt, location, hash, encryption, retention | imutável             |
| RestoreExercise    | backup, isolatedTarget, observedRPO/RTO, checks           | gameday real         |
| DRExercise         | scenario, timeline, dataGap, RPO/RTO, result              | regional             |
| CapacityReport     | release, topology, profile, metrics, cost, result         | load/soak            |
| ReleasePromotion   | release, ruleset, G1…G8, evidenceSet, decision            | conjunção            |

```text
Deployment: PLANNED -> CANARY -> ROLLING_OUT -> COMPLETE | ROLLED_BACK | FAILED
Incident: DETECTED -> TRIAGED -> MITIGATED -> RESOLVED -> REVIEWED
Promotion: CANDIDATE -> GO | NO_GO
```
