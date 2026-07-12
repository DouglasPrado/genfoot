# Fluxos Completos do Jogo

> **Status:** Rascunho consolidado · **Fontes:** chats/escopo-definitivo-simulador.md (Seção 25), chats/documento-definitivo-escopo.md (Seção 23) · **Revisão:** 2026-07-11

## Resumo

Este documento reúne, em forma oficial, os **golden paths** ponta a ponta do **Grinta** — o manager de futebol online persistente. Cada fluxo descreve, como sequência numerada de passos, o caminho feliz de uma jornada do usuário, cruzando os sistemas do jogo (mundo, elenco, mercado, partida, finanças, estrutura, diretoria, torcida e história) e referenciando os documentos de detalhe correspondentes.

Os fluxos foram **consolidados a partir de duas fontes**: a Seção 25 de `chats/escopo-definitivo-simulador.md` (fluxos integrados, mais granular) e a Seção 23 de `chats/documento-definitivo-escopo.md` (fluxos completos end-to-end). Onde o mesmo fluxo aparece nas duas fontes, os passos foram unificados sem duplicação, preservando a granularidade da versão mais detalhada. Onde um fluxo existe em apenas uma fonte, ele foi mantido integralmente.

Estes fluxos representam a **experiência orientada por contexto** que guia o produto. Em cada tela e em cada momento, o usuário deve conseguir responder rapidamente: *o que mudou? o que exige ação? qual é o prazo? quem é o responsável? qual é a recomendação? qual é a consequência de não agir?* A interface prioriza dispositivos móveis, com aprofundamento progressivo, e permite que decisões offline sejam delegadas à inteligência autorizada do clube.

> **Como ler estes fluxos:** cada passo descreve um estado ou uma ação do caminho principal (feliz). Ramificações, exceções e regras de borda vivem nos documentos de detalhe linkados em cada seção. Fluxos que se cruzam (por exemplo, contratação → financeiro → inscrição) são navegáveis pelos links internos.

## Sumário

