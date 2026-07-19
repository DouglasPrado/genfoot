# Seleção de mundo — a lista substitui a constante de build (R-208..R-210)

**Data:** 2026-07-19 · **Status:** RATIFICADAS · **Escopo:** `M-WORLD-PICK`, onboarding, API de leitura

## Contexto — o que motivou

O app mobile nunca selecionou mundo. `useWorldId()`
(`apps/mobile/src/lib/world.ts:17-19`) retorna uma constante de build vinda de
`EXPO_PUBLIC_WORLD_ID`, e `apps/mobile/src/lib/config.ts:27` ainda traz um UUID
hardcoded como fallback silencioso — apontando para um mundo que não existe mais.
Toda query de toda tela passa por aí: o cliente inteiro está amarrado a um mundo
fixado no bundle.

Isso não foi escolha de design, foi consequência. A tela `M-WORLD-PICK` está
especificada desde o início (`docs/04-ui-ux/03-mobile-telas-onboarding-e-conta.md:48-56`)
e seu contrato de leitura está decidido em
`docs/04-ui-ux/23-rastreabilidade-ux-api.md:50` — as queries `GetAvailableWorlds`
e `GetEntryEligibility`. **Nenhuma das duas existe no código.** Sem query para
listar mundos, alguém fixou um UUID e seguiu.

O sintoma apareceu ao resetar o banco: destruído o mundo antigo, o app parou —
pedindo um mundo inexistente, sem nada na tela que explicasse o porquê.

## R-208 — Seleção de mundo é lista viva, não constante de build

O mundo ativo passa a vir de **escolha do usuário sobre uma lista servida pela
API**, nunca de variável de ambiente. `EXPO_PUBLIC_WORLD_ID` é removido, e com
ele o fallback hardcoded de `config.ts:27`.

A lista mostra, por mundo, o que ajuda a decidir: nome, temporada atual, tipo de
liga (**Liga nova** / **Em andamento** / **Temática/especial**), nº de clubes e
vagas disponíveis — conforme o doc da tela. Filtro por tipo de liga.

Consequência dura: **sem mundo selecionado, o app não consulta nada.** Não há
mundo padrão, não há chute. A ausência de seleção é um estado de tela legítimo
(leva a `M-WORLD-PICK`), não um caso de erro a ser contornado com dado fictício —
o fallback silencioso é o anti-padrão que o §5 do `CLAUDE.md` proíbe.

## R-209 — A vitrine de mundos é pública; a elegibilidade não

`GetAvailableWorlds` responde **sem autenticação**, com os dados públicos do
mundo (nome, temporada, tipo, nº de clubes, vagas). Quem abre o app pela primeira
vez vê o jogo existindo antes de criar conta.

Isto **estende** o doc da tela, que hoje só prevê o acesso pós-cadastro
(`03-mobile-telas-onboarding-e-conta.md:51`). A extensão é deliberada: a lista
funciona como vitrine.

O que a query pública **não** expõe: nada derivado de identidade — elegibilidade,
cooldown, contas relacionadas, motivo de bloqueio. Nem em campo, nem por omissão
detectável. A vitrine é a mesma para todo mundo não autenticado.

## R-210 — Elegibilidade é pós-login, por mundo, e nunca revela a fórmula

`GetEntryEligibility` exige sessão e responde a elegibilidade do usuário para os
mundos listados. Só depois do login os cards ganham selo de elegível/bloqueado.

O motivo do bloqueio é **geral**, nunca a regra: `ENTRY_ELIGIBILITY_DENIED`,
`ACCOUNT_COOLDOWN_ACTIVE`, `RELATED_ACCOUNT_BLOCKED`, `CLUB_ALREADY_CONTROLLED`
(`23-rastreabilidade-ux-api.md:150`) viram banner com motivo geral. Revelar a
fórmula entrega o anti-abuso (`docs/01-game-design/09-anti-abuso-e-onboarding.md`
§2.9) a quem quer contorná-lo.

Invariante preservada: **INV-19** (elegibilidade), conforme
`23-rastreabilidade-ux-api.md:50`.

---

## Consequências aceitas / pendências

- **O mobile ganha um passo de onboarding que não existia.** Toda tela que hoje
  assume "existe um mundo" passa a depender de seleção prévia; sem ela, o destino
  é `M-WORLD-PICK`, não um estado de erro.
- **A seleção precisa persistir** entre sessões (o jogador não escolhe o mundo a
  cada abertura). Onde ela vive — `AsyncStorage` local ou vinculada à conta no
  servidor — **fica em aberto**; a decisão natural é servidor, junto de
  `WorldParticipant`, mas isso não está resolvido aqui.
- **A rota pública é a primeira do sistema sem autenticação.** Precisa de rate
  limit próprio; hoje não existe. Ausência registrada, não resolvida.
- **`M-CLUB-PICK` continua pós-login** e inalterada: escolher clube exige
  identidade, e nada nesta decisão muda isso.
- **Não define paginação/cursor** da lista, embora o doc da tela cite *"loading da
  lista (cursor)"*. Com poucos mundos isso não aperta; quando apertar, decide-se.
