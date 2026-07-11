# Catálogo de Commands

> **Status:** Rascunho consolidado · **Fontes:** docs/02-tecnico/08-frontend-cliente-e-tempo-real.md (envelope de command), docs/04-ui-ux/ (ações referenciadas nos fluxos) · **Revisão:** 2026-07-11

Este documento é o **catálogo canônico de commands** do **Grinta** — os nomes das ações que um cliente (app do jogador em Expo ou admin em Next.js) envia à API oficial. Ele existe porque os fluxos de UI em [`../04-ui-ux/`](../04-ui-ux/) referenciam commands por nome (ex.: `SignTransfer`, `RenewContract`), mas o contrato técnico define apenas o **envelope genérico** — sem enumerar os nomes. Aqui os nomes ganham um lar único.

> **Escopo:** este catálogo fixa **nomes, intenção e contrato** de cada command — **payload** (campos de entrada, tipados conforme o [Modelo de Dados](./02-modelo-de-dados.md)), **pré-condições/validações**, **errorCodes**, **eventos de domínio emitidos** e **idempotência/concorrência**. Os valores de balanceamento que um contrato pressupõe (prazos, faixas plausíveis, limites) ficam em [Catálogo de Regras e Fórmulas](./05-catalogo-de-regras-e-formulas.md); quando ainda não ratificados, aparecem aqui como `> **Recomendação (a ratificar — R-2x)`.

## Sumário

