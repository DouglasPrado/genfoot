# Research: programa completo de entrega do Grinta

## Decisão 1 — Portfólio em features verticais, não um épico monolítico

**Decision**: Manter uma spec mestre para governar o programa e um catálogo versionado de features verticais com IDs estáveis, dependências, marcos, estado, fontes e evidências. Os 12 bounded contexts definem ownership; os 16 golden paths são uma matriz de cobertura e aceite que atravessa as features.

**Rationale**: O produto cruza vários contextos em cada jornada. Uma feature por documento duplicaria regras; uma feature única para o jogo inteiro não seria estimável nem testável. O modelo em duas camadas preserva ownership e entrega valor ponta a ponta.

**Alternatives considered**:

- Uma feature única “construir o jogo”: rejeitada por não ser independentemente testável nem permitir avanço incremental.
- Uma feature por arquivo em `docs/`: rejeitada porque documentos possuem granularidades e sobreposições diferentes.
- Uma feature para cada golden path: útil para aceite, mas insuficiente como único recorte porque repetiria engines e agregados compartilhados.

## Decisão 2 — Núcleo headless antes de banco definitivo e clientes

**Decision**: Completar jogadores, clubes, competições, partida, economia, mercado, virada de temporada, IA e simulação longa no simulador antes de fechar persistência relacional, API, realtime e interfaces.

**Rationale**: `docs/02-tecnico/06-roadmap-de-implementacao.md` define essa ordem como canônica. O comportamento precisa fechar temporadas e conservar invariantes antes de ser moldado por banco ou UI.

**Alternatives considered**:

- API-first: rejeitada porque estabiliza contratos sobre comportamento ainda incompleto.
- Schema-first: o schema atual é scaffold; migrations definitivas antes dos testes longos aumentariam retrabalho.
- Mobile-first: rejeitada porque o cliente é não autoritativo e depende de contratos ainda inexistentes.

## Decisão 3 — Preservar as quatro fundações entregues

**Decision**: Tratar kernel/backend, gênese determinística, scheduler persistente e lifecycle diário básico de jogadores como `DELIVERED`, com novas features estendendo seus contratos.

**Rationale**: O código e os testes locais comprovam IDs tipados, data lógica, RNG PCG32/golden vector, criação/ativação do mundo, gênese de 16 clubes e 368 jogadores, 30 rodadas, scheduler com lease/fencing/retry e processamento diário idempotente de jogadores.

**Alternatives considered**:

- Replanejar tudo do zero: rejeitada por duplicar trabalho validado.
- Marcar todo o contexto Jogadores como entregue: rejeitada porque treino, medicina, base, aposentadoria e demografia longa ainda faltam.

## Decisão 4 — Monólito modular com domínio isolado e workers

**Decision**: Continuar em TypeScript estrito/Node.js 22 no monorepo PNPM/Turborepo. `packages/core` permanece headless e sem dependência de rede, banco ou interface; processos assíncronos consomem casos de uso e contratos públicos.

**Rationale**: A topologia ratificada reduz coordenação distribuída prematura, preserva testes rápidos e permite escalar workers e gateway independentemente quando houver evidência de carga.

**Alternatives considered**:

- Microsserviços por bounded context: rejeitados nesta fase pelo custo de consistência distribuída.
- Domínio dentro do framework de API: rejeitado por acoplar regras oficiais à infraestrutura.

## Decisão 5 — Persistência evolui de snapshots para PostgreSQL após o marco headless

**Decision**: Usar os snapshots JSON versionados como adapter de desenvolvimento até a simulação longa fechar; então materializar o catálogo físico em PostgreSQL/Prisma, com chaves de mundo, constraints, histórico e migrations expand-contract.

**Rationale**: O adapter atual torna replay e inspeção simples. A baseline exige PostgreSQL como fonte definitiva, mas proíbe tratar o scaffold Prisma como migrations finais antes de validar comportamento e constraints.

**Alternatives considered**:

- Manter JSON em produção: rejeitado por concorrência, consulta, integridade relacional e operação.
- Migrar imediatamente todo o scaffold: rejeitado porque B-06 exige ownership e constraints finais e o núcleo ainda não está completo.

