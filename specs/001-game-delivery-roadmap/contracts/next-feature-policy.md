# Política determinística da próxima feature

## Seleção

No início de cada ciclo, use somente manifests versionados e aplique:

1. Exclua `DELIVERED` e `DEFERRED` do conjunto executável.
2. `BLOCKED` só volta ao conjunto quando sua `unblockCondition` tem evidência válida.
3. Mantenha features cujos prerequisites estão `DELIVERED`; para trabalho contract-only, aceite predecessor com contract `FROZEN`, mas marque integração/conclusão bloqueadas.
4. Mantenha apenas features cujo marco de entrada anterior está PASS.
5. Ordene por `wave` ascendente, depois milestone (`M0`…`M4`), status (`PARTIAL` antes de `PLANNED`) e ID lexicográfico.
6. Escolha a primeira feature sem conflito de lane/ownership; as demais da mesma wave podem ocupar lanes independentes.

Essa função é pura para o mesmo index, graph, milestone evidence set e lane allocation.

## Estados

- `PARTIAL`: retome a menor lacuna comprovada do child packet; não reimplemente evidência verde.
- `PLANNED`: inicie pelo primeiro incremento independently testable.
- `BLOCKED`: registre blocker, owner, observedAt, unblockCondition e dependência/evidência; não avance integração escondida.
- `DEFERRED`: registre motivo e marco futuro; não equivale a cancelado nem pronto.
- `DELIVERED`: permanece histórico; evolução incompatível recebe novo ID.

## Freeze e dependências

`STARTS_AFTER` requer predecessor `DELIVERED`. `FINISHES_AFTER` permite pesquisa/scaffold, mas bloqueia conclusão. `CONTRACT_ONLY` permite implementação paralela somente com `contractFreeze: FROZEN`. O índice lista todos os prerequisites diretos; transitivos são calculados pelo DAG.

## IDs e mudança de escopo

IDs nunca são reutilizados, renumerados ou atribuídos a novo significado. Split mantém o ID original como histórico/parent e cria IDs novos para unidades novas. Merge não apaga IDs: um fica successor e os demais apontam supersession. Lacuna fora do escopo recebe novo ID antes de implementação.

## Empates, falhas e replanejamento

Empates finais usam ID lexicográfico. Falha de evidence mantém feature ativa/partial ou blocked conforme blocker real; nunca promove por maioria. Mudança de dependência exige atualização atômica do graph, index, waves, lanes e relatório topológico, seguida dos validadores.
