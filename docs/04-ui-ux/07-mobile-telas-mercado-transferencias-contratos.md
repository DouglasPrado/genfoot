# Mobile — Mercado, Transferências e Contratos

> **Status:** Rascunho consolidado · **Fontes:** docs/01-game-design/03-economia.md, docs/01-game-design/02-sistema-de-jogadores.md, docs/01-game-design/09-anti-abuso-e-onboarding.md · **Revisão:** 2026-07-11

A aba **Mercado**: buscar e observar jogadores, scouting, negociar (proposta/contra-proposta), contratos e renovações, empréstimos e empresários. Fluxos: [MF-08](02-mobile-fluxos.md#mf-08--contratação-de-jogador), [MF-09](02-mobile-fluxos.md#mf-09--venda-de-jogador), [MF-10](02-mobile-fluxos.md#mf-10--empréstimo-de-jogador), [MF-20](02-mobile-fluxos.md#mf-20--renovação-de-contrato), [MF-24](02-mobile-fluxos.md#mf-24--ação-bloqueada-por-anti-abuso).

> **Nota:** o GDD descreve o **ciclo** de mercado e a natureza emocional das negociações, mas não fixa um passo-a-passo formal proposta→contra-proposta com estados de tela — esta área define o **padrão de UI** de negociação (estados abaixo) preservando as regras econômicas da fonte. Coeficientes/valores são pendências de calibração.

---

## `M-MARKET` — Mercado de transferências

- **Objetivo:** encontrar alvos e oportunidades.
- **Como se chega:** aba Mercado; atalho do relatório de mercado/elenco; MF-08.
- **Layout:** busca + `FilterBar` + `SegmentedControl` (Alvos / Livres / Oportunidades / Observados / Minha lista de vendas).
- **Componentes e dados:** **temperatura de mercado** (frio↔quente); **camadas segmentadas** (geral, regional/iniciante, base local, empréstimos); por jogador (`PlayerRow`): posição, idade, overall/potencial (estimado), **valor estimado**, **salário pedido**, tempo de contrato, interesse de clubes, risco de saída; filtros por posição/idade/valor/faixa. Relatório de mercado ([doc 13, §5.5](../01-game-design/13-relatorios-notificacoes-e-memoria.md)): necessidades, oportunidades, contratos vencendo, disponibilidade, concorrência, risco financeiro.
- **Ações:** observar/salvar alvo; abrir `M-PLAYER`; iniciar `M-SCOUTING`; propor (`M-NEGOTIATION`); definir estratégia (`M-TRANSFER-STRATEGY`).
- **Estados:** vazio ("nenhum alvo salvo → buscar"); *loading* cursor; offline (cache).
- **Referências:** [`03-economia §7`](../01-game-design/03-economia.md); [`13-relatorios §5.5`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-SCOUTING` — Scouting / olheiros e relatórios

- **Objetivo:** observar alvos e reduzir a incerteza.
- **Como se chega:** `M-MARKET`, `M-PLAYER`, notificação "olheiro achou promessa".
- **Layout:** missões de observação + **lista de observação como pipeline** + lista de `ScoutReport`.
- **Componentes e dados:** áreas de scouting (regional, nacional, continental, África/Ásia, mercado livre, base de outros clubes) com custo/risco; **lista de observação como pipeline** (prioridade / motivo / responsável / próxima ação / prazo) [`03 §16.5`]; por relatório: **faixa estimada** de potencial/atributos, **confiança**, traços visíveis, **riscos ocultos detectados** (ego, físico, pressão familiar, empresário agressivo, adaptação), **recomendação** (contratar/monitorar/evitar/emprestar), comparação de **relatórios contraditórios** e **envelhecimento/data** do relatório [`03 §16.6, §16.7`]. Precisão depende do **nível dos olheiros**.
- **Ações:** criar missão de observação; comparar candidatos; escalar para negociação.
- **Estados:** relatório em elaboração (*loading*); "a verdade aparece com o tempo" (confiança sobe com observação).
- **Referências:** [`02-jogadores §3, §18`](../01-game-design/02-sistema-de-jogadores.md); [`03-economia §16.5–16.7`](../01-game-design/03-economia.md); [`04-estrutura §3.5`](../01-game-design/04-estrutura-do-clube-e-staff.md).

## `M-NEGOTIATION` — Negociação (proposta / contra-proposta)

- **Objetivo:** conduzir a negociação de compra/venda.
- **Como se chega:** `M-MARKET` (comprar), notificação de proposta (vender), `M-DECISION-DETAIL`.
- **Layout:** cabeçalho do jogador + histórico da negociação (thread) + editor de proposta.
- **Componentes e dados:** valor esportivo; **cronograma de pagamento** (à vista/parcelas); **bônus condicionais**; **comissão do empresário**; **participação em venda futura**; cláusulas; contrapartidas (troca). Painéis de apoio: **valor estimado** vs. pedido; interesse de outros clubes; recomendação dos funcionários; **reserva de recursos** (não comprometer o mesmo orçamento duas vezes); **extrato de negociações passadas** com desfecho financeiro.
- **Ações / estados de negociação (padrão de UI):** `Rascunho → Enviada → Em análise → Contraproposta → Aceita → Exame médico → Formalização (contrato) → Registrada`. O estado **"Exame médico"** (entre *Aceita* e *Formalização*) tem 5 desfechos: aprovar / aprovar com risco / avaliação adicional / reprovar / alterar termos [`03 §17.3`]. Cada envio é command idempotente; **aceitar** encadeia `M-CONTRACT` (comprar) ou formaliza a saída (vender).
- **Estados:** `TRANSFER_BUDGET_UNAVAILABLE` (orçamento); proposta fora da faixa plausível → **sinalização anti-abuso / quarentena** ([MF-24](02-mobile-fluxos.md#mf-24--ação-bloqueada-por-anti-abuso)); vendedor recusa; IA recusa proposta absurda; torcida pode bloquear venda ao rival (aviso).
- **Referências:** [`03-economia §11, §15.2, §15.4, §17.3`](../01-game-design/03-economia.md); [`09-anti-abuso §1.5`](../01-game-design/09-anti-abuso-e-onboarding.md).

## `M-CONTRACT` — Contrato / renovação

- **Objetivo:** definir/renovar o contrato pessoal do jogador.
- **Como se chega:** fim de `M-NEGOTIATION`; `M-PLAYER`; notificação "contrato vencendo".
- **Componentes e dados** (`PlayerContract`): salário, tempo/vigência, **multa rescisória**, bônus por gol/partida, **luvas** (signing bonus), bônus de fidelidade, comissão do empresário, direitos de imagem, **seguro**, `renewalInterest`. Painel do jogador: mente econômica (ambição, lealdade, ganância, pressão familiar, influência do empresário, custo de vida, segurança de carreira, desejo de status) → o que exige/aceita. Status prometido/papel coerente.
- **Ações:** ajustar termos; enviar oferta (command `SignContract`/`RenewContract` com `expectedVersion`); liberar/dispensar (`HighRiskConfirm`); blindar promessa (contrato + luvas); criar **cláusulas condicionais** que passam a ser acompanhadas em `M-CLAUSES` [`03 §17`].
- **Estados:** jogador aceita/recusa/contrapõe; `CONTRACT_VERSION_CONFLICT` recarrega e reenvia; `fieldErrors` de validação.
- **Referências:** [`03-economia §3.2, §3.3, §8, §17`](../01-game-design/03-economia.md); [MF-20](02-mobile-fluxos.md#mf-20--renovação-de-contrato).

## `M-LOAN` — Empréstimo

- **Objetivo:** negociar entrada/saída por empréstimo.
- **Componentes e dados:** duração; **divisão de salário** (parte paga pela origem); **minutos mínimos** obrigatórios; opção/obrigação de compra (quando a regra do mundo prevê); limite de empréstimos por clube; **comparação de destinos** (nível da liga, minutos, posição de uso, pressão, técnico, estrutura médica, estilo, distância, visibilidade) e **projeção de retorno** (melhor/igual/pior) [`02 §18`].
- **Ações:** propor/aceitar empréstimo (command); vincular ao plano de uso; acompanhar minutos/condição/promessas ao longo do período.
- **Estados:** validação de inscrição; ao fim, encadeia compra/prorrogação/retorno.
- **Referências:** [`03-economia §7.4`](../01-game-design/03-economia.md); [`02-jogadores §18`](../01-game-design/02-sistema-de-jogadores.md); [MF-10](02-mobile-fluxos.md#mf-10--empréstimo-de-jogador).

## `M-AGENT` — Empresário

- **Objetivo:** entender e negociar com o representante.
- **Componentes e dados** (`Agent`): reputação, ganância, influência, força de rede, **estilo de negociação** (calmo/agressivo/oportunista); comportamento (agressivo pede salário alto, força saída, vaza interesse; leal facilita renovação); comissão devida.
- **Ações:** negociar comissão; antecipar exigências na proposta.
- **Estados:** aviso quando o estilo do empresário encarece/atravanca o negócio.
- **Referências:** [`03-economia §3.4`](../01-game-design/03-economia.md).

## `M-TRANSFER-STRATEGY` — Estratégia de janela

- **Objetivo:** orientar a política de mercado e delegar limites.
- **Componentes e dados** (`TransferStrategy`): prioridade (comprar/vender/emprestar/desenvolver/cortar custos); aumento salarial máximo; teto de gasto; valor mínimo de venda obrigatória; faixa etária preferida; limites impostos pela diretoria (orçamento, meta, tolerância a dívida, pressão por vender/contratar).
- **Ações:** definir estratégia (command); vincular à automação de mercado (`M-AUTOMATIONS`).
- **Estados:** conflito com objetivos da diretoria sinalizado.
- **Referências:** [`03-economia §3.9, §11.3`](../01-game-design/03-economia.md).
