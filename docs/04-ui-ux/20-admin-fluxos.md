# Admin — Fluxos

> **Status:** Rascunho consolidado · **Fontes:** docs/02-tecnico/09-operacao-e-admin-do-mundo.md, docs/02-tecnico/04-plataforma-seguranca-operacoes.md, docs/01-game-design/09-anti-abuso-e-onboarding.md · **Revisão:** 2026-07-11

Fluxos do **admin do mundo** (Next.js) — a superfície de operação que **acompanha o estado vivo do mundo**, corrige falhas concretas e preserva a competição, **sem alterar resultados discricionariamente**. Princípios herdados ([doc 09-op](../02-tecnico/09-operacao-e-admin-do-mundo.md)): **correção sobre o futuro, não sobre o passado**; **rastreabilidade total** (estado anterior + motivo + responsável); **autoridade do servidor**; **IA generativa nunca decide, só narra**.

**Como ler.** Fluxos `AF-##`, com passos → tela (`A-*`) → ação. Toda escrita exige **motivo obrigatório** e grava no **audit log imutável**; ações críticas exigem **reautenticação**. RBAC (visualização/suporte/revisão/correção/punição/reversão) filtra quem pode cada passo.

## Índice

- [AF-00 — Acesso, RBAC e seleção de mundo](#af-00--acesso-rbac-e-seleção-de-mundo)
- [AF-01 — Monitorar a saúde do mundo](#af-01--monitorar-a-saúde-do-mundo)
- [AF-02 — Verificações de saúde econômica e demográfica](#af-02--verificações-de-saúde-econômica-e-demográfica)
- [AF-03 — Correção administrativa](#af-03--correção-administrativa)
- [AF-04 — Moderação de abuso (detecção → decisão)](#af-04--moderação-de-abuso-detecção--decisão)
- [AF-05 — W.O. e aplicação de sanções](#af-05--wo-e-aplicação-de-sanções)
- [AF-06 — Recurso e atendimento ao usuário](#af-06--recurso-e-atendimento-ao-usuário)
- [AF-07 — Reprocessamento e reversão](#af-07--reprocessamento-e-reversão)
- [AF-08 — Fim de temporada e homologação (operação)](#af-08--fim-de-temporada-e-homologação-operação)
- [AF-09 — Testes de equilíbrio e SimulationLab](#af-09--testes-de-equilíbrio-e-simulationlab)
- [AF-10 — Versionamento de regras](#af-10--versionamento-de-regras)

---

## AF-00 — Acesso, RBAC e seleção de mundo

1. **`A-LOGIN`** — SSO; a sessão administrativa carrega o **papel** e a matriz de permissões. Ações críticas pedem **reautenticação**.
2. **`A-WORLDS`** — seleciona o **mundo** (escopo de tudo abaixo, `gameWorldId`).
3. Roteia para **`A-WORLD`** (painel). Itens fora do papel aparecem desabilitados com "sem permissão".

**Referências:** [`04-plataforma §2, §4`](../02-tecnico/04-plataforma-seguranca-operacoes.md); [`09-op §5`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

## AF-01 — Monitorar a saúde do mundo

1. **`A-WORLD`** — painel com os **11 itens monitorados**: saúde da economia, população/distribuição de jogadores, competições/calendários, partidas pendentes, clubes em crise, transferências suspeitas, W.O., punições, processos de fim de temporada, falhas de processamento, integridade de inscrições/tabelas.
2. Um sinal em alerta → *drill-down* na tela correspondente (`A-ECONOMY`, `A-MATCHES`, `A-CLUBS`, `A-MODERATION`, `A-COMPETITIONS`…).
3. O painel pode exibir **resumo** de saúde técnica (latência, filas), mas o canônico é a plataforma técnica.

**Referências:** [`09-op §2`](../02-tecnico/09-operacao-e-admin-do-mundo.md). > **Pendência:** limiares de alerta por item (fonte em aberto).

## AF-02 — Verificações de saúde econômica e demográfica

1. **`A-ECONOMY`** — verifica eixos: inflação/deflação, concentração de riqueza, quantidade de livres, pirâmide etária/posição, equilíbrio de divisões, quantidade de prodígios, lesões, base, partidas/calendário, abuso/contas relacionadas.
2. Desvio detectado → resposta preferencial é **ajustar parâmetros de geração/regras futuras** (`A-RULES`), **não** reescrever histórico.
3. Registra a decisão de ajuste (motivo/responsável).

**Referências:** [`09-op §3`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`03-economia §14`](../01-game-design/03-economia.md).

## AF-03 — Correção administrativa

1. Falha concreta detectada (partida interrompida, duplicidade, tabela incorreta, contrato mal processado, premiação duplicada, transferência fraudulenta, falha no encerramento) → **`A-CORRECTIONS`**.
2. Operador com papel de **correção** abre o caso; a tela mostra o **estado atual** e o contrato técnico da correção (tipo, escopo, reversibilidade, ao vivo vs. pós-partida — canônico na plataforma).
3. Aplica a correção com **estado anterior preservado + motivo + responsável** (obrigatórios). Reautenticação para ação crítica.
4. Grava evento no **`A-AUDIT`** (imutável); comunica o usuário quando aplicável.

**Referências:** [`09-op §4`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`04-plataforma §5, §6`](../02-tecnico/04-plataforma-seguranca-operacoes.md). > **Pendência:** comunicação ao usuário após correção (fonte em aberto).

## AF-04 — Moderação de abuso (detecção → decisão)

1. **`A-MODERATION`** — detecção automática **bloqueia o óbvio** e **marca o duvidoso** para fila.
2. **`A-QUEUES`** (revisão) — o revisor analisa o caso: **risk score**, **contas relacionadas** (fraca/moderada/forte/confirmada), **mercado suspeito** (venda abaixo/compra acima/troca/cláusula/parcelamento), **clube satélite/farm**, **manipulação esportiva**.
3. Decide: liberar (falso positivo — não punir ambíguos), manter em **quarentena** (ação pendente com prazo), ou aplicar sanção → [AF-05](#af-05--wo-e-aplicação-de-sanções).
4. Toda decisão registra motivo/responsável no **`A-AUDIT`**; privacidade preservada (não expor IP/dispositivo/critério indevidamente).

**Referências:** [`09-anti-abuso §1.3–1.6, §1.13`](../01-game-design/09-anti-abuso-e-onboarding.md).

## AF-05 — W.O. e aplicação de sanções

1. **`A-WO-SANCTIONS`** — casos de W.O./abandono e sanções pendentes.
2. Operador com papel de **punição** escolhe a sanção do **catálogo** (progressiva: aviso → bloqueio → cooldown → restrição de mercado → multa → perda de pontos → reversão → suspensão → banimento; tipos: esportiva/financeira/reputação).
3. Aplica com motivo/responsável; sanções públicas viram **notícia** no mundo (afetam reputação/torcida), mas o audit log em si não vira notícia.

**Referências:** [`09-anti-abuso §1.7, §1.12`](../01-game-design/09-anti-abuso-e-onboarding.md); [`09-op §2 item 8`](../02-tecnico/09-operacao-e-admin-do-mundo.md).

## AF-06 — Recurso e atendimento ao usuário

1. Usuário abre recurso (via `M-SUPPORT`) → entra em **`A-QUEUES`** (fila de recurso) e **`A-SUPPORT`**.
2. Operador de **suporte/revisão** consulta o caso (sem alterar estado, ou baixo impacto); instrui decisão.
3. Decisão registrada; resposta ao usuário; SLA de revisão (pendente de plataforma).

**Referências:** [`09-op §5, §8`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`09-anti-abuso §1.13`](../01-game-design/09-anti-abuso-e-onboarding.md).

## AF-07 — Reprocessamento e reversão

1. Estado inconsistente que exige desfazer → **`A-CORRECTIONS`** (reprocessamento seguro) ou reversão.
2. **Reversão** exige o **maior privilégio** (papel de reversão/superadmin) e controle rígido; reautenticação obrigatória.
3. Cria **novo** evento de audit log referenciando o anterior (append-only; correção nunca apaga).

**Referências:** [`09-anti-abuso (Dec. 1924–1925, 1933, 1957)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`04-plataforma §5`](../02-tecnico/04-plataforma-seguranca-operacoes.md).

## AF-08 — Fim de temporada e homologação (operação)

1. **`A-COMPETITIONS`** — acompanha os **processos de fim de temporada** (rebaixamento/acesso, premiação, virada) e a **integridade de inscrições/tabelas**.
2. **Homologação:** confirma condições (partidas concluídas, recursos tratados, punições aplicadas, desempates, classificação consistente, licenças); título provisório → oficial.
3. Falha no encerramento → correção ([AF-03](#af-03--correção-administrativa)); auditoria de temporada (transferências extremas, satélites, W.O., manipulação, economia anormal, premiações).

**Referências:** [`06-temporada §14`](../01-game-design/06-temporada-e-competicoes.md); [`09-op §2 itens 9, 11`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`09-anti-abuso (Dec. 1949)`](../01-game-design/09-anti-abuso-e-onboarding.md).

## AF-09 — Testes de equilíbrio e SimulationLab

1. **`A-BALANCE`** — roda simulações massivas de mundos/temporadas; observa distribuição de placares, eficácia de estilos, lesões, evolução, mercado, finanças, IA de clubes, abusos emergentes, encerramento em massa.
2. Desvios orientam ajustes **sobre o futuro** → `A-RULES`.
3. **SimulationLab** testa cenários de abuso antes de promover mudanças a mundos vivos (*gate*).

**Referências:** [`09-op §6`](../02-tecnico/09-operacao-e-admin-do-mundo.md); [`09-anti-abuso (Dec. 1953)`](../01-game-design/09-anti-abuso-e-onboarding.md). > **Pendência:** metodologia/critérios de *gate* (fonte em aberto).

## AF-10 — Versionamento de regras

1. **`A-RULES`** — versiona regras de **geração/economia** e de **anti-abuso** (versão, pesos, data, mundo, temporada, motivo).
2. Mudança aplicada dali para frente (não retroativa); registrada no audit log.
3. Liga com [AF-02](#af-02--verificações-de-saúde-econômica-e-demográfica) e [AF-09](#af-09--testes-de-equilíbrio-e-simulationlab).

**Referências:** [`09-anti-abuso (Dec. 1952)`](../01-game-design/09-anti-abuso-e-onboarding.md); [`09-op §3, §7`](../02-tecnico/09-operacao-e-admin-do-mundo.md).
