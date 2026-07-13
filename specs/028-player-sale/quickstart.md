# Quickstart: Venda de jogador

1. Criar dois clubes, jogador negociável, contratos e contas com saldo.
2. Listar o jogador, enviar e aceitar oferta válida.
3. Processar a SAGA-01 até `COMPLETED`.
4. Reenviar o mesmo `commandId` e tentar segundo aceite concorrente.
5. Repetir com falha antes da liquidação e executar compensação.

**Expected**: um acordo/pagamento/novo vínculo no sucesso; conflito no segundo aceite; reserva liberada uma vez na falha; ledger, contrato e elenco reconciliados.
