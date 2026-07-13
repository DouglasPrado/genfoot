# Data Model: Crise esportiva

GP-015 não possui entidade autoritativa própria.

- **MatchResult/Standings** (C8/C7): fatos esportivos.
- **ClubGovernance/BoardPromise** (C3): objetivos, resposta e plano.
- **SupporterSatisfaction/Narrative** (C10): percepção derivada.
- **CrisisProjection/HistoryRecord** (C11): diagnóstico/timeline reconstruíveis.
- **AIDecision** (X1): decisão, razões, alternativas, confiança e input hash.

Estados projetados: `STABLE → AT_RISK → CRISIS → RECOVERING → RESOLVED`; transições por eventos/ruleset, sem escrita cruzada.