## Decisão 6 — Eventos duráveis, idempotência e sagas nas fronteiras

**Decision**: Agregados mantêm transações locais; integrações usam eventos versionados, Outbox/Inbox, entrega pelo menos uma vez e consumidores idempotentes. Fluxos multiagregado usam process managers com checkpoints e compensações explícitas.

**Rationale**: Isso preserva um dono de escrita, quebra ciclos entre os 12 contextos e permite recuperar transferência, virada, onboarding e infraestrutura sem efeitos duplicados.

**Alternatives considered**:

- Escrita cruzada entre módulos: rejeitada por violar ownership e dificultar replay.
- Transação distribuída: rejeitada pelo custo e incompatibilidade com a topologia inicial.

## Decisão 7 — Um único kernel de partida

**Decision**: Partida automática, ao vivo, offline, lote e replay usam o mesmo kernel, timestep, manifesto e streams de RNG. Comandos táticos são entradas versionadas; não existe motor resumido paralelo.

**Rationale**: A equivalência é condição normativa e impede resultados distintos conforme presença do usuário ou modo de execução.

**Alternatives considered**:

- Motor simplificado offline: rejeitado por quebrar justiça e determinismo.
- Eventos aleatórios globais: rejeitados porque a ordem de consumo produziria deriva de replay.

## Decisão 8 — Economia por ledger conservativo

**Decision**: Toda movimentação financeira passa por ledger dobrado, reserva e liquidação idempotentes; faucet e sink são explícitos e reconciliáveis. Mercado depende dessa fundação.

**Rationale**: Transferências, salários, obras e premiações atravessam contextos. O ledger é o único meio de garantir que dinheiro não apareça nem desapareça sem causa.

**Alternatives considered**:

- Atualizar saldo diretamente no clube: rejeitado por perder origem, destino e auditabilidade.
- Implementar mercado antes da economia: rejeitado pela ordem canônica e por reservas/pagamentos indefinidos.

## Decisão 9 — IA usa os mesmos commands do humano

**Decision**: Strategic, Squad, Match e Narrative AI retornam decisão explicável e determinística e executam os mesmos commands, guards e projeções permitidas a um gestor.

**Rationale**: Evita privilégios ocultos, mantém auditabilidade e permite que clubes sem usuário sustentem mundos longos.

**Alternatives considered**:

- IA escrevendo estado diretamente: rejeitada por burlar invariantes.
- IA consultando potencial real oculto: rejeitada por quebrar igualdade informacional.

## Decisão 10 — Contratos únicos para API, realtime e clientes

**Decision**: Commands, queries, eventos e erros vivem em contratos compartilhados e versionados. Mobile Expo e admin Next.js são clientes não autoritativos; offline aceita leitura e apenas intents reversíveis na whitelist com TTL.

**Rationale**: Os dois clientes precisam observar o mesmo estado oficial e recuperar duplicatas/gaps sem duplicar regra.

**Alternatives considered**:

- Contratos específicos por cliente: rejeitados por deriva funcional.
- Fila offline para ações irreversíveis: rejeitada pelo risco de executar uma intenção vencida.

## Decisão 11 — Gate de promoção absoluto

**Decision**: Uma versão só é promovível quando G1–G8 estiverem verdes: determinismo, bandas de simulação/economia/demografia, zero invariante violada, critérios de aceite, ausência de regressão e metas operacionais.

**Rationale**: Os números ratificados são oráculos, não evidência já executada. O gate impede que código existente seja confundido com produto pronto.

**Alternatives considered**:

- Média ponderada de qualidade: rejeitada porque permitiria compensar corrupção ou não determinismo com métricas secundárias.
- Aprovação manual sem lote reproduzível: rejeitada por não produzir evidência auditável.

## Decisão 12 — Constituição ainda não impõe gates formais

**Decision**: Registrar que `.specify/memory/constitution.md` permanece um template sem princípios ratificados. Para este plano, aplicar voluntariamente os gates equivalentes já ratificados em `docs/`, sem alegar que o arquivo placeholder foi aprovado.