- [Envelope e convenção](#envelope-e-convenção)
- [Convenção de contrato](#convenção-de-contrato)
- [Commands por domínio](#commands-por-domínio)
  - [Conta e vínculo de clube](#conta-e-vínculo-de-clube)
  - [Elenco, tática e partida](#elenco-tática-e-partida)
  - [Treino, base e médico](#treino-base-e-médico)
  - [Mercado e contratos](#mercado-e-contratos)
  - [Estrutura, estádio e finanças](#estrutura-estádio-e-finanças)
  - [Diretoria, comunicação e automação](#diretoria-comunicação-e-automação)
  - [Loja, identidade e suporte](#loja-identidade-e-suporte)
  - [Admin (mundo)](#admin-mundo)
- [Recomendações a ratificar (R-25 a R-29)](#recomendações-a-ratificar-r-25-a-r-29)
- [Apêndice: errorCodes](#apêndice-errorcodes)

---

## Envelope e convenção

Todo command trafega no **envelope genérico** definido em [`./08-frontend-cliente-e-tempo-real.md`](./08-frontend-cliente-e-tempo-real.md#api-e-contratos):

```
Command {
  commandId          // id único (idempotência por resultado)
  idempotencyKey     // uma execução lógica por chave
  expectedVersion    // versão esperada do agregado (concorrência otimista)
  gameWorldId
  clubId
  commandType        // <-- o NOME do command deste catálogo
  payload            // dados específicos do command (por command)
  clientTimestamp
  clientVersion
}
```

**Convenção de nome (`commandType`):** **VerbNoun em PascalCase**, no imperativo, do ponto de vista do usuário (ex.: `RenewContract`, `SetLineup`). O servidor é autoritativo: **um command pode ser rejeitado** (`REJECTED`/`CONFLICT`) independentemente do que a UI exibia (ver o modelo de cliente não-autoritativo no doc 08). Commands de **alto risco** exigem confirmação reforçada/aprovação (ver [09-operacao-e-admin-do-mundo](./09-operacao-e-admin-do-mundo.md) e a matriz de ações da [plataforma](./04-plataforma-seguranca-operacoes.md)).

> Os commands marcados com ✔ são **referenciados explicitamente** nos fluxos de UI (`../04-ui-ux/`); os demais são **derivados das ações documentadas** nesses fluxos e nos docs de game-design, e ficam sujeitos a confirmação.

## Convenção de contrato

Cada command abaixo é especificado com os mesmos cinco campos:

- **Payload** — campos **específicos** do command. `gameWorldId`, `clubId`, `commandId`, `idempotencyKey`, `expectedVersion`, `clientTimestamp` e `clientVersion` viajam **no envelope** (ver acima) e **não** se repetem no payload; ele lista só o que é próprio do command. Tipos seguem o [Modelo de Dados](./02-modelo-de-dados.md): `UUID` = `String @db.Uuid` (UUIDv7); dinheiro = objeto **`Money { amountMinor: BigInt, currencyId: UUID }`** (proibido `Float`/`Decimal` para caixa); enums referenciam os do §2 do modelo.
- **Pré-condições** — o que o **servidor** verifica antes de aplicar (autoridade, janela, orçamento, elegibilidade, invariantes). O cliente é não-autoritativo: mesmo que a UI mostre o botão ativo, o command **pode ser rejeitado** (doc 08).
- **errorCodes** — códigos **estáveis** possíveis, além dos comuns (abaixo). Reutilizam os de [doc 08](./08-frontend-cliente-e-tempo-real.md) e do [Apêndice: errorCodes](#apêndice-errorcodes).
- **Eventos** — eventos de domínio (`DomainEvent`, PascalCase no passado) emitidos no sucesso, publicados no stream WS (doc 08) pela `worldSequence`/`clubSequence`/`matchSequence` aplicável.
- **Idempotência/concorrência** — agregado principal (para lock e `expectedVersion`) e como o reenvio é neutralizado.

**Comuns a todos os commands** (não repetidos por command):

- **errorCodes comuns:** `WORLD_READ_ONLY` (mundo em manutenção/arquivado), `FORBIDDEN_NOT_CONTROLLER` (o ator não controla o `clubId` alvo), `AGGREGATE_VERSION_CONFLICT` (status `CONFLICT`: `expectedVersion` ≠ versão atual — a resposta traz `currentVersion`), `IDEMPOTENCY_KEY_REUSED` (mesma `idempotencyKey` com payload divergente), `VALIDATION_FAILED` (payload malformado; detalhado em `fieldErrors`), `COMMAND_CONTRACT_INCOMPATIBLE` (cliente com contrato `BREAKING`).
- **Idempotência comum:** `commandId` único (`CommandExecution.unique(commandId)`) devolve o resultado anterior sem reexecutar; `unique(actorId, idempotencyKey)` garante uma execução lógica. Toda mutação registra `DomainEvent` com `aggregateVersion` (concorrência otimista por agregado).
- **Risco:** cada command traz um selo **Risco: baixo | médio | alto**. **Alto** exige `HighRiskConfirm` (dupla confirmação) no cliente e, quando indicado, entra na matriz de aprovação da plataforma ([doc 04](./04-plataforma-seguranca-operacoes.md) · [doc 09](./09-operacao-e-admin-do-mundo.md)).

`✔` = referenciado explicitamente nos fluxos MF-* ([`../04-ui-ux/02-mobile-fluxos.md`](../04-ui-ux/02-mobile-fluxos.md)).

## Commands por domínio

### Conta e vínculo de clube

Agregado de fundo: **`WorldEntryProcess` / `ClubEntryReservation` / `ClubControl`** (§6.3.11 e §3.2). Nestes commands o `clubId` do envelope pode estar **vazio** até a reserva (o ator ainda não controla clube algum).

#### `ReserveClubSlot` ✔ · Risco: médio · fluxos: MF-01
- **Payload:** `{ targetClubId?: UUID, createNew?: boolean, regionId?: UUID, expansionConfig?: { name, shortName, city, colors }, initialStakeAcknowledged: boolean }` — `targetClubId` (assumir) **ou** `createNew`+`regionId`/`expansionConfig` (criar). O **aporte inicial é fixo** (igualdade competitiva), não é campo de valor livre.
- **Pré-condições:** mundo `ACTIVE` e com vaga (`maxClubs`); ator elegível (sem cooldown, sem conta relacionada bloqueada, sem outro clube ativo no mundo — invariante "1 clube ativo por participante/mundo"); clube alvo disponível (não `BOT_RESERVED` por terceiro, não recém-abandonado por conta relacionada). Cria **reserva com prazo curto** (TTL — ver R-25).
- **errorCodes:** `CLUB_SLOT_UNAVAILABLE`, `ENTRY_ELIGIBILITY_DENIED`, `ACCOUNT_COOLDOWN_ACTIVE`, `RELATED_ACCOUNT_BLOCKED`, `CLUB_ALREADY_CONTROLLED`, `WORLD_ENTRY_QUOTA_EXCEEDED`.
- **Eventos:** `ClubSlotReserved` (+ `ClubEntryReservationOpened`); em criação, `ClubExpansionRequested`.
- **Idempotência/concorrência:** agregado `WorldEntryProcess` do ator; `expectedVersion` do processo de entrada. Reenvio devolve a mesma reserva (não abre duas).

#### `ActivateClubControl` ✔ · Risco: alto · fluxos: MF-01
- **Payload:** `{ reservationId: UUID, acceptInheritedState: boolean }` — confirma assumir o clube **com todo o estado herdado** (dívidas, contratos, promessas).
- **Pré-condições:** reserva válida e **não expirada** do ator; data de ativação válida (clube novo entra em divisão de expansão + pré-temporada; clube assumido preserva estado); nenhum `ClubControl` ativo concorrente (índice único parcial "1 controle ativo por clube"); clube assumido "forte" pode exigir **auditoria de contexto** (resposta `ACCEPTED` + tarefa de revisão, não `COMPLETED` imediato).
- **errorCodes:** `CLUB_SLOT_RESERVATION_EXPIRED`, `CLUB_ALREADY_CONTROLLED`, `CONTROL_ACTIVATION_WINDOW_INVALID`, `TAKEOVER_REVIEW_REQUIRED`.
- **Eventos:** `ClubControlActivated` (+ `ClubOnboardingStarted`); clube novo: `ClubCreated`.
- **Idempotência/concorrência:** agregado `ClubControl`; `expectedVersion` da reserva. `commandId` repetido não cria segundo controle.

#### `LeaveClub` ✔ · Risco: alto · fluxos: MF-03
- **Payload:** `{ confirmationText: string, acknowledgeAiTakeover: boolean }` — dupla confirmação (`HighRiskConfirm`); o clube **mantém tudo** e a IA assume.
- **Pré-condições:** ator controla o `clubId`; **auditoria antiabuso** de ações recentes (abandono com destruição proposital de elenco é bloqueado); preferência por troca entre temporadas. Aplica **cooldown / restrição de negociação** com o clube antigo (duração — ver R-26).
- **errorCodes:** `LEAVE_BLOCKED_ASSET_STRIPPING`, `ANTI_ABUSE_QUARANTINE`.
- **Eventos:** `ClubLeft` (+ `ClubControlEnded`, `AiControlAssumed`, `AccountCooldownStarted`).
- **Idempotência/concorrência:** agregado `ClubControl`; `expectedVersion` do controle ativo. Segundo envio retorna o resultado (não reabre o vínculo).

#### `CreateClub` · Risco: médio · fluxos: MF-01 (ramo criar)
- **Nota:** materialização do ramo "criar" de `ReserveClubSlot`. Quando a UI separa a criação da reserva, este command persiste a configuração de expansão antes da reserva.
- **Payload:** `{ name, shortName, regionId: UUID, city, colors, crestAssetId?: UUID }`.
- **Pré-condições:** liga de expansão aberta no mundo; nome/slug únicos por mundo (`@@unique([gameWorldId, slug])`); região válida.
- **errorCodes:** `CLUB_SLUG_TAKEN`, `EXPANSION_LEAGUE_CLOSED`, `INVALID_REGION`.
- **Eventos:** `ClubCreated` (+ `ExpansionClubConfigured`).
- **Idempotência/concorrência:** agregado `ClubExpansionProject`; idempotente por `idempotencyKey` (slug único também protege).

### Elenco, tática e partida

Commands de **preparação** (`SetTactics`/`SetLineup`/`SetGamePlan`) mutam agregados versionados (`MatchTacticalPlan`/`MatchLineup`) e usam `expectedVersion`. Commands **ao vivo** (`SubmitMatchDecision` e suas formas) são gated pela **janela do runtime** (`MatchRuntime`, 1 ativo por partida) e ordenados por `matchSequence` — **não** por `expectedVersion`.

#### `SetTactics` ✔ · Risco: baixo · fluxos: MF-04, MF-07, MF-15
- **Payload:** `{ matchId?: UUID, formation: string, mentality: TacticalMentality, pressing: PressingIntensity, marking: MarkingStyle, tempo: TempoStyle, roles: [{ playerId: UUID, tacticalRole: string, individualInstructions?: Json }], setPieceTakers?: Json }` — sem `matchId` define a tática **padrão** do clube; com `matchId` a tática daquela partida (antes do lock).
- **Pré-condições:** ator controla o clube; formação válida; `playerId`s pertencem ao elenco; se `matchId`, partida em `SCHEDULED`/`PRE_MATCH` (não passou o lock).
- **errorCodes:** `LINEUP_LOCKED`, `PLAYER_NOT_IN_SQUAD`, `INVALID_FORMATION`.
- **Eventos:** `TacticsSet` (projeção `TACTIC_CHANGED` quando aplicada em partida ao vivo — via `SubmitMatchDecision`).
- **Idempotência/concorrência:** agregado `MatchTacticalPlan` (ou plano tático padrão do clube); `expectedVersion`.

#### `SetLineup` · Risco: baixo · fluxos: MF-05, MF-07
- **Payload:** `{ matchId: UUID, starters: [{ playerId: UUID, position: PlayerPosition, shirtNumber?: Int }], bench: [{ playerId: UUID }], captainId: UUID, penaltyOrder?: [UUID] }`.
- **Pré-condições:** ator controla o clube; 11 titulares em posições válidas; banco dentro do limite do regulamento; jogadores **elegíveis** (inscritos, sem suspensão, aptos fisicamente); partida antes do **lock de pré-jogo**. Ao entrar em campo o servidor **valida elegibilidade** e tenta escalação automática antes de W.O.
- **errorCodes:** `LINEUP_INVALID`, `LINEUP_LOCKED`, `PLAYER_INELIGIBLE_FOR_MATCH`, `PLAYER_ALREADY_REGISTERED` (número de camisa em conflito), `SQUAD_SIZE_LIMIT_EXCEEDED`.
- **Eventos:** `LineupSet`.
- **Idempotência/concorrência:** agregado `MatchLineup`; `expectedVersion`. Reenvio substitui de forma idempotente pela chave.

#### `SetGamePlan` · Risco: médio · fluxos: MF-05, MF-07
- **Payload:** `{ matchId: UUID, autonomyLevel: Int, substitutionTriggers: [{ condition: Json, action: Json }], scenarioResponses: [{ scenario: DecisionPointType, response: Json }], mentalityByScoreState?: Json }` — o **plano automático/offline** da partida (gatilhos de substituição, respostas a cenários, nível de autonomia da IA).
- **Pré-condições:** ator controla o clube; gatilhos referenciam jogadores do banco; **ações de alto risco não são totalmente delegáveis** (rebaixadas a "sugerir"); partida antes do lock.
- **errorCodes:** `GAME_PLAN_INVALID`, `AUTOMATION_HIGH_RISK_NOT_DELEGABLE`, `LINEUP_LOCKED`.
- **Eventos:** `GamePlanSet`.
- **Idempotência/concorrência:** agregado `MatchTacticalPlan`/`MatchRuntimeLease` de delegação; `expectedVersion`.

#### `SubmitMatchDecision` · Risco: baixo · fluxos: MF-07
- **Nota:** command **ao vivo** genérico da tela `M-LIVE`. Cada opção das ações rápidas / submenu / ponto de decisão vira um `SubmitMatchDecision`. As três formas especializadas abaixo (`IssueMatchCommand`, `MakeSubstitution`, `ResolveDecisionPoint`) são `commandType` próprios com o mesmo contrato de janela; um cliente pode enviá-las diretamente ou via este envelope com `decisionKind`.
- **Payload:** `{ matchId: UUID, decisionKind: "QUICK_ACTION" | "SUBSTITUTION" | "DECISION_POINT_RESPONSE" | "TACTICAL_CHANGE", lastKnownMatchSequence: BigInt, action: Json, decisionPointId?: UUID }`.
- **Pré-condições:** ator controla o clube **e** está autorizado a agir (usuário online **ou** IA delegada — `MatchControlSource`); runtime em `LIVE`/`PAUSED_FOR_DECISION`; ação dentro da **janela válida** (senão `MATCH_COMMAND_WINDOW_CLOSED`).
- **errorCodes:** `MATCH_COMMAND_WINDOW_CLOSED`, `MATCH_NOT_LIVE`, `DECISION_POINT_NOT_OPEN`.
- **Eventos:** conforme `decisionKind` — `MatchCommandIssued`/`TacticsSet` (`TACTIC_CHANGED`), `SubstitutionMade` (`SUBSTITUTION_MADE`), `DecisionPointResolved` (`DECISION_POINT_RESOLVED`).
- **Idempotência/concorrência:** agregado `MatchRuntime` (1 runtime ativo por partida); ordenação por `matchSequence`; `commandId` evita substituição/ação duplicada. **Sem `expectedVersion`** (o runtime não é concorrência otimista de agregado de escrita).

#### `IssueMatchCommand` · Risco: baixo · fluxos: MF-07
- **Payload:** `{ matchId: UUID, commandKind: "PRESS" | "DROP_DEEP" | "ATTACK" | "CONTROL" | "MARK_TIGHT" | "COUNTER" | "REST", intensity?: "LIGHT" | "HIGH" | "MAX", targetZone?: string, lastKnownMatchSequence: BigInt }` — mapeia as ações rápidas e submenus de `M-LIVE` (doc 08).
- **Pré-condições:** iguais a `SubmitMatchDecision`; command dentro da janela.
- **errorCodes:** `MATCH_COMMAND_WINDOW_CLOSED`, `MATCH_NOT_LIVE`.
- **Eventos:** `MatchCommandIssued` (projeção `TACTIC_CHANGED`/`MOMENTUM_CHANGED`).
- **Idempotência/concorrência:** agregado `MatchRuntime`; `matchSequence`; `commandId` idempotente.

#### `MakeSubstitution` · Risco: baixo · fluxos: MF-07
- **Payload:** `{ matchId: UUID, playerOutId: UUID, playerInId: UUID, minute: Int, lastKnownMatchSequence: BigInt }`.
- **Pré-condições:** `playerInId` no banco e não usado; `playerOutId` em campo; substituições restantes disponíveis (limite — ver R-29); janela aberta.
- **errorCodes:** `SUBSTITUTIONS_EXHAUSTED`, `PLAYER_NOT_ON_BENCH`, `PLAYER_NOT_ON_PITCH`, `MATCH_COMMAND_WINDOW_CLOSED`.
- **Eventos:** `SubstitutionMade` (`SUBSTITUTION_MADE`).
- **Idempotência/concorrência:** agregado `MatchRuntime`; `commandId` impede substituição dupla.

#### `ResolveDecisionPoint` · Risco: baixo · fluxos: MF-07
- **Payload:** `{ matchId: UUID, decisionPointId: UUID, chosenRecommendationId?: UUID, customAction?: Json, lastKnownMatchSequence: BigInt }`.
- **Pré-condições:** ponto de decisão **aberto** e não resolvido; a escolha referencia uma recomendação daquele ponto ou uma ação custom válida; dentro da janela de resposta (ver R-29).
- **errorCodes:** `DECISION_POINT_NOT_OPEN`, `DECISION_POINT_ALREADY_RESOLVED`, `MATCH_COMMAND_WINDOW_CLOSED`.
- **Eventos:** `DecisionPointResolved` (`DECISION_POINT_RESOLVED`).
- **Idempotência/concorrência:** agregado `MatchDecisionPoint`/`MatchRuntime`; resolução única por ponto (segundo envio devolve o resultado).

### Treino, base e médico

#### `SetTrainingPlan` ✔ · Risco: baixo · fluxos: MF-17, MF-04
- **Payload:** `{ seasonId: UUID, name: string, focus: TrainingFocus, intensity: Int, tacticalStyle?: Json, createdByStaffId?: UUID, entries?: [{ playerId: UUID, focus: TrainingFocus, workload: Int }], startsAt: DateTime, endsAt?: DateTime }` — foco coletivo + planos individuais (`M-TRAINING-INDIV`).
- **Pré-condições:** ator controla o clube; `intensity`/`workload` na escala válida; jogadores pertencem ao elenco; carga coerente com condição/lesão (sobrecarga eleva risco, não bloqueia salvo restrição médica ativa).
- **errorCodes:** `TRAINING_PLAN_INVALID`, `PLAYER_NOT_IN_SQUAD`, `PLAYER_UNDER_MEDICAL_RESTRICTION`.
- **Eventos:** `TrainingPlanSet` (+ `TrainingPlayerEntryUpdated`).
- **Idempotência/concorrência:** agregado `TrainingPlan`; `expectedVersion`.

#### `PromoteYouthPlayer` · Risco: médio · fluxos: MF-11
- **Payload:** `{ playerId: UUID, newContract: { startSeason: Int, endSeason: Int, salaryPerSeason: Money, signingBonus?: Money, roleInSquad?: string }, shirtNumber?: Int }` — profissionalização altera contrato e expectativas.
- **Pré-condições:** jogador é da base do clube e **pronto** (prontidão avaliada); vaga de elenco/registro disponível; orçamento salarial comporta o novo salário.
- **errorCodes:** `YOUTH_PROMOTION_INVALID`, `YOUTH_NOT_READY`, `WAGE_BUDGET_EXCEEDED`, `SQUAD_SIZE_LIMIT_EXCEEDED`.
- **Eventos:** `YouthPlayerPromoted` (+ `ContractSigned`).
- **Idempotência/concorrência:** agregado `Player`; `expectedVersion` do jogador.

#### `SetPlayerCareerPlan` · Risco: baixo · fluxos: MF-11
- **Payload:** `{ playerId: UUID, developmentTrack: string, protectionContract?: boolean, mentoringStaffId?: UUID, targetRole?: string, minutesTarget?: Int }`.
- **Pré-condições:** ator controla o clube; jogador vinculado; mentor válido (staff do clube).
- **errorCodes:** `PLAYER_NOT_IN_SQUAD`, `INVALID_CAREER_PLAN`.
- **Eventos:** `PlayerCareerPlanSet`.
- **Idempotência/concorrência:** agregado `Player`/`PlayerDevelopment`; `expectedVersion`.

#### `SetMedicalPlan` · Risco: médio · fluxos: MF-12
- **Payload:** `{ playerId: UUID, injuryId: UUID, treatmentOption: string, rehabStage?: Int, minutesRestriction?: Int }` — escolha dentro das recomendações médicas; administra minutos/risco de recaída.
- **Pré-condições:** jogador **lesionado** (`PlayerInjury` ativa); tratamento entre os recomendados pela comissão médica; estágio de reabilitação coerente (1–7).
- **errorCodes:** `PLAYER_NOT_INJURED`, `MEDICAL_PLAN_INVALID`, `TREATMENT_NOT_RECOMMENDED`.
- **Eventos:** `MedicalPlanSet` (+ `RehabStageAdvanced`).
- **Idempotência/concorrência:** agregado `PlayerInjury`; `expectedVersion`.

### Mercado e contratos

Transferência é **processo** (`TransferCase` + `TransferOffer`/`TransferOfferVersion`), não troca direta de `clubId` (§6.3.8). O orçamento é protegido por **`FinancialReservation`** (evita comprometer o mesmo orçamento duas vezes).

#### `MakeTransferOffer` · Risco: médio · fluxos: MF-08 (*fluxos citam também "SendOffer"*)
- **Payload:** `{ playerId: UUID, sellingClubId?: UUID, type: TransferType, transferFee: Money, salaryOffer: Money, contractSeasons: Int, bonus?: Json, clauses?: Json }` — sem `sellingClubId` = proposta a **jogador livre**.
- **Pré-condições:** ator controla o clube comprador; **janela de transferência aberta**; jogador disponível/negociável; oferta na **faixa plausível** (antiabuso — ver R-26); orçamento comporta a oferta → cria `FinancialReservation`.
- **errorCodes:** `TRANSFER_WINDOW_CLOSED`, `TRANSFER_BUDGET_UNAVAILABLE`, `PLAYER_NOT_AVAILABLE`, `OFFER_OUT_OF_PLAUSIBLE_RANGE`, `ANTI_ABUSE_QUARANTINE`.
- **Eventos:** `TransferOfferSent` (abre `TransferCase` se novo) (+ `FinancialReservationCreated`).
- **Idempotência/concorrência:** agregado `TransferCase`; `expectedVersion` do case (ou criação idempotente por `idempotencyKey`).

#### `MakeCounterOffer` · Risco: médio · fluxos: MF-08, MF-09
- **Payload:** `{ transferCaseId: UUID, transferFee: Money, salaryOffer?: Money, contractSeasons?: Int, bonus?: Json, clauses?: Json }` — **não sobrescreve** a oferta anterior (nova `TransferOfferVersion`).
- **Pré-condições:** ator é parte do case e é a vez dele responder; case em `NEGOTIATING`; contraproposta na faixa plausível; se eleva compromisso do comprador, revalida reserva.
- **errorCodes:** `TRANSFER_CASE_NOT_FOUND`, `OFFER_STATE_INVALID`, `OFFER_OUT_OF_PLAUSIBLE_RANGE`, `TRANSFER_BUDGET_UNAVAILABLE`.
- **Eventos:** `CounterOfferSent` (nova `TransferOfferVersion`).
- **Idempotência/concorrência:** agregado `TransferCase`; `expectedVersion` (a versão do case muda a cada rodada, evitando cruzar contrapropostas).

#### `AcceptOffer` / `RejectOffer` · Risco: médio (aceitar: alto se titular) · fluxos: MF-08, MF-09
- **Payload:** `{ transferCaseId: UUID, offerVersionId: UUID, reason?: string }`.
- **Pré-condições:** ator é a parte que recebeu a oferta corrente; oferta **não expirada**; em `AcceptOffer` da ponta vendedora, aval do jogador quando exigido (`M-CONVO`). Aceite dispara o `TransferAgreement`; a conclusão (`SignTransfer`) formaliza pagamentos e registro.
- **errorCodes:** `TRANSFER_CASE_NOT_FOUND`, `OFFER_NOT_FOUND`, `OFFER_EXPIRED`, `OFFER_STATE_INVALID`, `PLAYER_REJECTED_TERMS`.
- **Eventos:** `OfferAccepted` (+ `TransferAgreementReached`) · `OfferRejected`.
- **Idempotência/concorrência:** agregado `TransferCase`; `expectedVersion`. Aceite único por case (segundo envio devolve o resultado).

#### `SignTransfer` ✔ · Risco: alto · fluxos: MF-08, MF-09
- **Payload:** `{ transferCaseId: UUID, agreementId: UUID, medicalCleared: boolean }` — confirma a transferência a partir do acordo (compra definitiva; a ponta vendedora usa o mesmo command).
- **Pré-condições:** `TransferAgreement` válido; **janela aberta**; **situação financeira** confirmada (reserva ainda cobre o `transferFee` → converte reserva em `Payment`/`TransferPaymentSchedule`); integridade competitiva; exame médico (`medicalCleared`).
- **errorCodes:** `TRANSFER_BUDGET_UNAVAILABLE`, `TRANSFER_WINDOW_CLOSED`, `TRANSFER_AGREEMENT_INVALID`, `MEDICAL_NOT_CLEARED`, `PLAYER_ALREADY_REGISTERED`.
- **Eventos:** `TransferSigned` (+ `TransferCompleted`, `PlayerContractSigned`, `PaymentScheduled`, `PlayerClubHistoryOpened`).
- **Idempotência/concorrência:** agregado `TransferCase`; `expectedVersion`. `commandId` garante pagamento único (invariante `TRANSFER_PAYMENT_NOT_DUPLICATED`).

#### `SignContract` ✔ · Risco: médio · fluxos: MF-08
- **Payload:** `{ playerId: UUID, startSeason: Int, endSeason: Int, salaryPerSeason: Money, signingBonus?: Money, releaseClause?: Money, roleInSquad?: string, moralePromises?: Json, agentCommission?: Money }` — vínculo pessoal do jogador (salário, luvas, comissão, imagem).
- **Pré-condições:** jogador **livre** ou com transferência já acordada; sem contrato principal incompatível ativo (invariante "1 contrato principal por jogador"); orçamento salarial comporta o salário.
- **errorCodes:** `PLAYER_HAS_ACTIVE_CONTRACT`, `WAGE_BUDGET_EXCEEDED`, `CONTRACT_TERMS_INVALID`, `PLAYER_REJECTED_TERMS`.
- **Eventos:** `ContractSigned`.
- **Idempotência/concorrência:** agregado `PlayerContract`; `expectedVersion`.

#### `RenewContract` ✔ · Risco: médio · fluxos: MF-20
- **Payload:** `{ contractId: UUID, playerId: UUID, newEndSeason: Int, salaryPerSeason: Money, signingBonus?: Money, releaseClause?: Money, bonus?: Json, moralePromises?: Json }`.
- **Pré-condições:** contrato ativo do jogador no clube; dentro da **janela de renovação** (antecedência permitida — ver R-28); jogador aceita (perfil econômico/ambição/lealdade — pode `PLAYER_REJECTED_TERMS`); orçamento salarial comporta. Envia **`expectedVersion`** (MF-20).
- **errorCodes:** `CONTRACT_VERSION_CONFLICT`, `CONTRACT_NOT_RENEWABLE`, `PLAYER_REJECTED_TERMS`, `WAGE_BUDGET_EXCEEDED`.
- **Eventos:** `ContractRenewed`.
- **Idempotência/concorrência:** agregado `PlayerContract`; `expectedVersion` **obrigatório** (conflito → `CONTRACT_VERSION_CONFLICT`, recarrega `currentVersion` e reenvia).

#### `ListPlayer` / `UnlistPlayer` · Risco: baixo · fluxos: MF-09
- **Payload (`ListPlayer`):** `{ playerId: UUID, type: TransferType, askingPrice: Money, expiresAt?: DateTime, reason?: string }` · **(`UnlistPlayer`):** `{ playerId: UUID, listingId: UUID }`.
- **Pré-condições:** jogador do clube, sob contrato; `UnlistPlayer` só com negociação em curso é bloqueado (`LISTING_HAS_ACTIVE_OFFERS`).
- **errorCodes:** `PLAYER_NOT_IN_SQUAD`, `PLAYER_ALREADY_LISTED`, `LISTING_NOT_FOUND`, `LISTING_HAS_ACTIVE_OFFERS`.
- **Eventos:** `PlayerListed` · `PlayerUnlisted`.
- **Idempotência/concorrência:** agregado `TransferListing`; `expectedVersion`.

#### `LoanPlayer` · Risco: médio · fluxos: MF-10
- **Payload:** `{ playerId: UUID, destinationClubId: UUID, seasons: Int, salaryShareBps: Int, minMinutesPromise?: Int, purchaseOption?: { type: LoanPurchaseClauseType, amount: Money }, recallClause?: boolean, restrictions?: Json }` — empréstimo **preserva** contrato/clube de origem.
- **Pré-condições:** ambos controlam/consentem; janela aberta; jogador aceita o projeto (`M-CONVO`); `salaryShareBps` na escala; inscrição do destino comporta (`M-REGISTRATION`).
- **errorCodes:** `TRANSFER_WINDOW_CLOSED`, `LOAN_TERMS_INVALID`, `PLAYER_REJECTED_TERMS`, `PLAYER_ALREADY_REGISTERED`.
- **Eventos:** `PlayerLoaned` (+ `PlayerLoanAgreementCreated`).
- **Idempotência/concorrência:** agregado `TransferCase`/`PlayerLoanAgreement`; `expectedVersion`.

#### `StartScoutMission` · Risco: baixo · fluxos: MF-08
- **Payload:** `{ scoutStaffId: UUID, target: { playerId?: UUID, region?: string, position?: PlayerPosition, criteria?: Json }, durationTicks: BigInt, budget?: Money }`.
- **Pré-condições:** ator controla o clube; scout disponível (não em outra missão); número de missões simultâneas dentro do limite (ver R-28); orçamento de scouting comporta.
- **errorCodes:** `SCOUT_UNAVAILABLE`, `SCOUT_MISSION_LIMIT_EXCEEDED`, `BUDGET_INSUFFICIENT`.
- **Eventos:** `ScoutMissionStarted`.
- **Idempotência/concorrência:** agregado `ScoutingMission`; idempotente por `idempotencyKey`.

#### `SetTransferStrategy` · Risco: baixo · fluxos: MF-04
- **Payload:** `{ seasonId: UUID, targets?: [UUID], maxSpend?: Money, priorityPositions?: [PlayerPosition], sellList?: [UUID], stance: "AGGRESSIVE" | "BALANCED" | "CONSERVATIVE" }`.
- **Pré-condições:** ator controla o clube; `maxSpend` coerente com o orçamento de transferências.
- **errorCodes:** `INVALID_TRANSFER_STRATEGY`, `BUDGET_INSUFFICIENT`.
- **Eventos:** `TransferStrategySet`.
- **Idempotência/concorrência:** agregado `Club` (estratégia de janela); `expectedVersion`.

#### `RegisterPlayer` · Risco: médio · fluxos: MF-04, MF-08, MF-10
- **Payload:** `{ competitionEditionId: UUID, playerId: UUID, squadType: SquadType, shirtNumber?: Int }` — inscrição competitiva (independente do contrato).
- **Pré-condições:** **janela de inscrição aberta**; jogador sob contrato; cotas respeitadas (estrangeiros, idade, formados); número de camisa livre; sem dupla inscrição (invariante "1 inscrição por jogador/clube/edição").
- **errorCodes:** `PLAYER_ALREADY_REGISTERED`, `REGISTRATION_WINDOW_CLOSED`, `REGISTRATION_QUOTA_EXCEEDED`, `PLAYER_NOT_ELIGIBLE`, `SHIRT_NUMBER_TAKEN`.
- **Eventos:** `PlayerRegistered`.
- **Idempotência/concorrência:** agregado `CompetitionRegistration`; `expectedVersion`.

### Estrutura, estádio e finanças

#### `UpgradeDepartment` · Risco: médio · fluxos: MF-14
- **Payload:** `{ departmentType: DepartmentType, targetLevel: Int, financingSource?: "CASH" | "CREDIT" }`.
- **Pré-condições:** ator controla o clube; `targetLevel` ≤ `maxLevel` e é o próximo nível; nenhum upgrade em andamento no mesmo departamento; caixa/crédito cobre `upgradeCostMinor` → cria `FinancialReservation`.
- **errorCodes:** `DEPARTMENT_MAX_LEVEL`, `DEPARTMENT_UPGRADE_IN_PROGRESS`, `CASH_INSUFFICIENT`, `BUDGET_INSUFFICIENT`.
- **Eventos:** `DepartmentUpgradeStarted` (+ `FinancialReservationCreated`).
- **Idempotência/concorrência:** agregado `ClubDepartment`; `expectedVersion`.

#### `StartStadiumWorks` · Risco: alto · fluxos: MF-14, MF-23
- **Payload:** `{ projectType: string, targetCapacity?: Int, facilityId?: UUID, contractorId: UUID, budget: Money, financingSource?: "CASH" | "CREDIT", startAt: DateTime }`.
- **Pré-condições:** ator controla o clube; estudo de viabilidade aprovado; sem obra conflitante no mesmo ativo; financiamento aprovado (`M-DEBT`/`M-BOARD`) e caixa/crédito cobre → reserva. Alto risco (obra cara) → `HighRiskConfirm`.
- **errorCodes:** `STADIUM_WORKS_IN_PROGRESS`, `CASH_INSUFFICIENT`, `BUDGET_INSUFFICIENT`, `FACILITY_LICENSE_INVALID`, `CONTRACTOR_UNAVAILABLE`.
- **Eventos:** `StadiumWorksStarted` (+ `ConstructionAgreementSigned`, `FinancialReservationCreated`).
- **Idempotência/concorrência:** agregado `InfrastructureProject`; idempotente por `idempotencyKey`.

#### `SetTicketPrices` · Risco: baixo · fluxos: MF-23
- **Payload:** `{ prices: [{ stadiumSectorId: UUID, price: Money }], appliesFrom?: DateTime, matchId?: UUID }` — preço por setor (trade-off ocupação×receita).
- **Pré-condições:** ator controla o clube; setores pertencem ao estádio do clube; preços dentro dos **limites plausíveis** (ver R-27).
- **errorCodes:** `TICKET_PRICE_OUT_OF_BOUNDS`, `INVALID_STADIUM_SECTOR`.
- **Eventos:** `TicketPricesSet`.
- **Idempotência/concorrência:** agregado `TicketPricePolicy`; `expectedVersion`.

#### `ScheduleMaintenance` · Risco: baixo · fluxos: MF-23
- **Payload:** `{ facilityId: UUID, maintenanceType: string, scheduledFor: DateTime, budget?: Money }` — manutenção de estádio/gramado.
- **Pré-condições:** ator controla o clube; instalação do clube; não sobrepõe partida com mando; orçamento comporta.
- **errorCodes:** `MAINTENANCE_CONFLICT`, `BUDGET_INSUFFICIENT`.
- **Eventos:** `MaintenanceScheduled`.
- **Idempotência/concorrência:** agregado `MaintenancePlan`; idempotente por `idempotencyKey`.

#### `SetBudget` · Risco: médio · fluxos: MF-04, MF-13
- **Payload:** `{ seasonId: UUID, allocations: [{ area: DepartmentType | "TRANSFER" | "WAGE", amount: Money }] }`.
- **Pré-condições:** ator controla o clube; soma coerente com projeção de caixa; alterações restritivas respeitam obrigações já assumidas (não desfinancia reserva ativa).
- **errorCodes:** `BUDGET_OVERALLOCATED`, `BUDGET_BELOW_COMMITTED`.
- **Eventos:** `BudgetSet` (+ `BudgetRevisionCreated`).
- **Idempotência/concorrência:** agregado `Budget`; `expectedVersion`.

#### `HireStaff` / `ReleaseStaff` · Risco: médio (dispensar: alto) · fluxos: MF-04
- **Payload (`HireStaff`):** `{ staffId: UUID, role: StaffRole, startSeason: Int, endSeason: Int, salaryPerSeason: Money }` · **(`ReleaseStaff`):** `{ staffContractId: UUID, terminationReason?: string, severanceAcknowledged: boolean }`.
- **Pré-condições:** `HireStaff`: papel não preenchido (ou substituição explícita); staff livre; orçamento salarial comporta. `ReleaseStaff`: contrato ativo; multa rescisória reconhecida (`HighRiskConfirm`).
- **errorCodes:** `STAFF_ROLE_ALREADY_FILLED`, `STAFF_CONTRACT_ACTIVE`, `WAGE_BUDGET_EXCEEDED`, `STAFF_CONTRACT_NOT_FOUND`.
- **Eventos:** `StaffHired` (+ `StaffContractSigned`) · `StaffReleased` (+ `StaffContractTerminated`).
- **Idempotência/concorrência:** agregado `StaffContract`/`StaffMember`; `expectedVersion`.

#### `SignCommercialDeal` · Risco: médio · fluxos: MF-13
- **Payload:** `{ commercialAssetId: UUID, sponsorId: UUID, value: Money, seasons: Int, obligations?: Json, activationRights?: Json }`.
- **Pré-condições:** ator controla o clube; ativo comercial **livre** no período (constraint: sem dois direitos exclusivos sobrepostos por ativo); patrocinador válido.
- **errorCodes:** `COMMERCIAL_RIGHT_CONFLICT`, `COMMERCIAL_ASSET_NOT_FOUND`, `SPONSOR_NOT_FOUND`.
- **Eventos:** `CommercialDealSigned` (+ `SponsorshipAgreementCreated`).
- **Idempotência/concorrência:** agregado `SponsorshipAgreement`; idempotente por `idempotencyKey`.

#### `OpenCreditFacility` · Risco: alto · fluxos: MF-14, MF-16
- **Payload:** `{ principal: Money, seasons: Int, purpose?: string, interestAckBps?: Int }` — crédito/financiamento (`M-DEBT`).
- **Pré-condições:** ator controla o clube; capacidade de crédito disponível; aprovação da diretoria quando exigida; assume dívida (`HighRiskConfirm`).
- **errorCodes:** `CREDIT_LIMIT_EXCEEDED`, `BOARD_APPROVAL_REQUIRED`, `INSOLVENCY_RESTRICTION`.
- **Eventos:** `CreditFacilityOpened` (+ `ClubDebtCreated`).
- **Idempotência/concorrência:** agregado `CreditFacility`; idempotente por `idempotencyKey` (evita crédito duplo).

### Diretoria, comunicação e automação

#### `RespondToBoard` · Risco: baixo · fluxos: MF-13, MF-15, MF-16
- **Payload:** `{ boardMessageId: UUID, responseOption: string, planCommitments?: Json }` — responde a objetivos/pressão; pode assumir metas de plano de recuperação.
- **Pré-condições:** mensagem da diretoria aberta e endereçada ao clube; opção válida; prazo não expirado.
- **errorCodes:** `BOARD_MESSAGE_NOT_FOUND`, `BOARD_RESPONSE_INVALID`, `RESPONSE_WINDOW_CLOSED`.
- **Eventos:** `BoardResponded` (+ `BoardPromiseMade` quando há compromisso).
- **Idempotência/concorrência:** agregado `BoardPromise`/`ClubCommunication`; resposta única por mensagem.

#### `MakePublicPromise` · Risco: médio · fluxos: MF-19
- **Payload:** `{ subjectType: string, subjectId?: UUID, promiseText: string, verifiableTargets: Json, deadline?: DateTime }` — promessa pública **verificável**.
- **Pré-condições:** ator controla o clube; alvos mensuráveis (a promessa será verificada pelo sistema); sem contradizer promessa aberta idêntica.
- **errorCodes:** `PROMISE_NOT_VERIFIABLE`, `DUPLICATE_OPEN_PROMISE`.
- **Eventos:** `PublicPromiseMade`.
- **Idempotência/concorrência:** agregado `PublicPromise`; idempotente por `idempotencyKey`.

#### `TalkToPlayer` · Risco: baixo · fluxos: MF-18
- **Payload:** `{ playerId: UUID, topic: string, conversationId?: UUID, responseOption: string, promise?: Json }`.
- **Pré-condições:** jogador do clube; opção pertence à árvore de diálogo do tópico/gatilho; pode abrir renovação ([MF-20]) ou registrar promessa.
- **errorCodes:** `PLAYER_NOT_IN_SQUAD`, `INVALID_CONVERSATION_OPTION`.
- **Eventos:** `PlayerConversationHeld` (+ `PlayerPromiseMade` quando há promessa).
- **Idempotência/concorrência:** agregado `Player`/`NotificationThread`; passo único por opção (`commandId`).
- **Nota:** os **efeitos numéricos** da árvore de diálogo dependem de balanceamento do GDD (pendência de fonte registrada em MF-18); o **contrato** do command está fechado.

#### `RespondToPress` · Risco: baixo · fluxos: MF-19
- **Payload:** `{ pressQuestionId: UUID, stance: string, statement?: string }` — uma das 8 posturas.
- **Pré-condições:** pergunta aberta e endereçada ao clube; postura entre as válidas; prazo não expirado (senão aplica postura padrão).
- **errorCodes:** `PRESS_QUESTION_NOT_FOUND`, `INVALID_PRESS_STANCE`, `RESPONSE_WINDOW_CLOSED`.
- **Eventos:** `PressResponded` (+ `PublicPromiseMade` quando a postura promete reação).
- **Idempotência/concorrência:** agregado `PressResponse`; resposta única por pergunta.

#### `SaveAutomation` / `ToggleAutomation` · Risco: médio · fluxos: MF-22
- **Payload (`SaveAutomation`):** `{ automationRuleId?: UUID, name: string, trigger: Json, conditions: Json, action: Json, level: AutomationLevel, limits: Json }` — cria/edita como **nova versão** (`AutomationRuleVersion`) · **(`ToggleAutomation`):** `{ automationRuleId: UUID, status: AutomationRuleStatus }`.
- **Pré-condições:** ator controla o clube; regra válida e sem conflito/precedência ambígua com outra ativa; **ações de alto risco não são totalmente delegáveis** (rebaixadas a "sugerir"); automações desativam na troca de controlador.
- **errorCodes:** `AUTOMATION_RULE_INVALID`, `AUTOMATION_HIGH_RISK_NOT_DELEGABLE`, `AUTOMATION_CONFLICT`, `AUTOMATION_RULE_NOT_FOUND`.
- **Eventos:** `AutomationSaved` (nova `AutomationRuleVersion`) · `AutomationToggled`.
- **Idempotência/concorrência:** agregado `AutomationRule`; `expectedVersion` (execução referencia sempre `automationRuleVersionId`).

#### `SetOfflinePlan` · Risco: médio · fluxos: MF-05, MF-07, MF-22
- **Payload:** `{ offlineDecisionLevel: Int, defaultLineupPolicy?: Json, substitutionPolicy?: Json, marketPolicy?: Json, crisisPolicy?: Json, authorityLimits: Json }` — comportamento automático quando o usuário está offline.
- **Pré-condições:** ator controla o clube; **limites de autoridade** respeitados (não vender jogador-chave, não assumir grande dívida, não alterar identidade); nível de decisão na escala.
- **errorCodes:** `OFFLINE_PLAN_INVALID`, `AUTHORITY_LIMIT_EXCEEDED`.
- **Eventos:** `OfflinePlanSet`.
- **Idempotência/concorrência:** agregado `ClubAIProfile`; `expectedVersion`.

### Loja, identidade e suporte

#### `PurchaseStoreItem` · Risco: baixo · fluxos: MF-25
- **Payload:** `{ productId: UUID, quantity: Int, paymentReference?: string }` — cosméticos, temas, passe, slots.
- **Pré-condições:** item **sem efeito esportivo** (sem pay-to-win — itens proibidos nem aparecem); produto disponível; pagamento validado.
- **errorCodes:** `PAY_TO_WIN_ITEM_FORBIDDEN`, `PRODUCT_UNAVAILABLE`, `PAYMENT_FAILED`.
- **Eventos:** `StoreItemPurchased`.
- **Idempotência/concorrência:** agregado da conta/`WorldParticipant`; idempotente por `idempotencyKey`/`paymentReference` (sem cobrança dupla).

#### `ApplyClubIdentity` · Risco: baixo · fluxos: MF-25
- **Payload:** `{ crestAssetId?: UUID, colors?: Json, kitAssetId?: UUID, tributes?: Json }` — escudo/cores/uniforme/homenagens (sem efeito esportivo).
- **Pré-condições:** ator controla o clube; itens desbloqueados; identidade oficial ativa preservada (invariante "1 identidade oficial ativa por clube"); não altera identidade quando bloqueado por limite de autoridade/offline.
- **errorCodes:** `IDENTITY_ASSET_LOCKED`, `IDENTITY_CHANGE_NOT_ALLOWED`.
- **Eventos:** `ClubIdentityApplied` (+ `ClubIdentityPeriodOpened` quando muda identidade oficial).
- **Idempotência/concorrência:** agregado `Club`/`ClubIdentityPeriod`; `expectedVersion`.

#### `SubmitAppeal` · Risco: baixo · fluxos: MF-24
- **Payload:** `{ blockedActionRef: UUID, appealText: string, evidence?: Json }` — recurso contra bloqueio/quarentena antiabuso.
- **Pré-condições:** existe ação bloqueada/pendente atribuível ao ator; recurso ainda não aberto para o mesmo caso.
- **errorCodes:** `APPEAL_TARGET_NOT_FOUND`, `APPEAL_ALREADY_OPEN`.
- **Eventos:** `AppealSubmitted` (+ `SupportTicketOpened`).
- **Idempotência/concorrência:** agregado `SupportTicket`/`AdministrativeCorrection`; idempotente por `idempotencyKey`.

### Admin (mundo)

Os commands do admin (correções, W.O./sanções, filas, reprocessamento, reversão) seguem a **matriz de ações** (`VIEW`/`INVESTIGATE`/`PROPOSE`/`APPROVE`/`EXECUTE`/`ROLLBACK`/…) e o rito de aprovação de [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) e [`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md); não são reproduzidos aqui como `commandType` de jogador. Todos rejeitam com `WORLD_READ_ONLY` quando o mundo está fora de escrita e exigem trilha de auditoria (`AuditEvent`, cadeia de hash).

---

## Recomendações a ratificar (R-25 a R-29)

Os contratos acima estão fechados quanto à **forma** (payload/validações/errorCodes/eventos/idempotência). Restam **valores de balanceamento** que os contratos apenas referenciam; ficam como recomendação até o [Catálogo de Regras e Fórmulas](./05-catalogo-de-regras-e-formulas.md) ratificar.

> **Recomendação (a ratificar — R-25):** TTL da reserva de vaga (`ReserveClubSlot` → `ClubEntryReservation`). Racional: precisa ser curto o suficiente para liberar a vaga a outro jogador, longo o suficiente para o onboarding (`M-CLUB-PREVIEW` → `M-SLOT-RESERVE` → `M-CONTROL-ACTIVATE`). Sugestão inicial: **30 minutos**, com um único `renew` por reserva. Expirado → `CLUB_SLOT_RESERVATION_EXPIRED`.

> **Recomendação (a ratificar — R-26):** (a) **faixa plausível** de oferta de transferência que dispara `OFFER_OUT_OF_PLAUSIBLE_RANGE` (`MakeTransferOffer`/`MakeCounterOffer`) — sugestão: fora de **[40%, 250%]** do valor de mercado estimado entra em sinalização/quarentena antiabuso; (b) **cooldown de `LeaveClub`** e restrição de negociação com o clube antigo — sugestão: **1 janela de transferência** ou **até a virada de temporada**. Racional: dá teto objetivo ao antiabuso (MF-24) sem revelar fórmula.

> **Recomendação (a ratificar — R-27):** limites de `SetTicketPrices` que disparam `TICKET_PRICE_OUT_OF_BOUNDS`. Sugestão: preço por setor em **[25%, 400%]** do preço de referência do setor. Racional: o trade-off ocupação×receita (MF-23) precisa de contorno para não permitir preços degenerados nem exploração de público.

> **Recomendação (a ratificar — R-28):** (a) **janela de renovação** antecipada de `RenewContract` (a partir de quando `CONTRACT_NOT_RENEWABLE` deixa de valer) — sugestão: **última temporada** do contrato ou **faltando ≤ 12 meses virtuais**; (b) **máximo de missões de scouting simultâneas** por clube (`StartScoutMission` → `SCOUT_MISSION_LIMIT_EXCEEDED`) — sugestão: derivado do **nível do departamento de scouting**. Racional: liga o contrato ao balanceamento de estrutura sem fixar número mágico.

> **Recomendação (a ratificar — R-29):** parâmetros da janela ao vivo: (a) **máximo de substituições** por partida (`MakeSubstitution` → `SUBSTITUTIONS_EXHAUSTED`) — sugestão: **5** (regra competitiva padrão, configurável por `CompetitionRuleSet`); (b) **duração da janela** de resposta a `DECISION_POINT` (`ResolveDecisionPoint`) e **rate-limit** de `IssueMatchCommand` por minuto simulado, para evitar spam de comando. Racional: define quando `MATCH_COMMAND_WINDOW_CLOSED` é retornado.

---

## Apêndice: errorCodes

Todos os códigos são **estáveis e independentes do texto traduzido** (doc 08); a UI traduz o **código**, não a mensagem. `retryable`/`currentVersion`/`fieldErrors` seguem o [Erro padronizado](./08-frontend-cliente-e-tempo-real.md#erro-padronizado).

### Reutilizados (já definidos no doc 08 / design system)

`TRANSFER_BUDGET_UNAVAILABLE` · `PLAYER_ALREADY_REGISTERED` · `MATCH_COMMAND_WINDOW_CLOSED` · `CONTRACT_VERSION_CONFLICT` · `WORLD_READ_ONLY`.

### Novos (criados neste catálogo — convenção `SCREAMING_SNAKE`)

**Comuns/envelope:** `AGGREGATE_VERSION_CONFLICT`, `FORBIDDEN_NOT_CONTROLLER`, `IDEMPOTENCY_KEY_REUSED`, `VALIDATION_FAILED`, `COMMAND_CONTRACT_INCOMPATIBLE`.

**Entrada e controle de clube:** `CLUB_SLOT_UNAVAILABLE`, `CLUB_SLOT_RESERVATION_EXPIRED`, `ENTRY_ELIGIBILITY_DENIED`, `ACCOUNT_COOLDOWN_ACTIVE`, `RELATED_ACCOUNT_BLOCKED`, `CLUB_ALREADY_CONTROLLED`, `WORLD_ENTRY_QUOTA_EXCEEDED`, `CONTROL_ACTIVATION_WINDOW_INVALID`, `TAKEOVER_REVIEW_REQUIRED`, `LEAVE_BLOCKED_ASSET_STRIPPING`, `CLUB_SLUG_TAKEN`, `EXPANSION_LEAGUE_CLOSED`, `INVALID_REGION`.

**Partida:** `LINEUP_INVALID`, `LINEUP_LOCKED`, `PLAYER_INELIGIBLE_FOR_MATCH`, `PLAYER_NOT_IN_SQUAD`, `INVALID_FORMATION`, `SQUAD_SIZE_LIMIT_EXCEEDED`, `GAME_PLAN_INVALID`, `MATCH_NOT_LIVE`, `DECISION_POINT_NOT_OPEN`, `DECISION_POINT_ALREADY_RESOLVED`, `SUBSTITUTIONS_EXHAUSTED`, `PLAYER_NOT_ON_BENCH`, `PLAYER_NOT_ON_PITCH`.

**Treino/base/médico:** `TRAINING_PLAN_INVALID`, `PLAYER_UNDER_MEDICAL_RESTRICTION`, `YOUTH_PROMOTION_INVALID`, `YOUTH_NOT_READY`, `INVALID_CAREER_PLAN`, `PLAYER_NOT_INJURED`, `MEDICAL_PLAN_INVALID`, `TREATMENT_NOT_RECOMMENDED`.

**Mercado e contratos:** `TRANSFER_WINDOW_CLOSED`, `PLAYER_NOT_AVAILABLE`, `OFFER_OUT_OF_PLAUSIBLE_RANGE`, `ANTI_ABUSE_QUARANTINE`, `TRANSFER_CASE_NOT_FOUND`, `OFFER_STATE_INVALID`, `OFFER_NOT_FOUND`, `OFFER_EXPIRED`, `PLAYER_REJECTED_TERMS`, `TRANSFER_AGREEMENT_INVALID`, `MEDICAL_NOT_CLEARED`, `PLAYER_HAS_ACTIVE_CONTRACT`, `WAGE_BUDGET_EXCEEDED`, `CONTRACT_TERMS_INVALID`, `CONTRACT_NOT_RENEWABLE`, `PLAYER_ALREADY_LISTED`, `LISTING_NOT_FOUND`, `LISTING_HAS_ACTIVE_OFFERS`, `LOAN_TERMS_INVALID`, `SCOUT_UNAVAILABLE`, `SCOUT_MISSION_LIMIT_EXCEEDED`, `INVALID_TRANSFER_STRATEGY`, `REGISTRATION_WINDOW_CLOSED`, `REGISTRATION_QUOTA_EXCEEDED`, `PLAYER_NOT_ELIGIBLE`, `SHIRT_NUMBER_TAKEN`.

**Estrutura/estádio/finanças:** `DEPARTMENT_MAX_LEVEL`, `DEPARTMENT_UPGRADE_IN_PROGRESS`, `CASH_INSUFFICIENT`, `BUDGET_INSUFFICIENT`, `STADIUM_WORKS_IN_PROGRESS`, `FACILITY_LICENSE_INVALID`, `CONTRACTOR_UNAVAILABLE`, `TICKET_PRICE_OUT_OF_BOUNDS`, `INVALID_STADIUM_SECTOR`, `MAINTENANCE_CONFLICT`, `BUDGET_OVERALLOCATED`, `BUDGET_BELOW_COMMITTED`, `STAFF_ROLE_ALREADY_FILLED`, `STAFF_CONTRACT_ACTIVE`, `STAFF_CONTRACT_NOT_FOUND`, `COMMERCIAL_RIGHT_CONFLICT`, `COMMERCIAL_ASSET_NOT_FOUND`, `SPONSOR_NOT_FOUND`, `CREDIT_LIMIT_EXCEEDED`, `BOARD_APPROVAL_REQUIRED`, `INSOLVENCY_RESTRICTION`.

**Diretoria/comunicação/automação:** `BOARD_MESSAGE_NOT_FOUND`, `BOARD_RESPONSE_INVALID`, `RESPONSE_WINDOW_CLOSED`, `PROMISE_NOT_VERIFIABLE`, `DUPLICATE_OPEN_PROMISE`, `INVALID_CONVERSATION_OPTION`, `PRESS_QUESTION_NOT_FOUND`, `INVALID_PRESS_STANCE`, `AUTOMATION_RULE_INVALID`, `AUTOMATION_HIGH_RISK_NOT_DELEGABLE`, `AUTOMATION_CONFLICT`, `AUTOMATION_RULE_NOT_FOUND`, `OFFLINE_PLAN_INVALID`, `AUTHORITY_LIMIT_EXCEEDED`.

**Loja/identidade/suporte:** `PAY_TO_WIN_ITEM_FORBIDDEN`, `PRODUCT_UNAVAILABLE`, `PAYMENT_FAILED`, `IDENTITY_ASSET_LOCKED`, `IDENTITY_CHANGE_NOT_ALLOWED`, `APPEAL_TARGET_NOT_FOUND`, `APPEAL_ALREADY_OPEN`.

> **Governança de errorCodes:** novos códigos entram por este apêndice com convenção `SCREAMING_SNAKE` e um command de origem. Ao promover o pacote `/packages/contracts`, este apêndice vira a fonte do enum `ErrorCode` compartilhado entre app (Expo) e admin (Next.js).
