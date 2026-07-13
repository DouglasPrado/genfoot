# Mobile — Finanças, Estrutura, Estádio e Diretoria

> **Status:** CANÔNICO · **Fontes:** docs/01-game-design/03-economia.md, docs/01-game-design/04-estrutura-do-clube-e-staff.md, docs/01-game-design/08-estadio-regiao-e-clima.md, docs/01-game-design/01-mundo-persistente-e-clubes.md · **Revisão:** 2026-07-11

A aba **Clube** (parte 1): finanças (visão, contabilidade, orçamento, comercial, bilheteria, dívidas), estrutura (instalações, staff, obras), estádio (bilheteria, obras, licenciamento) e diretoria (objetivos, intervenção). Fluxos: [MF-13](02-mobile-fluxos.md#mf-13--ciclo-financeiro-mensal), [MF-14](02-mobile-fluxos.md#mf-14--projeto-de-infraestrutura), [MF-16](02-mobile-fluxos.md#mf-16--crise-financeira), [MF-23](02-mobile-fluxos.md#mf-23--estádio-preço-manutenção-e-mando).

> **Nota:** coeficientes, faixas, custos e elasticidades usam a baseline versionada dos docs de origem. A UI usa faixas/rótulos qualitativos no modo simples e não congela valores no cliente.

---

## `M-FINANCE` — Finanças (visão)

- **Objetivo:** dar sinais claros da saúde financeira (traduz o modelo econômico em indicadores).
- **Como se chega:** aba Clube; Home; MF-13.
- **Layout:** cartões de indicadores + faixa de saúde + atalhos.
- **Componentes e dados** (tela financeira do [doc 10, §7.1](../01-game-design/10-experiencia-e-telas.md) + `ClubEconomy`): **caixa atual**, **receita mensal**, **despesa mensal**, **resultado mensal**, **folha salarial** (vs. teto), **orçamento de transferências**, **dívida**, **saúde financeira** (índice 0–100 em 6 faixas: Excelente/Estável/Atenção/Pressão/Crise/Colapso), **pressão da diretoria**, **meta financeira**, força de patrocínio; painel de **composição da receita** por fonte (TV, patrocínio, sócios, bilheteria, comercial/produtos, premiação, extraordinárias), com a linha de **direitos de TV** dependente de liga/divisão [`03 §4.1, §5.1, §7.2`].
- **Ações:** → `M-ACCOUNTING`, `M-BUDGET`, `M-COMMERCIAL`, `M-MATCHDAY-REVENUE`, `M-DEBT`.
- **Estados:** faixa de saúde colorida; alerta crítico de projeção → `M-DECISIONS`/[MF-16](02-mobile-fluxos.md#mf-16--crise-financeira).
- **Referências:** [`03-economia §3.1, §4.1, §5.1, §6, §7.2`](../01-game-design/03-economia.md); [`10-experiencia §7.1`](../01-game-design/10-experiencia-e-telas.md).

## `M-ACCOUNTING` — Contabilidade

- **Objetivo:** disciplina financeira: distinguir grandezas e reconhecer competência.
- **Componentes e dados:** **caixa** vs. **saldo bancário** vs. **valores restritos** vs. **orçamento autorizado** vs. **compromissos assumidos**; contas a pagar/receber; **dívidas**; patrimônio; resultado econômico; **regime de competência** (receita conquistada não recebida, despesa assumida não paga, pagamento antecipado, parcela futura, obrigação condicionada); histórico corrigido só por ajustes/reversões (não apagar); **reservas** (consumida/parcial/liberada/expirada).
- **Ações:** consultar lançamentos; ver reservas; abrir cenários (`M-BUDGET`).
- **Estados:** projeção de caixa recalculada; riscos/desvios destacados.
- **Referências:** [`03-economia §15`](../01-game-design/03-economia.md); [`13-relatorios §5.4`](../01-game-design/13-relatorios-notificacoes-e-memoria.md).

## `M-BUDGET` — Orçamento por áreas / cenários

- **Objetivo:** planejar a alocação e ver cenários.
- **Componentes e dados:** orçamento por área (folha, transferências, funcionários, infraestrutura, formação, operações, comercial, **reserva de emergência**); **cenários orçamentários** (esperado/conservador/otimista/com acesso/com permanência/com rebaixamento — folha pode prever redução por rebaixamento).
- **Ações:** realocar orçamento (com aprovação da diretoria); comparar cenários; solicitar aprovação (`M-BOARD`).
- **Estados:** realocação negada pela diretoria (motivo); sob intervenção, exige aprovação.
- **Referências:** [`03-economia §15.1, §15.3`](../01-game-design/03-economia.md).

## `M-COMMERCIAL` — Comercial / patrocínios

- **Objetivo:** gerir receita comercial.
- **Componentes e dados:** patrocinadores e ativos negociáveis (uniforme, placas/mídia do estádio, **naming rights**, conteúdo digital, patrocínio de treino/base, camarotes, experiências, campanhas); contrato comercial (valor fixo, bônus, metas, **exclusividade**, direitos, obrigações, penalidades, renovação); **entregas obrigatórias** (exibir marca, campanha, espaço, conteúdo, evento, hospitalidade); produtos/estoque/sazonalidade; **hospitalidade** como operação (capacidade/conversão/custo) distinta da bilheteria [`03 §9.8`]; reação de patrocinadores à imagem pública.
- **Ações:** vender/negociar ativos; cumprir entregas; gerir produtos; abrir **sócio-torcedor** (`M-MEMBERSHIP`) e **merchandising** (`M-PRODUCTS`) [`03 §9.6, §9.9`].
- **Estados:** descumprimento de entrega reduz pagamento/renovação; bloqueio de exclusividade sobreposta.
- **Referências:** [`03-economia §9.6–9.10`](../01-game-design/03-economia.md); [`11-torcida §17`](../01-game-design/11-torcida-imprensa-e-narrativa.md).

## `M-MATCHDAY-REVENUE` — Bilheteria / matchday

- **Objetivo:** projetar e gerir a renda de jogo em casa.
- **Componentes e dados:** público esperado; **preço de ingresso** (controle com trade-off ocupação×receita); ocupação; fatores (torcida, fase, rivalidade, competição, horário, clima, conforto, segurança, ídolos, sequência); custos de jogo em casa; **receita líquida** (não bruta); divisão de renda em copa/final.
- **Ações:** definir preço (command); ver por competição.
- **Estados:** preço alto irrita torcida/sócios; punições (portões fechados/campo neutro) removem bilheteria.
- **Referências:** [`03-economia §4.3, §5.2`](../01-game-design/03-economia.md); [`08-estadio §2`](../01-game-design/08-estadio-regiao-e-clima.md).

## `M-DEBT` — Dívidas / crédito

- **Objetivo:** gerir dívidas e financiamento.
- **Componentes e dados** (`Debt`): principal, juros, parcela mensal, vencimento, **tipo** (bancária, fiscal, atraso salarial, financiamento de estádio, empresários, parcelas de transferência); **estágios de crise/insolvência** (estável→atenção→pressão→crise→insolvência→reestruturação) com restrições; aporte/empréstimo da diretoria.
- **Ações:** tomar empréstimo; renegociar dívida; receber aporte (`M-BOARD`).
- **Estados:** inadimplência gera restrições de mercado/sanções; insolvência entra em reestruturação sem remover o usuário.
- **Referências:** [`03-economia §3.8, §10, §15.5`](../01-game-design/03-economia.md).

## `M-STRUCTURE` — Estrutura / instalações (árvore)

- **Objetivo:** ver e evoluir a estrutura física do clube.
- **Como se chega:** aba Clube; MF-14.
- **Layout:** árvore por ramos (Administração, Futebol, Saúde, Base, Marca, Infraestrutura) com cards por departamento.
- **Componentes e dados:** por núcleo, o **card canônico** ([doc 04, §7](../01-game-design/04-estrutura-do-clube-e-staff.md)): nível 1–5, faixa nomeada, custo/tempo de melhoria, custo mensal, benefícios, requisitos e impacto. Jurídico, financeiro, fisioterapia, marketing e áreas equivalentes aparecem como subdivisões dos seis núcleos ratificados; CT e estádio são infraestrutura física, não departamentos com nível concorrente. A tela também exibe marca, estilo derivado e ROI comparativo.
- **Ações:** abrir departamento (`M-DEPARTMENT`); escolher onde investir (define estilo).
- **Estados:** departamento "em obra/implantação" (contagem de dias); requisitos não atendidos bloqueiam upgrade.
- **Referências:** [`04-estrutura §2, §3, §7, §8`](../01-game-design/04-estrutura-do-clube-e-staff.md); [`03-economia §9.3, §9.10`](../01-game-design/03-economia.md).

## `M-DEPARTMENT` — Departamento (detalhe / upgrade)

- **Objetivo:** subir o nível de um departamento (projeto de obra/implantação).
- **Componentes e dados:** nível atual e faixa; custo inicial, custo mensal, tempo de implantação; benefício principal/secundário; **risco**; **checklist de requisitos** (dinheiro, reputação, nível mínimo do clube, estrutura compatível); perfil do departamento (quando aplicável: médica, comunicação, diretoria).
- **Ações:** **Iniciar upgrade** (`HighRiskConfirm` se caro; command); escolher perfil.
- **Estados:** "em construção" com marcos; trava anti-pular-etapas; risco de espiral de custo se crescer rápido demais.
- **Referências:** [`04-estrutura §2, §6, §10`](../01-game-design/04-estrutura-do-clube-e-staff.md); [MF-14](02-mobile-fluxos.md#mf-14--projeto-de-infraestrutura).

## `M-STAFF` — Comissão técnica / staff

- **Objetivo:** montar e avaliar a comissão.
- **Componentes e dados:** cargos (técnico/`HEAD_COACH` [**papel assessor** — sugere/assiste; **não** substitui o comando tático do usuário humano, R-01], auxiliar, preparador físico, médico, fisiologista, psicólogo, analista, olheiro, coordenador de base, diretor de futebol/financeiro/comunicação); atributos por cargo (ex.: auxiliar — leitura tática, sugestão, substituições, correção defensiva/ofensiva); **qualidade da comissão** e seu efeito nas sugestões (partida) e na IA offline; **relatório de profissionais** ([doc 13, §5.6](../01-game-design/13-relatorios-notificacoes-e-memoria.md): eficiência, sobrecarga, conflitos, necessidades).
- **Ações:** contratar/demitir (`M-STAFF-HIRE`); avaliar.
- **Estados:** competências por cargo derivam do catálogo de staff e do nível 1–5; o **técnico/`HEAD_COACH` é papel assessor** (sugere/assiste, conforme R-162) e **não** substitui o comando tático do usuário humano (R-01) — o usuário permanece o comandante tático. **Decisão (reversível, registrada 2026-07-13); registro formal no ADR (C-03).**
- **Referências:** [`04-estrutura §9`](../01-game-design/04-estrutura-do-clube-e-staff.md).

## `M-STAFF-HIRE` — Contratar / demitir funcionário

- **Objetivo:** mudar um membro da comissão.
- **Componentes e dados:** candidatos por nível (custo de contratação, salário mensal, tempo de implantação, benefícios, risco); comparação com o atual.
- **Ações:** contratar (command); demitir (`HighRiskConfirm`, custo de rescisão).
- **Estados:** requisitos de nível/orçamento.
- **Referências:** [`04-estrutura §6, §9`](../01-game-design/04-estrutura-do-clube-e-staff.md).

## `M-STADIUM` — Estádio

- **Objetivo:** gerir a casa do clube.
- **Componentes e dados** ([doc 08-estadio §1](../01-game-design/08-estadio-regiao-e-clima.md)): nome, localização, **capacidade**, condição estrutural, qualidade e tipo/dimensão do **gramado**, custo de manutenção, conforto, nível comercial, **status operacional** (ativo/em obra/interditado), histórico de obras, dono/uso (próprio/alugado); **mando de campo** (torcida + familiaridade + logística); **record book do estádio** (maior público, primeira partida, maior renda, reforma, despedida de ídolo).
- **Ações:** definir preço (`M-MATCHDAY-REVENUE`); **pagar/agendar manutenção**; **iniciar obra** (`M-STADIUM-WORKS`); contratar naming rights (`M-COMMERCIAL`); escolher campo alternativo; ajustar dimensão/estilo.
- **Estados:** negligência → deterioração; risco de interdição (`M-LICENSING`).
- **Referências:** [`08-estadio §1–3, §7–9, §13`](../01-game-design/08-estadio-regiao-e-clima.md).

## `M-STADIUM-WORKS` — Obras do estádio

- **Objetivo:** planejar e acompanhar obras.
- **Componentes e dados:** catálogo de obras (expansão de capacidade, conforto, comercial, reforma estrutural, gramado, iluminação, segurança, acessos/logística, modernização); cada obra com custo, tempo, risco; obra em andamento (capacidade reduzida, custo recorrente, risco de atraso, campo alternativo, reação da torcida); **dívida estrutural** de obra (financiamento longo com juros próprios); alerta de dimensionamento (expandir só com demanda).
- **Ações:** iniciar obra (`HighRiskConfirm`); acompanhar marcos; financiar (`M-DEBT`).
- **Estados:** atraso; reação negativa se endividado/time ruim.
- **Referências:** [`08-estadio §4–5, §13`](../01-game-design/08-estadio-regiao-e-clima.md); [MF-14](02-mobile-fluxos.md#mf-14--projeto-de-infraestrutura).

## `M-LICENSING` — Licenciamento / interdição

- **Objetivo:** garantir a aptidão do estádio/clube para competir.
- **Componentes e dados:** critérios de padrão mínimo por divisão (capacidade, segurança, iluminação, gramado, vestiários, transmissão, acessibilidade, condição); status (**plano de adequação / restrições / multas / impedimento**); **interdição** (motivo, custo, perda de mando); campo alternativo/aluguel; licenciamento competitivo do clube (financeiro, elenco, médica, base, conformidade).
- **Ações:** cumprir plano de adequação; agendar campo alternativo.
- **Estados:** impedimento de acesso / rebaixamento administrativo por falha de licença.
- **Referências:** [`08-estadio §6`](../01-game-design/08-estadio-regiao-e-clima.md); [`06-temporada §15.1`](../01-game-design/06-temporada-e-competicoes.md).

## `M-BOARD` — Diretoria / objetivos / intervenção

- **Objetivo:** relação com a diretoria: objetivos, autonomia e pressão.
- **Componentes e dados:** **objetivos** (esportivos/financeiros) e avaliação; **objetivos calibrados por estágio** do clube (novo revela jovens/reduz idade; médio briga por acesso; grande ganha título) [`06 §13.2`]; **pressão da diretoria**; **perfil da diretoria** (Conservadora/Negociadora/Ousada/Formadora/Financeira/Ambiciosa); **teto/alcance de contratação** por nível; **teto da divisão** (folha, overall médio, estrangeiros, reputação, estrutura) vs. o clube, com estado **"acima do teto → obrigado a subir"** [`06 §13.1`]; **estados de intervenção** ([doc 01, §1.3](../01-game-design/01-mundo-persistente-e-clubes.md)): aprovação obrigatória de gastos, limites de orçamento baixados, bloqueio de novas obrigações, exigência de vendas, metas corretivas, **plano de recuperação** — nunca demissão (autonomia, não permanência).
- **Ações:** solicitar aprovação/aporte; aceitar metas; ver briefing de temporada.
- **Estados:** sob intervenção, ações ficam condicionadas à aprovação; boa gestão amplia autonomia.
- **Referências:** [`04-estrutura §3.1, §5, §10`](../01-game-design/04-estrutura-do-clube-e-staff.md); [`01-mundo §1.3`](../01-game-design/01-mundo-persistente-e-clubes.md); [`06-temporada §13.1, §13.2`](../01-game-design/06-temporada-e-competicoes.md).
