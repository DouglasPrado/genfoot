# Catálogo de Commands

> **Status:** Rascunho consolidado · **Fontes:** docs/02-tecnico/08-frontend-cliente-e-tempo-real.md (envelope de command), docs/04-ui-ux/ (ações referenciadas nos fluxos) · **Revisão:** 2026-07-11

Este documento é o **catálogo canônico de commands** do **Grinta** — os nomes das ações que um cliente (app do jogador em Expo ou admin em Next.js) envia à API oficial. Ele existe porque os fluxos de UI em [`../04-ui-ux/`](../04-ui-ux/) referenciam commands por nome (ex.: `SignTransfer`, `RenewContract`), mas o contrato técnico define apenas o **envelope genérico** — sem enumerar os nomes. Aqui os nomes ganham um lar único.

> **Escopo:** este catálogo fixa **nomes e intenção** de cada command. O **payload** (campos de entrada) e os **efeitos/invariantes** de cada um ainda serão especificados — ver [Catálogo de Regras e Fórmulas](./05-catalogo-de-regras-e-formulas.md) e o [Modelo de Dados](./02-modelo-de-dados.md). Até lá, os payloads são `> **Pendência:**`.

## Sumário

- [Envelope e convenção](#envelope-e-convenção)
- [Commands por domínio](#commands-por-domínio)
- [Pendências](#pendências)

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

## Commands por domínio

### Conta e vínculo de clube

| `commandType` | Intenção | Ref. |
|---|---|---|
| `ReserveClubSlot` | Reservar um slot/clube na entrada em um mundo | ✔ |
| `ActivateClubControl` | Ativar o controle de um clube (assumir a gestão) | ✔ |
| `LeaveClub` | Abandonar/deixar o controle de um clube | ✔ |
| `CreateClub` | Criar um clube novo (liga de expansão) | |

### Elenco, tática e partida

| `commandType` | Intenção | Ref. |
|---|---|---|
| `SetTactics` | Definir plano tático (formação, postura, funções, instruções) | ✔ |
| `SetLineup` | Definir escalação oficial (titulares + banco) | |
| `SetGamePlan` | Definir o plano de jogo/offline para a partida | |
| `IssueMatchCommand` | Enviar um comando durante a partida (pressionar, recuar, poupar…) | |
| `MakeSubstitution` | Fazer substituição na partida | |
| `ResolveDecisionPoint` | Responder a um ponto de decisão da partida | |

### Treino, base e médico

| `commandType` | Intenção | Ref. |
|---|---|---|
| `SetTrainingPlan` | Definir plano de treino (coletivo/individual) | ✔ |
| `PromoteYouthPlayer` | Promover jovem da base ao elenco principal | |
| `SetPlayerCareerPlan` | Definir plano de carreira/uso de um jogador | |
| `SetMedicalPlan` | Definir conduta médica/reabilitação de um jogador | |

### Mercado e contratos

| `commandType` | Intenção | Ref. |
|---|---|---|
| `SignTransfer` | Confirmar uma transferência (compra definitiva) | ✔ |
| `RenewContract` | Renovar contrato de um jogador | ✔ |
| `SignContract` | Assinar contrato (novo vínculo) | ✔ |
| `MakeTransferOffer` | Enviar proposta de transferência | |
| `MakeCounterOffer` | Enviar contraproposta | |
| `AcceptOffer` / `RejectOffer` | Aceitar/recusar proposta recebida | |
| `ListPlayer` / `UnlistPlayer` | Colocar/tirar jogador da lista de transferências | |
| `LoanPlayer` | Emprestar jogador (com regras de uso/compra) | |
| `StartScoutMission` | Iniciar missão de observação (scouting) | |
| `SetTransferStrategy` | Definir estratégia de janela | (`TransferStrategy`) |

### Estrutura, estádio e finanças

| `commandType` | Intenção | Ref. |
|---|---|---|
| `UpgradeDepartment` | Iniciar upgrade de uma área/departamento | |
| `StartStadiumWorks` | Iniciar obra no estádio | |
| `SetTicketPrices` | Definir preços de ingresso (por setor) | |
| `SetBudget` | Ajustar orçamento por área | |
| `HireStaff` / `ReleaseStaff` | Contratar/dispensar profissional | |
| `SignCommercialDeal` | Fechar contrato comercial/patrocínio | |

### Diretoria, comunicação e automação

| `commandType` | Intenção | Ref. |
|---|---|---|
| `RespondToBoard` | Responder à diretoria (objetivos/pressão) | |
| `MakePublicPromise` | Registrar promessa pública verificável | |
| `TalkToPlayer` | Conversar com um atleta | |
| `RespondToPress` | Responder à imprensa | |
| `SaveAutomation` / `ToggleAutomation` | Criar/editar/ativar uma automação do usuário | |
| `SetOfflinePlan` | Definir o plano automático (comportamento offline) | |

### Admin (mundo)

Os commands do admin (correções, W.O./sanções, filas, reprocessamento, reversão) seguem a **matriz de ações** (`VIEW`/`INVESTIGATE`/`PROPOSE`/`APPROVE`/`EXECUTE`/`ROLLBACK`/…) e o rito de aprovação de [`./04-plataforma-seguranca-operacoes.md`](./04-plataforma-seguranca-operacoes.md) e [`./09-operacao-e-admin-do-mundo.md`](./09-operacao-e-admin-do-mundo.md); não são reproduzidos aqui como `commandType` de jogador.

---

## Pendências

> **Pendência:** o **payload** e os **efeitos/invariantes** de cada command precisam ser especificados (campos de entrada, validações, eventos de domínio gerados). Enquanto não fechados, os fluxos de UI podem citar o `commandType` mas não devem assumir a forma do payload.

> **Pendência:** confirmar a lista definitiva de commands (os marcados ✔ são certos; os derivados dependem de fechamento do design de cada tela) e classificar cada um por **nível de risco** (baixo → alto/aprovação reforçada), ligando à matriz de ações da plataforma.
