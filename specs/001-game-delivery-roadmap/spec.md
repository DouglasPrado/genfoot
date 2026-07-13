# Feature Specification: Programa completo de entrega do Grinta

**Feature Branch**: `001-game-delivery-roadmap`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "Analisar a pasta docs e construir todas as features necessárias para construir o Grinta."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Enxergar todo o produto como entregas executáveis (Priority: P1)

Como dono do produto, quero um catálogo completo de features derivado da documentação canônica para saber exatamente o que já foi entregue, o que ainda falta e qual resultado cada entrega precisa produzir.

**Why this priority**: Sem uma decomposição completa, o desenvolvimento pode omitir capacidades essenciais ou implementar telas e infraestrutura antes de o universo do jogo fechar corretamente.

**Independent Test**: Comparar o catálogo com os contextos de domínio, fluxos completos, clientes e gates operacionais documentados; cada item deve estar coberto por ao menos uma feature e possuir resultado verificável.

**Acceptance Scenarios**:

1. **Given** a baseline documental ratificada, **When** o catálogo é consultado, **Then** todas as capacidades necessárias aparecem uma única vez com escopo, dependências, estado e evidência de conclusão.
2. **Given** uma capacidade já existente no repositório, **When** o catálogo é comparado ao código e ao histórico, **Then** ela é marcada como entregue ou parcial sem ser recriada como trabalho pendente integral.
3. **Given** uma capacidade futura, **When** a sua feature é lida isoladamente, **Then** o valor, os limites e o resultado testável são compreensíveis sem depender de decisões implícitas.

---

### User Story 2 - Executar na ordem que reduz risco (Priority: P2)

Como equipe de desenvolvimento, quero uma sequência de features com dependências explícitas para construir primeiro o núcleo headless e somente depois persistência definitiva, serviços, clientes e operação de produção.

**Why this priority**: O produto depende de determinismo, fechamento de temporada, conservação econômica e simulação prolongada; inverter a ordem aumenta retrabalho e pode mascarar falhas de domínio.

**Independent Test**: Percorrer o grafo de dependências e confirmar que toda feature pode começar quando suas predecessoras obrigatórias estiverem concluídas e que não existe ciclo.

**Acceptance Scenarios**:

1. **Given** o catálogo completo, **When** as dependências são ordenadas, **Then** forma-se uma sequência acíclica da fundação até a promoção para produção.
2. **Given** uma feature de interface ou operação, **When** suas dependências são examinadas, **Then** os contratos e comportamentos de domínio consumidos por ela já estão previstos em entregas anteriores.
3. **Given** uma feature independente dentro do mesmo marco, **When** outra frente está em andamento, **Then** ela pode ser executada em paralelo sem disputar ownership de escrita.

---

### User Story 3 - Provar cobertura e conclusão (Priority: P3)

Como responsável por qualidade e arquitetura, quero rastrear cada feature até fontes canônicas e critérios mensuráveis para impedir que “implementado” signifique apenas código existente sem evidência de correção.

**Why this priority**: O Grinta possui invariantes absolutas, bandas de calibração e gates operacionais que exigem evidência, não apenas presença de componentes.

**Independent Test**: Selecionar qualquer feature e seguir seus vínculos até documentos, critérios de aceite, invariantes e cenário de validação de ponta a ponta.

**Acceptance Scenarios**:

1. **Given** uma feature marcada como concluída, **When** sua evidência é auditada, **Then** todos os critérios bloqueantes aplicáveis estão verdes e reproduzíveis.
2. **Given** uma mudança futura de regra, **When** ela é incluída no portfólio, **Then** recebe nova versão, impacto explícito e gate de promoção sem reescrever fatos históricos.
3. **Given** uma lacuna descoberta durante implementação, **When** ela não pertence ao escopo atual, **Then** é registrada como nova feature ou ajuste rastreável, sem decisão implícita.

### Edge Cases