**Rationale**: Inventar conteúdo constitucional violaria governança; ignorar a baseline canônica perderia restrições essenciais.

**Alternatives considered**:

- Preencher a constituição implicitamente: rejeitado porque exige ato próprio de governança.
- Tratar placeholders como regras: rejeitado porque não há texto normativo executável.

## Decisão 13 — PostgreSQL/Prisma com constraints SQL complementares

**Decision**: Usar PostgreSQL como fonte autoritativa e Prisma como mapper/toolchain; exclusion constraints, locks, particionamento e outras garantias não expressáveis permanecem em migrations SQL revisadas e testadas.

**Rationale**: Isolamento por mundo, contrato principal único, resultado oficial único, ledger append-only e consumidores concorrentes exigem enforcement real no banco, não apenas validação na aplicação.

**Alternatives considered**:

- Banco documental: rejeitado pela força das invariantes relacionais e transacionais.
- Limitar o desenho ao que o ORM expressa: rejeitado porque perderia constraints e padrões de concorrência ratificados.

## Decisão 14 — BullMQ primeiro, broker dedicado somente por gatilho

**Decision**: Começar com Redis/BullMQ e manter ack, ordering, routing, redelivery e idempotência atrás de contratos. Migrar para RabbitMQ ou NATS somente quando G-CAP-8/R-160 for observado.

**Rationale**: A escala inicial não justifica outro serviço operacional; Outbox/Inbox preserva durabilidade independente do broker.

**Alternatives considered**:

- RabbitMQ desde a fundação: adiado até comandos duráveis/roteamento justificarem o custo.
- NATS JetStream desde a fundação: adiado; é preferível apenas se fan-out/streaming dominar.

## Decisão 15 — NestJS para API e Fastify apenas após profiling

**Decision**: Organizar a API em módulos NestJS alinhados aos bounded contexts. O adapter Fastify pode substituir o HTTP padrão caso medição demonstre necessidade, sem alterar contratos ou domínio.

**Rationale**: Injeção de dependência, módulos, gateways e integração com filas reforçam portas e a topologia ratificada.

**Alternatives considered**:

- Fastify puro: rejeitado como padrão porque perderia a estrutura modular escolhida.
- AdonisJS: rejeitado pelo acoplamento de estrutura/ORM conflitante com o desenho existente.

## Decisão 16 — Aritmética oficial em inteiros/fixed-point

**Decision**: Representar dinheiro em unidade mínima inteira e probabilidades, percentuais e multiplicadores em escalas inteiras canônicas. Arredondamento é explícito, versionado e coberto por golden tests.

**Rationale**: Conservação econômica e replay bit a bit não podem depender de arredondamento implícito ou float instável.

**Alternatives considered**:

- `number` livre para estado oficial: rejeitado por deriva entre cálculos e plataformas.
- Decimal monetário sem escala canônica para os demais atributos: insuficiente para o determinismo de todo o kernel.

## Decisão 17 — Busca relacional antes de serviço externo

**Decision**: Atender busca inicial com Full Text Search e trigram do PostgreSQL; Meilisearch/OpenSearch só entram após gargalo ou relevância insuficiente medidos.

**Rationale**: O volume de fundação cabe no banco autoritativo e não justifica outra projeção/infraestrutura desde o início.

**Alternatives considered**:

- Serviço de busca desde M1: rejeitado por custo operacional sem evidência de necessidade.

## Decisão 18 — Observabilidade e recuperação fazem parte da definição de pronto

**Decision**: Instrumentar correlação, logs, métricas e traces nos processos; validar carga, RPO/RTO, restore isolado e exercício regional antes de `OPS-001` concluir.

**Rationale**: Alertas e runbooks escritos não provam que um mundo, ledger ou dado pessoal pode ser recuperado dentro do objetivo.

**Alternatives considered**:

- Adiar observabilidade para depois do lançamento: rejeitado porque elimina a evidência exigida por G8.
- Considerar backup existente como restore aprovado: rejeitado porque recuperação precisa ser exercitada e medida.
