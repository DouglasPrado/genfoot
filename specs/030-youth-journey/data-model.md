# Data Model: Jornada de um jovem

- **YouthClass** (C4): mundo, temporada, seed/contexto, status e membros.
- **Player/Person** (C4): identidade, nascimento, origem e regraset de geração.
- **PlayerDevelopment** (C4): potencial funcional, evidência, cap e histórico.
- **AcademySlot/SquadMembership** (C3): projeção de academia/elenco.
- **StaffCapability** (C5): leitura que modula avaliação/desenvolvimento.
- **PlayerContract** (C6): primeiro vínculo profissional.

Estados: `GENERATED → ACADEMY → PROMOTED → PROFESSIONAL|LOANED|RELEASED`; carreira continua no owner C4. Chaves por mundo/temporada, origem única e `commandId`.