- Uma capacidade aparece em vários documentos com nomes diferentes: o catálogo usa o dicionário canônico, declara aliases e mantém um único owner.
- Uma feature está parcialmente implementada: o estado permanece parcial e lista as evidências ausentes; não é tratada como concluída nem reiniciada do zero.
- Duas features parecem depender uma da outra: a fronteira é quebrada por contrato de leitura ou evento, preservando um grafo acíclico.
- Uma interface está detalhada antes do domínio correspondente: a interface permanece bloqueada até o contrato autoritativo existir.
- Uma banda ou meta ainda não foi executada: ela é tratada como oráculo aprovado, não como resultado verde.
- Uma mudança afeta mundos vivos: fatos históricos permanecem vinculados à versão original e a mudança só vale a partir de uma versão futura efetiva.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: O programa MUST manter um catálogo único de features necessárias para entregar o produto descrito na baseline canônica.
- **FR-002**: O catálogo MUST cobrir mundo e temporada, clubes, jogadores, staff, competições, partidas, economia, mercado, identidade, narrativa, relatórios, administração, automação, eventing e clientes.
- **FR-003**: O catálogo MUST cobrir os fluxos completos de entrada, retorno, troca de clube, ciclo semanal, virada de temporada, partida, mercado, base, saúde, finanças, infraestrutura e crises.
- **FR-004**: Cada feature MUST declarar objetivo, escopo incluído, exclusões, dependências obrigatórias, resultado demonstrável e fontes documentais.
- **FR-005**: Cada feature MUST possuir um estado entre `DELIVERED`, `PARTIAL`, `PLANNED`, `BLOCKED` e `DEFERRED`, acompanhado da evidência que justifica o estado.
- **FR-006**: O programa MUST reconhecer como entregues as fundações verificáveis já presentes: kernel/backend, gênese determinística, scheduler persistente e ciclo diário básico de jogadores.
- **FR-007**: O programa MUST ordenar o núcleo headless antes da persistência definitiva, da API, do tempo real e dos clientes de usuário.
- **FR-008**: A ordem de entrega MUST preservar ownership único de escrita e MUST NOT conter dependências circulares.
- **FR-009**: Toda feature que altera estado competitivo MUST preservar determinismo, idempotência, isolamento entre mundos, histórico e versão de regras.
- **FR-010**: Toda movimentação econômica MUST ser rastreável e conservar valor conforme as regras de origem, destino, faucet e sink.
- **FR-011**: Toda feature de partida MUST usar um único comportamento autoritativo para execução automática, ao vivo, offline e replay.
- **FR-012**: Toda feature de IA MUST usar as mesmas ações e restrições disponíveis a um gestor e MUST produzir decisão explicável e reproduzível.
- **FR-013**: Clientes MUST permanecer não autoritativos e MUST consumir contratos oficiais de consulta, ação, evento e erro.
- **FR-014**: O programa MUST incluir evidências de testes unitários, propriedades, invariantes, contratos, integração, ponta a ponta, carga, segurança e recuperação conforme aplicável.
- **FR-015**: Features de ruleset e produção MUST permanecer bloqueadas enquanto qualquer condição aplicável do gate conjuntivo estiver vermelha.
- **FR-016**: O catálogo MUST separar trabalho necessário para o primeiro marco headless, MVP jogável, beta operacional e produção.
- **FR-017**: O programa MUST permitir acrescentar ou dividir features sem perder IDs, dependências e rastreabilidade das versões anteriores.
- **FR-018**: Nenhuma lacuna documental MUST ser preenchida implicitamente; divergências novas devem ser registradas com owner, impacto e critério de encerramento.

### Key Entities

- **Feature**: Unidade de entrega com identidade estável, objetivo, escopo, estado, marco, dependências, fontes e critérios de conclusão.
- **Dependency**: Relação direcionada que informa qual resultado precisa existir antes de outra feature começar ou terminar.
- **Milestone**: Conjunto coerente de features que produz um incremento demonstrável do produto.
- **Evidence**: Resultado verificável que sustenta o estado de uma feature, incluindo testes, relatórios, builds ou exercícios operacionais.
- **Canonical Source**: Documento normativo e seção que fundamentam escopo, regra ou critério.
- **Quality Gate**: Condição bloqueante composta por critérios determinísticos, bandas, invariantes e pré-condições operacionais.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% dos 12 contextos de domínio, 3 concerns transversais e 16 fluxos completos possuem cobertura explícita no catálogo.
- **SC-002**: 100% das features possuem ao menos uma fonte canônica, um resultado demonstrável, estado e dependências declaradas.
- **SC-003**: O grafo de dependências possui zero ciclos e zero feature planejada sem caminho até um marco do produto.
- **SC-004**: As quatro entregas já existentes são identificadas por evidência local e nenhuma é duplicada como trabalho integral pendente.
- **SC-005**: O primeiro marco headless inclui um caminho completo para criar o mundo, disputar e encerrar uma temporada e iniciar a seguinte durante 20 temporadas sem corrupção de estado.
- **SC-006**: Toda promoção de ruleset exige 100% de reprodução determinística, zero violação de invariante e aprovação de todas as condições aplicáveis do gate.
- **SC-007**: Uma pessoa da equipe consegue selecionar a próxima feature pronta para execução e localizar suas fontes e evidências esperadas em menos de cinco minutos.
- **SC-008**: Nenhuma feature de cliente é considerada concluída sem cobertura dos estados de carregamento, vazio, erro, bloqueio, offline e acessibilidade aplicáveis.

## Assumptions

- A baseline ratificada em 2026-07-13 e a hierarquia normativa da pasta `docs/` são a fonte de verdade do portfólio.
- “Construir todas as features” significa decompor e planejar todo o produto; a implementação ocorrerá feature a feature nas fases seguintes.
- O desenvolvimento continua no monorepo existente e preserva as entregas já validadas em branches anteriores.
- O primeiro produto técnico continua sendo o simulador headless; os clientes mobile e admin entram depois do fechamento do núcleo.
- Valores de primeira passada são oráculos versionados e podem ser recalibrados pelo processo formal sem alterar princípios ratificados.
- Identidade de marca, expansão internacional avançada e monetização podem avançar em marcos posteriores, sem bloquear o primeiro marco headless.
