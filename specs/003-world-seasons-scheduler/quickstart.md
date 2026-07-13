# Quickstart: Mundo, temporadas e scheduler

## Prerequisites

- Node.js 22, PNPM 10 e dependências instaladas.
- Seed fixa `validation-bc-002`, ruleset `1.0.0` e diretório temporário vazio.
- Leia [data-model.md](data-model.md) e [contracts/README.md](contracts/README.md).

## 1. Gates e testes focados

```bash
pnpm typecheck
pnpm exec vitest run \
  packages/core/tests/time-window.test.ts \
  packages/core/tests/world-scheduler-idempotency.test.ts \
  packages/core/tests/world-advance-command.test.ts \
  packages/core/tests/season-rollover.test.ts \
  packages/core/tests/season-rollover-recovery.test.ts \
  packages/core/tests/season-rollover-use-cases.test.ts \
  apps/simulator/tests/json-world-repository.test.ts \
  apps/simulator/tests/cli.test.ts
```

**Expected**: todos os comandos saem com zero. Os testes cobrem limites de janela, retry do mesmo command, conflito de data/versão, isolamento por mundo, takeover de lease, fencing obsoleto, 20 checkpoints, ordem homologação→premiação, `VERIFYING` e abertura única de N+1.

## 2. Criar e ativar um mundo

```bash
export GRINTA_SIMULATOR_DATA_DIR=/tmp/grinta-bc-002-validation
pnpm simulator world:create --seed validation-bc-002 --start-date 2026-01-01
pnpm simulator world:genesis --world <worldId>
pnpm simulator world:activate --world <worldId>
```

Capture o `worldId`. Após a ativação, o mundo está em `2026-01-01`, versão 3, com scheduler schema v2.

## 3. Janela temporal versionada

```bash
pnpm simulator world:window:register \
  --world <worldId> \
  --type TRANSFER \
  --name "Janela principal" \
  --opens-on 2026-01-01 \
  --closes-on 2026-01-10 \
  --ruleset-version 1.0.0 \
  --config-version 1

pnpm simulator world:windows --world <worldId> --on 2026-01-10 --type TRANSFER
```

**Expected**: o limite final é inclusivo e a consulta retorna uma janela. Data fora do intervalo retorna lista vazia; ruleset divergente falha sem alterar o scheduler.

## 4. Avanço idempotente

```bash
pnpm simulator day:advance \
  --world <worldId> \
  --command-id validation-command-001 \
  --idempotency-key validation-bc-002:2026-01-01 \
  --expected-date 2026-01-01 \
  --expected-version 3 \
  --ruleset-version 1.0.0
```

Repita exatamente o mesmo command.

**Expected**: ambas as respostas são idênticas, `previousDate=2026-01-01`, `currentDate=2026-01-02`, um único `WorldDayAdvanced` foi persistido e o segundo run não processa efeitos adicionais. Reutilizar a chave com outro command/payload retorna `IDEMPOTENCY_KEY_CONFLICT`.

## 5. SAGA-02 e recuperação

Avance os 89 dias restantes até `2026-04-01`:

```bash
pnpm simulator day:simulate --world <worldId> --days 89
pnpm simulator scheduler:inspect --world <worldId>
```

Capture `rollovers[0].id`; `SeasonDue` deve ter criado uma SAGA-02 `REQUESTED`.

```bash
pnpm simulator season:rollover:inspect --world <worldId> --rollover <rolloverId>
pnpm simulator season:rollover:resume --world <worldId> --rollover <rolloverId> --approve-all
pnpm simulator scheduler:inspect --world <worldId>
```

`--approve-all` é somente um harness headless explícito: simula os owners externos e fornece evidência sintética para os três invariantes. Não representa integração entregue por C3/C4/C6/C7/C8/C9/C10/C11.

**Expected**: 20 eventos `SeasonRolloverCheckpointed`, depois `SeasonClosed` e `SeasonStarted`; temporada 1 fica `ARCHIVED`, temporada 2 fica `PLANNED`. Repetir resume não reaplica handlers.

## 6. Failure injection

```bash
pnpm exec vitest run packages/core/tests/season-rollover-recovery.test.ts
```

O teste interrompe um checkpoint em `RUNNING`, expira o lease, toma posse com token maior e prova que o token anterior recebe `STALE_FENCING_TOKEN`. Com retry budget esgotado, a saga vai para `MANUAL_REVIEW`; a temporada não é arquivada parcialmente.

## Promotion Rule

BC-002 só pode sair de `PARTIAL` quando gates, testes, persistência v1–v5, smoke de restart e relatório reproduzível estiverem verdes. A promoção cobre o owner C2 e seus ports; não promove implementações pertencentes a outros contexts.