**A. Entrada e ciclo de vida do usuário**
1. [Criação e entrada em clube](#1-criação-e-entrada-em-clube)
2. [Retorno após ausência longa](#2-retorno-após-ausência-longa)
3. [Abandono ou troca de clube](#3-abandono-ou-troca-de-clube)

**B. Ciclo da temporada**
4. [Início de temporada](#4-início-de-temporada)
5. [Ciclo semanal de gestão](#5-ciclo-semanal-de-gestão)
6. [Encerramento / final de temporada](#6-encerramento--final-de-temporada)

**C. Partida**
7. [Preparação e partida](#7-preparação-e-partida)

**D. Mercado, elenco e base**
8. [Contratação de jogador](#8-contratação-de-jogador)
9. [Venda de jogador](#9-venda-de-jogador)
10. [Empréstimo de jogador](#10-empréstimo-de-jogador)
11. [Jornada de um jovem](#11-jornada-de-um-jovem)

**E. Elenco e saúde**
12. [Lesão e recuperação](#12-lesão-e-recuperação)

**F. Finanças e estrutura**
13. [Ciclo financeiro mensal](#13-ciclo-financeiro-mensal)
14. [Projeto de infraestrutura](#14-projeto-de-infraestrutura)

**G. Crises**
15. [Crise esportiva](#15-crise-esportiva)
16. [Crise financeira](#16-crise-financeira)

---

## A. Entrada e ciclo de vida do usuário

### 1. Criação e entrada em clube

*Como um usuário entra no mundo persistente e assume o comando de um clube — seja assumindo um clube existente, seja criando um clube novo (Liga Inicial).* Consolida `escopo-definitivo-simulador.md §25.7` + `documento-definitivo-escopo.md §23.1`.

1. O usuário escolhe um **mundo** existente.
2. O jogo **verifica elegibilidade e vagas** disponíveis.
3. São apresentados os clubes disponíveis ou o **Programa de Clube Novo** — o usuário decide **criar um clube novo** ou **assumir um clube disponível**.
4. O usuário consulta o **estado inicial** do clube: divisão, elenco, estrutura, dívidas, torcida e riscos.
5. O **aporte inicial** segue a regra de igualdade competitiva (sem vantagem por dinheiro real).
6. Uma **vaga pode ser reservada** por prazo curto, garantindo a escolha enquanto o usuário decide.
7. O **controle é ativado** na data válida:
   - **Clube novo** entra na **Liga Inicial** (com o **Programa de Clube Novo**) e passa por pré-temporada.
   - **Clube assumido** mantém integralmente seu estado (elenco, contratos, dívidas e histórico).
8. O usuário recebe a **revisão inicial**, sua **autoridade** e os **objetivos** definidos pela diretoria.
9. São definidos **objetivos, orçamento, profissionais, elenco e plano automático** (política offline).
10. **Pendências e políticas herdadas** do clube são apresentadas, para que o usuário saiba o que precisa de ação imediata.

**Referências:** [`./01-mundo-persistente-e-clubes.md`](./01-mundo-persistente-e-clubes.md) (mundo, clubes, Liga Inicial) · [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md) (onboarding, igualdade de aporte) · [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) (revisão inicial e telas).

---

### 2. Retorno após ausência longa

*Como o jogo reintegra um usuário que ficou ausente por um período prolongado, sem puni-lo e sem escondê-lo do que mudou.* Fonte: `escopo-definitivo-simulador.md §25.19`.

1. O jogo **identifica o período de ausência** do usuário.
2. **Consolida as mudanças do mundo** ocorridas no período (competições, mercado, economia).
3. **Consolida as mudanças do clube** (resultados, elenco, finanças, estrutura).
4. **Separa as decisões automáticas** tomadas pela inteligência e os **prazos perdidos** durante a ausência.
5. **Apresenta a situação atual** de forma resumida e contextual.
6. **Lista as ações urgentes** que exigem atenção imediata.
7. **Sugere uma ordem de recuperação e planejamento**, para que o usuário retome o controle de forma organizada.

**Referências:** [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) (decisões automáticas na ausência) · [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md) (consolidação e memória) · [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md) (política de continuidade).

---

### 3. Abandono ou troca de clube

*Como um usuário encerra o vínculo com um clube e, eventualmente, inicia outro — preservando o clube e a integridade competitiva.* Fonte: `documento-definitivo-escopo.md §23.7`.

1. O sistema **audita as ações recentes** do usuário (proteção antiabuso).
2. O usuário **encerra o vínculo**, preferencialmente **entre temporadas**.
3. O clube **mantém todos os recursos, problemas e contratos** — nada é apagado nem zerado.
4. A **inteligência assume imediatamente** o comando do clube, garantindo continuidade.
5. O usuário **cumpre período de espera** e restrições de negociação antes de novo vínculo.
6. Um **novo vínculo** pode ser iniciado em outro clube elegível.

> **Nota (reconciliação):** os parâmetros do período de espera e restrições de negociação pós-troca são definidos em [`09-anti-abuso-e-onboarding.md`](09-anti-abuso-e-onboarding.md) (consistentes com as regras de W.O. e abandono).

**Referências:** [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md) (troca de clube, W.O. e abandono) · [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) (assunção imediata pela IA).

---

## B. Ciclo da temporada

### 4. Início de temporada

*Como uma nova temporada é aberta no mundo e como os clubes se preparam para ela.* Fonte: `documento-definitivo-escopo.md §23.2`.

1. O mundo **encerra o ciclo anterior** (ver [Encerramento / final de temporada](#6-encerramento--final-de-temporada)).
2. **Divisões e participantes são confirmados**.
3. **Calendário e regulamentos são publicados**.
4. **Janelas e inscrições são abertas**.
5. Os clubes **definem orçamento, prioridades, elenco, base, treino e táticas**.
6. **Amistosos e preparação** (pré-temporada) ocorrem.
7. A **temporada oficial começa**.

**Referências:** [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) (calendário, divisões, regulamentos) · [`./03-economia.md`](./03-economia.md) (orçamento) · [`./05-motor-de-partida.md`](./05-motor-de-partida.md) (amistosos).

---

### 5. Ciclo semanal de gestão

*A rotina do gestor entre as rodadas — o loop central de jogo, orientado por contexto e urgências.* Fonte: `escopo-definitivo-simulador.md §25.8`.

1. O usuário abre a **Central** (painel do clube).
2. **Revisa urgências e agenda** — o que mudou e o que exige ação.
3. **Avalia a condição do elenco** (físico, moral, disponibilidade).
4. **Ajusta treino e recuperação**.
5. **Trata contratos e mercado** (renovações, propostas, alvos).
6. **Revisa finanças e estrutura** quando necessário.
7. **Prepara a próxima partida** (ver [Preparação e partida](#7-preparação-e-partida)).
8. **Define escalação e políticas offline** (delegação à inteligência autorizada).
9. **Acompanha ao vivo ou recebe o resultado** da rodada.
10. **Processa as consequências do pós-jogo** (moral, lesões, suspensões, finanças, imprensa).

**Referências:** [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) (ciclo do dia a dia, Central, antes/depois da rodada) · [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (condição e treino) · [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md) (urgências e agenda).

---

### 6. Encerramento / final de temporada

*Como o mundo fecha uma temporada, apura resultados, processa consequências e prepara o próximo ciclo — sem reiniciar o mundo persistente.* Consolida `escopo-definitivo-simulador.md §25.18` + `documento-definitivo-escopo.md §23.8`.

1. As **competições terminam** suas partidas; **recursos e pendências são resolvidos**.
2. Os **resultados são homologados**.
3. **Títulos, acessos e rebaixamentos** são confirmados e registrados.
4. **Premiações e bônus** são registrados e pagos.
5. **Objetivos e gestão** do usuário são avaliados pela diretoria.
6. **Contratos, opções e empréstimos** são processados (renovações, ativações, retornos).
7. **Jogadores evoluem, regridem ou se aposentam**; a **população de atletas** é tratada.
8. **Jovens mudam de categoria** e **novos talentos entram no mundo**.
9. **Finanças, reputações, torcida, rankings e recordes** são atualizados; a **economia do mundo** é revisada.
10. **Clubes são realocados nas divisões** e a **nova composição competitiva** é formada.
11. A **nova temporada é criada**, o **calendário é validado e publicado**.
12. A **pré-temporada é aberta** (encadeia com [Início de temporada](#4-início-de-temporada)).

**Referências:** [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) (homologação, acessos/rebaixamentos, realocação) · [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (evolução, regressão, aposentadoria) · [`./03-economia.md`](./03-economia.md) (premiações, revisão econômica) · [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) (reputação, recordes).

---

## C. Partida

### 7. Preparação e partida

*O caminho completo de uma partida — da entrada na agenda ao relatório pós-jogo, incluindo decisões ao vivo ou delegadas.* Consolida `escopo-definitivo-simulador.md §25.9` + `documento-definitivo-escopo.md §23.5`.

1. A **partida entra na agenda**.
2. A **comissão prepara o dossiê** do adversário.
3. O usuário **analisa adversário, calendário, elenco e condição**.
4. **Treinos específicos** são definidos para o confronto.
5. **Logística e estado médico** são confirmados.
6. A **escalação é preparada**: titulares, banco, tática e **plano automático** (offline).
7. O jogo **valida a elegibilidade** dos escalados (inscrição, suspensão, saúde).
8. A **partida começa** com o **estado oficial congelado**.
9. O **motor atualiza setores, físico, moral e eventos**; **pontos de decisão** são apresentados.
10. O **usuário ou a inteligência autorizada** envia decisões e intervém.
11. **Substituições, lesões e cartões** alteram o plano em tempo real.
12. A partida é **encerrada e homologada**; o **resultado é consolidado**.
13. **Pós-jogo:** estatísticas, suspensões, lesões, moral e finanças são processadas.
14. O **relatório explica os principais fatores** e alimenta os sistemas seguintes (elenco, saúde, imprensa, finanças).

**Referências:** [`./05-motor-de-partida.md`](./05-motor-de-partida.md) (motor, estado congelado, eventos, decisões ao vivo) · [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) (decisões delegadas) · [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) (partida ao vivo) · [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md) (relatório pós-jogo).

---

## D. Mercado, elenco e base

### 8. Contratação de jogador

*Da identificação da necessidade à integração do reforço ao elenco, passando por scouting, negociação, exame médico, validações e inscrição.* Consolida `escopo-definitivo-simulador.md §25.10` + `documento-definitivo-escopo.md §23.3`.

1. O clube **identifica uma necessidade** no elenco.
2. **Cria missão de observação / scouting** e recebe **relatórios com confiança e incerteza**.
3. **Compara candidatos** e avalia alternativas.
4. **Consulta a disponibilidade** dos alvos.
5. **Envia proposta** ao clube detentor (ou diretamente ao **jogador livre**).
6. O vendedor **responde, aceita ou contrapropõe**; negociam-se **termos esportivos e financeiros**.
7. **Reserva os recursos financeiros** necessários à operação.
8. O **jogador e o representante negociam o contrato pessoal** e as condições.
9. O **exame médico** verifica riscos.
10. A **situação financeira e a integridade competitiva** são validadas.
11. O **contrato é assinado** e o vínculo formalizado.
12. A **transferência é registrada** e os **pagamentos concluídos**.
13. O **jogador é inscrito** quando o regulamento permitir.
14. O jogador é **integrado ao elenco**; **moral, hierarquia, torcida e orçamento** são atualizados.

> **Nota (reconciliação):** os encadeamentos com o ciclo financeiro mensal e com o motor de inscrições seguem as regras de janela do catálogo técnico e da economia ([`../02-tecnico/10-catalogo-de-commands.md`](../02-tecnico/10-catalogo-de-commands.md), [`03-economia`](03-economia.md)).

**Referências:** [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (scouting, atributos, contratos) · [`./03-economia.md`](./03-economia.md) (reserva de recursos, pagamentos, hierarquia salarial) · [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) (janelas e inscrições) · [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md) (integridade da negociação) · [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) (reação da torcida).

---

### 9. Venda de jogador

*Como o clube responde a uma consulta ou proposta e conduz a saída de um atleta, avaliando impacto esportivo, financeiro e reputacional.* Fonte: `escopo-definitivo-simulador.md §25.11`.

1. Chega uma **consulta ou proposta** por um jogador do elenco.
2. O clube **avalia valor, papel e reposição** do atleta.
3. Os **funcionários apresentam uma recomendação**.
4. O usuário **aceita, rejeita ou contrapropõe**.
5. O **jogador avalia o destino** quando necessário (para operações que exigem seu aval).
6. O **acordo é formalizado**.
7. **Registro, contrato e pagamentos** são processados.
8. A saída **afeta elenco, torcida, finanças e história** do clube.

**Referências:** [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (valor, papel, reposição) · [`./03-economia.md`](./03-economia.md) (pagamentos, impacto financeiro) · [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) (recomendação dos funcionários) · [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) (reação da torcida e história).

---

### 10. Empréstimo de jogador

*O ciclo de um empréstimo — da negociação entre clubes ao desfecho (compra, prorrogação ou retorno).* Fonte: `escopo-definitivo-simulador.md §25.12`.

1. **Clube de origem e destino negociam** duração, salário e condições de uso.
2. O **jogador aceita o projeto**.
3. As **regras de inscrição** são validadas.
4. O jogador **atua pelo destino**, mantendo o **vínculo com a origem**.
5. **Minutos, condição e promessas** são acompanhados ao longo do empréstimo.
6. Uma **opção ou obrigação** de compra pode ser ativada.
7. Ao fim, ocorre **compra, prorrogação ou retorno** ao clube de origem.

**Referências:** [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (minutos, condição, promessas) · [`./03-economia.md`](./03-economia.md) (salário compartilhado, opção/obrigação) · [`./06-temporada-e-competicoes.md`](./06-temporada-e-competicoes.md) (regras de inscrição).

---

### 11. Jornada de um jovem

*Da captação à profissionalização — o caminho de formação de um jovem atleta, que permanece registrado como formação do clube.* Fonte: `documento-definitivo-escopo.md §23.4`.

1. O jovem é **encontrado por um canal de captação**.
2. O clube **observa ou o chama para teste**.
3. Define **vínculo e proteção** (contrato de formação).
4. Cria um **plano de carreira**.
5. O jovem **treina e disputa a categoria**.
6. Recebe **mentoria e avaliações**.
7. Pode **treinar com o elenco profissional**.
8. É **promovido, emprestado, vendido ou liberado** conforme sua prontidão.
9. A **profissionalização altera contrato e expectativas**.
10. Sua **trajetória permanece registrada** como formação do clube.

**Referências:** [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (captação, base, desenvolvimento, mentoria, plano de carreira) · [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md) (estrutura de base) · [`./13-relatorios-notificacoes-e-memoria.md`](./13-relatorios-notificacoes-e-memoria.md) (histórico e formação).

---

## E. Elenco e saúde

### 12. Lesão e recuperação

*Do evento da lesão ao retorno competitivo controlado, com o clube administrando tratamento, reabilitação e gestão de minutos.* Fonte: `escopo-definitivo-simulador.md §25.13`.

1. O **evento ocorre** em treino, partida ou contexto permitido.
2. Surge uma **avaliação inicial** da gravidade.
3. **Exames refinam o diagnóstico e o prazo**.
4. O clube **escolhe o tratamento** dentro das recomendações médicas.
5. O jogador **entra em reabilitação**.
6. As **restrições são reduzidas progressivamente**.
7. A **comissão avalia o retorno ao treino**.
8. A **medicina avalia o retorno competitivo**.
9. O usuário **administra minutos e risco** de recaída.

**Referências:** [`./02-sistema-de-jogadores.md`](./02-sistema-de-jogadores.md) (medicina, condição, reabilitação, gestão de minutos) · [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md) (departamento médico) · [`./05-motor-de-partida.md`](./05-motor-de-partida.md) (lesões em partida).

---

## F. Finanças e estrutura

### 13. Ciclo financeiro mensal

*O ciclo contábil e de caixa recorrente do clube, do reconhecimento de receitas ao ajuste de gastos sob supervisão da diretoria.* Fonte: `escopo-definitivo-simulador.md §25.14`.

1. O clube **recebe receitas** e **reconhece valores devidos**.
2. **Obrigações e parcelas** entram na agenda.
3. **Folha e custos** são processados.
4. **Reservas e orçamentos** são atualizados.
5. A **projeção de caixa é recalculada**.
6. **Riscos e desvios** são apresentados.
7. A **diretoria pode exigir correção**.
8. O usuário **ajusta gastos, vendas, crédito ou projetos**.

**Referências:** [`./03-economia.md`](./03-economia.md) (receitas, folha, reservas, projeção de caixa, crédito) · [`./10-experiencia-e-telas.md`](./10-experiencia-e-telas.md) (tela financeira) · [Crise financeira](#16-crise-financeira) (quando a projeção indica ruptura).

---

### 14. Projeto de infraestrutura

*O ciclo completo de um investimento em infraestrutura — da necessidade à operação e à manutenção contínua.* Fonte: `escopo-definitivo-simulador.md §25.15`.

1. Surge uma **necessidade** (capacidade, categoria de instalação, modernização).
2. O clube **avalia capacidade, custo e impacto**.
3. Realiza um **estudo de viabilidade**.
4. Busca **aprovação e financiamento**.
5. **Contrata o fornecedor**.
6. **Programa a obra** e as instalações alternativas durante o período.
7. **Acompanha marcos, custo e atraso**.
8. Realiza **inspeção e licenciamento**.
9. A **instalação entra em operação**.
10. **Manutenção e deterioração** passam a ser acompanhadas.

**Referências:** [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md) (estrutura, instalações, manutenção) · [`./08-estadio-regiao-e-clima.md`](./08-estadio-regiao-e-clima.md) (estádio e região) · [`./03-economia.md`](./03-economia.md) (financiamento, custo, deterioração).

---

## G. Crises

### 15. Crise esportiva

*Como o clube reage e se recupera quando os resultados ficam abaixo da expectativa — sem remover o usuário do comando.* Fonte: `escopo-definitivo-simulador.md §25.16`.

1. Os **resultados ficam abaixo da expectativa**.
2. **Moral, torcida e imprensa reagem**.
3. A **diretoria revisa objetivos e confiança**.
4. A **comissão identifica as causas**.
5. O usuário pode **ajustar tática, elenco, treino e comunicação**.
6. Se a crise continuar, a **diretoria pode reduzir a autonomia ou exigir um plano**.
7. O usuário **permanece no clube** e conduz a recuperação.

**Referências:** [`./05-motor-de-partida.md`](./05-motor-de-partida.md) (desempenho e tática) · [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) (reação de torcida e imprensa) · [`./07-inteligencia-artificial.md`](./07-inteligencia-artificial.md) (diagnóstico da comissão) · [`./04-estrutura-do-clube-e-staff.md`](./04-estrutura-do-clube-e-staff.md) (diretoria e confiança).

---

### 16. Crise financeira

*Como o clube atravessa uma ruptura de caixa — dos alertas às medidas, restrições e, no limite, reestruturação — sempre mantendo o usuário no comando.* Consolida `escopo-definitivo-simulador.md §25.17` + `documento-definitivo-escopo.md §23.6`.

1. A **projeção indica falta de caixa** ou descumprimento futuro — **obrigações e folha superam a capacidade** do clube.
2. O **financeiro alerta** prazos, obrigações, risco e projeção.
3. **Gastos discricionários podem ser congelados**.
4. O usuário **avalia vendas, renegociação, crédito, cortes ou uso da base**.
5. A **diretoria aprova ou impõe medidas**; um **plano de recuperação define metas**.
6. **Atrasos geram moral baixa e reputação ruim**.
7. A **inadimplência pode gerar restrições de mercado, sanções e perda de confiança**.
8. **Falha recorrente** pode provocar **perda de pontos, venda extrema ou saída de atletas**.
9. Em **insolvência**, o clube **entra em reestruturação sem remover o usuário**, que permanece e conduz a reconstrução.

**Referências:** [`./03-economia.md`](./03-economia.md) (projeção, renegociação, crédito, insolvência) · [`./09-anti-abuso-e-onboarding.md`](./09-anti-abuso-e-onboarding.md) (sanções e restrições) · [Ciclo financeiro mensal](#13-ciclo-financeiro-mensal) (origem dos alertas) · [Venda de jogador](#9-venda-de-jogador) (venda como medida de recuperação) · [`./11-torcida-imprensa-e-narrativa.md`](./11-torcida-imprensa-e-narrativa.md) (impacto reputacional).

---

> **Recomendação (a ratificar — R-94):** os ramos de exceção (recusas, disputas, recursos competitivos, timeouts de conexão em partida ao vivo, falhas parciais) serão detalhados num apêndice de fluxos de exceção como follow-up; caminho feliz e bordas principais já constam nos fluxos MF-* ([`../04-ui-ux/02-mobile-fluxos.md`](../04-ui-ux/02-mobile-fluxos.md)).
