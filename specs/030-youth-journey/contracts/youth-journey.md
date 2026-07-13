# Contract: jornada de jovem v1

**Commands**: `GenerateYouthClass`, `AssignYouthPlan`, `PromoteYouthPlayer`, `OfferFirstContract`, `ReleaseYouthPlayer`.  
**Queries**: `GetYouthClass`, `GetYouthAssessment`, `GetYouthDevelopmentHistory`.  
**Events**: `YouthClassGenerated`, `YouthPlayerPromoted`, `YouthPlanUpdated`, `FirstContractSigned`, `YouthPlayerReleased`.  
**Errors**: `YOUTH_CLASS_ALREADY_GENERATED`, `ACADEMY_FULL`, `AGE_RESTRICTION`, `POTENTIAL_CAP_REACHED`, `INVALID_YOUTH_LINK`.

Clientes e IA recebem avaliações, nunca potencial real. Todos os envelopes incluem mundo, ruleset e idempotency key.
