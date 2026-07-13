# Quickstart: validar mercado e contratos

## Prerequisites

- M0 verde; contratos de C3/C4/C5 congelados; BC-009 e X-002 disponíveis.
- Node.js 22, PNPM 10 e diretório temporário de simulador.

## Scenarios

1. Criar mundo determinístico, gerar clubes/jogadores e ativá-lo.
2. Produzir dois relatórios de scouting e verificar campos/confiança distintos.
3. Abrir negociação, submeter contraproposta e provar rejeição da versão antiga.
4. Aceitar a versão atual, executar SAGA-01 e verificar vínculo, contrato, liquidação e pedido de inscrição únicos.
5. Repetir cada command com a mesma idempotency key; hashes e saldos não mudam.
6. Injetar falha após reserva; executar retry/compensação e verificar liberação integral.
7. Ativar empréstimo curto; avançar data e provar retorno. Repetir com opção e provar compra sem retorno duplicado.

## Commands

```bash
pnpm test -- --run market
pnpm simulator market:scenario --seed market-001 --ruleset-version <version>
```

## Expected

Todos os testes terminam com código zero; versões obsoletas falham sem efeito; cada saga possui terminal único; ledger residual é zero e nenhum jogador possui vínculo incompatível. O comando de cenário será implementado pela feature e sua ausência mantém a evidência pendente.
