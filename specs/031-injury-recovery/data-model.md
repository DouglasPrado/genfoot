# Data Model: Lesão e recuperação

- **PlayerInjury** (C4): ocorrência, tipo, gravidade, estado, diagnóstico, ruleset.
- **MedicalPlan** (C4): fases, carga, datas lógicas e responsável.
- **MedicalPhaseCheckpoint** (C4): chave idempotente, estado e evidência.
- **PlayerAvailability** (C4): projeção autoritativa para treino/partida.
- **StaffCapability** (C5): leitura de capacidade médica.
- **MatchInjuryOccurrence** (C8): evento causal imutável.

Estados: `OCCURRED → DIAGNOSED → TREATING → REHABILITATING → RETURN_TEST → CLEARED`; recaída volta por transição explícita, nunca edição histórica.
