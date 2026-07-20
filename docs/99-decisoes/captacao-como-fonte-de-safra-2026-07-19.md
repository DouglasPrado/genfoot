# A reposição vem da captação, não da geração automática (R-218)

**Data:** 2026-07-19 · **Status:** RATIFICADA · **Escopo:** fonte da nova safra que repõe aposentados

## Contexto

A R-217 fez os jogadores envelhecerem e se aposentarem. Sem reposição, o mundo
encolhe a cada virada. O ritmo de reposição já é R-114 (1,25 jogador por
aposentado, teto 8%/temporada) — o que faltava era a **fonte**.

Quatro fontes possíveis foram apresentadas ao dono: safra gerada automática,
promoção da base, captação/intake, ou adiar. O dono escolheu **captação/intake**.

## R-218 — A nova safra entra pela captação (`M-YOUTH-INTAKE`), não nasce automática

A reposição é o **funil de captação** do doc (`08-mobile-telas-base-e-formacao.md:19-26`,
`02-sistema-de-jogadores §3/§11`): uma safra anual de candidatos, com relatório
de olheiro, disputa entre clubes e contrato de formação. Não é "regen" que
aparece no elenco — é entrada **gerenciada** pelo jogador.

**Cadência: anual.** O `SeasonCalendar` (`06-temporada §4:295-306`) tem um único
`youthIntakeDate` por temporada (~63 dias de mundo). A captação abre uma vez por
temporada; fora dela, os olheiros não produzem fluxo contínuo. Encaixa no ciclo:
aposenta na virada, repõe na safra seguinte.

## Consequência aceita, dita sem rodeio

**A captação NÃO fecha o "elenco encolhe" a curto prazo.** Ela repõe de verdade
só quando a cadeia inteira existir:

1. Motor de safra (`YouthClass`/`YouthGenerationEngine`) — gera o lote. **Construível já.**
2. `ScoutReport` com incerteza (R-04: olheiro ruim ±10/conf≤40, bom ±3/conf≥80, faixa
   estreita ~30%/ciclo). **Construível já.**
3. Disputa entre clubes (o jovem escolhe por estrutura, reputação, salário, família,
   empresário). Grande, mas construível.
4. Contrato de formação → **puxa C6/C9** (contrato é dinheiro; a R-189 barrou "gênese
   assina contrato"). **Bloqueado por decisão.**
5. Gatilho `youthIntakeDate` no calendário → **trava B-08** (ciclo de vida de temporada
   inexistente). **Bloqueado.**

Ordem de construção: fundação primeiro (1 + 2), que tudo mais consome; disputa a
seguir; contrato e gatilho quando C6/C9 e B-08 destravarem. **Enquanto a cadeia não
fecha, o mundo encolhe a cada virada — e isso é sabido, não esquecido.**

A geração automática (opção 1) foi descartada como fonte permanente; se o
encolhimento apertar antes da cadeia fechar, ela pode voltar como paliativo — mas
não é o que a R-218 decide.

## Fronteira de escopo (do próprio doc)

`02-sistema-de-jogadores §3:199` separa: a **geração individual** do atleta é
daquele doc; a **estrutura de safra** (`YouthClass`, `YouthGenerationEngine`) e a
**disputa entre clubes** pertencem ao documento de base — que não existe
implementado. A R-218 abre esse documento na prática, começando pelo motor de safra.
