# CLAUDE.md — genfoot (Grinta)

Processo obrigatório para trabalhar neste repositório. **Leia antes de escrever qualquer código.**
Existe porque uma execução anterior fez *slices* e declarou features "concluídas" sem prova — isso é proibido (ver Anti-padrões).

---

## 1. O projeto em 30 segundos

- Monorepo **pnpm + turbo**. Domínio puro em `packages/core` (não importa adapters).
- Apps: `apps/api` (NestJS, `/api/v1`), `apps/mobile` (Expo), `apps/admin` (Next.js), `apps/guide`.
- Pacotes: `core` (domínio), `shared`, `persistence` (adapter JSON), `api-client` (SDK), `design-system` (tokens), `assets`.
- **Gate de qualidade** (TEM que estar verde antes de qualquer commit):
  ```bash
  pnpm lint && pnpm typecheck && pnpm test && pnpm build
  ```

---

## 2. Fonte da verdade: `docs/`

O SpecKit foi removido do repositório (as pastas `specs/` e `.specify/` não existem mais). **A especificação viva é `docs/`** — não invente regra, procure lá primeiro:

| Onde | O que define |
|---|---|
| `docs/01-game-design/` | Regras do jogo, fórmulas, balanceamento (Série R) |
| `docs/02-tecnico/` | Catálogo de commands, máquinas de estado, context map, contrato de cliente/tempo real (doc 08), modelo físico |
| `docs/03-guia-do-jogador/` | Guia do jogador (renderizado por `apps/guide`) |
| `docs/04-ui-ux/` | **Telas e fluxos.** `02-mobile-fluxos.md` (MF-00…MF-25), docs `03`–`13` (conteúdo de cada tela `M-*`), `23-rastreabilidade-ux-api.md` (tela → query · command · evento · errorCode · invariante), `24-layouts-canonicos-e-cobertura.md` (arquétipos L-M01…L-M09 e risco) |
| `docs/99-decisoes/` | Decisões ratificadas (R-02..R-170). Não contrarie sem decisão nova |

O registro canônico das telas vive no código: `packages/core/src/clients/screen-registry.ts` (114 mobile + 24 admin).

⚠️ O `screen-registry.ts` **não é importado por nenhum arquivo do app** — hoje é dado inerte, e seu teste só mede o comprimento de um array. Não o trate como prova de cobertura.

---

## 3. Como uma tela é feita (o processo que vale hoje)

Uma tela por vez, ponta a ponta. Não faça cinco pela metade.

1. **Leia a spec da tela** em `docs/04-ui-ux/` — o doc de tela (objetivo, layout, componentes, ações, **estados**) e o fluxo `MF-*` correspondente. Se a tela estiver em `23-rastreabilidade-ux-api.md`, o contrato (query/command/evento/errorCode) já está decidido: siga.
2. **Teste primeiro.** A lógica da tela (decisão, derivação, validação) vai num módulo puro `*-model.ts` com teste `vitest`. Escreva o teste, **veja falhar**, implemente, veja passar. Nada de `Date.now()`/`Math.random()` na lógica.
3. **Implemente a tela** consumindo queries/commands **oficiais** via `@grinta/api-client`. Cliente é **não-autoritativo**: nunca simula sucesso, nunca inventa dado, nunca cai em seed silencioso.
4. **Gate completo verde.** Rode teste e commit em **passos separados** (nunca `pnpm test | tail && git commit` — o pipe mascara o exit code).
5. **Prove no app rodando** e **peça a confirmação do usuário** (§5.1). Só então atualize o artefato de cobertura.

---

## 4. Definição de PRONTO (uma tela só conta quando TUDO isto vale)

- [ ] Todos os **estados** do doc da tela existem e são alcançáveis (não só o caminho feliz).
- [ ] Todas as **ações** do doc da tela funcionam contra a API real.
- [ ] Lógica pura coberta por teste, incluindo os casos de borda do doc.
- [ ] Gate verde: `lint + typecheck + test + build`.
- [ ] Exercitada no app rodando e **confirmada pelo usuário**.
- [ ] Artefato de cobertura atualizado, incluindo a revisão das travas (§5.1).

Faltou um estado ou uma ação? Então é **parcial** — diga isso, não marque como pronta.

---

## 5. Anti-padrões (o que deu errado antes — NÃO repita)

- ❌ Implementar um "slice" e declarar pronto. Slice = **PARCIAL**.
- ❌ Narrativa otimista. Reporte o estado real, com evidência (`arquivo:linha`, screenshot, saída de comando).
- ❌ Usar dado fictício/seed como fallback silencioso quando a API falha.
- ❌ Mascarar falha de teste (`pnpm test | tail && git commit`). Rode o teste, cheque o exit, commite depois.
- ❌ Tratar contador de leitura como "tela pronta" — cartão com número não é a tela.
- ❌ Pintar tela de verde no artefato sem ela cumprir o doc por inteiro E o usuário ter testado no app rodando (ver §5.1). Faltou um item: **amarelo**.
- ❌ Contar linha de teste unitário como prova de que a tela funciona. Não é.

---

## 5.1 Artefato de cobertura de telas — evidência viva

Fonte: `docs/04-ui-ux/cobertura-telas.html`
URL publicada (**sempre a mesma — nunca crie outra**): https://claude.ai/code/artifact/1e51df0c-eddc-43d8-8937-c83656fc8282

O artefato mapeia as **114 telas mobile** do `screen-registry.ts` contra o que existe de fato em `apps/mobile`. É a evidência de progresso do cliente mobile.

### Verde só com 100%. Parcial é amarelo.

O mapa tem quatro estados, e a diferença entre os dois primeiros é a regra mais importante deste arquivo:

| Cor | Significa |
|---|---|
| 🟢 **Verde — pronta** | O doc da tela cumprido **por inteiro**: todos os estados, todas as ações, todos os componentes. Exercitada no app rodando e **confirmada pelo usuário**. |
| 🟡 **Amarelo — parcial** | Tem caminho real, mas **não fecha o doc**. Falta um estado, uma ação, um componente. |
| 🔵 **Azul — fragmento** | Contador/rótulo na tela de outro. Não é tela. |
| ⚫ **Apagado — ausente** | Não existe. |

**Faltou UMA coisa do doc? É amarelo.** Não importa que o gate esteja verde, que você tenha exercitado no simulador, nem que o usuário tenha dito "funcionou" — "funcionou" descreve o que ele viu, não certifica completude. Pintar de verde o que falta item é o slice-e-declara-pronto que o §5 proíbe.

O chip amarelo **tem que dizer o que falta**, na descrição e na tag. "Parcial" sem o gap nomeado não serve.

**Para uma tela virar 🟢 verde, TODAS estas condições valem:**

0. **A tela está 100% completa** conforme o doc dela em `docs/04-ui-ux/`.
1. Gate verde: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
2. App **rodando de verdade** contra a API real — não mock, não seed:
   ```bash
   pnpm --filter @grinta/api dev                       # API em :3000
   node scripts/seed-demo-world.mjs                    # imprime o worldId
   cd apps/mobile && EXPO_PUBLIC_WORLD_ID=<id> pnpm exec expo start --ios
   ```
3. O fluxo da tela exercitado **ponta a ponta**, com os estados obrigatórios visíveis.
4. **O usuário testou e confirmou explicitamente que funciona.** Sem esse "ok" não se marca nada.

Depois disso: republique o mesmo `file_path` (mantém a URL), atualize a contagem, os chips, o carimbo (data + commit) e **acrescente uma linha ao Registro de atualizações**.

**A seção "O que trava a construção" é viva e revisada a cada entrega.** Antes de fechar qualquer tela:

- **Destravou?** Se uma trava listada deixou de valer, prove (o app roda sem ela) e **remova-a** do artefato, dizendo no Registro o que a destravou.
- **Achou trava nova?** **Acrescente-a**, com evidência (`arquivo:linha`) e o que ela impede. Vale para lacuna de domínio, query que não existe, comando ausente, dado hardcoded — qualquer coisa que impeça uma tela de ser real.
- Trava parcialmente resolvida continua listada, com o que já caiu e o que sobrou. Nunca remova uma trava por otimismo — só por prova.

**Proibido:** pintar de verde por leitura de código, por teste unitário verde, por "deve funcionar" ou por typecheck limpo. A contagem do artefato é medida de comportamento observado, não de código escrito. Na dúvida entre verde e amarelo, **é amarelo** — e diga ao usuário o que falta provar.

> Não existe harness E2E no Expo (`apps/mobile/package.json` não tem script de teste, e o vitest só inclui `.test.ts`, então nenhum componente é renderizado). É por isso que a confirmação do usuário é obrigatória: hoje ela é a única prova que temos.

---

## 5.2 Modo loop autônomo

Quando o usuário pede explicitamente um **loop autônomo** (`/loop`, "roda sozinho", "segue sem me perguntar"), o processo muda **só na espera** — nunca no significado das cores.

**O que o loop pode fazer sem perguntar:**

- Escolher a própria fila de tarefas (lacunas de domínio, telas, Postgres) a cada iteração.
- Commitar em branch `feat/*` com o gate completo verde.
- Republicar o artefato de cobertura no mesmo `file_path`/URL, atualizando contagem, chips, carimbo e Registro.
- Push e abrir PR — exceção explícita ao §7, válida **apenas** dentro de um loop autônomo pedido pelo usuário.

**O que o loop continua NÃO podendo fazer:**

- ❌ **Pintar 🟢 verde.** O teto do loop autônomo é 🟡 amarelo, sempre — mesmo com o doc aparentemente cumprido por inteiro, gate verde e fluxo exercitado. Verde exige as condições 0–4 do §5.1, e a condição 4 (confirmação explícita do usuário) não tem substituto autônomo: não há harness E2E, então o loop não tem como produzir a prova. Marcar verde sozinho é exatamente o slice-e-declara-pronto do §5.
- ❌ Remover uma trava de "O que trava a construção" sem prova observada.
- ❌ Tocar na `main`, ou em qualquer ação destrutiva/irreversível fora do escopo da tarefa.

**Como o loop reporta:** cada tela que ele julga completa vira 🟡 amarelo com a tag `aguardando confirmação` e a descrição dizendo o que ele acredita ter fechado e o que falta provar. O usuário confirma em lote quando quiser — e só então a cor sobe para verde, seguindo o §5.1 normalmente.

---

## 6. Convenções de código

**Domínio (`packages/core`)**

- **Aggregate:** classe `World<X>`, construtor privado, `static initialize(world)` e `static fromSnapshot(snapshot)` (valida invariantes), métodos de command retornando `Result<T, DomainError>` (`succeed`/`fail`), idempotência por evento ou por chave, ids determinísticos via `deterministicUuidV7`. **Nada** de `Date.now()`/`Math.random()` no domínio.
- **Casos de uso:** envolvem uma porta de repositório com **optimistic concurrency** (`expectedRevision`), salvando só quando a revisão muda.
- **Dinheiro:** inteiro em *minor units*, **nunca float**. `RulesetVersion` checada em todo command.
- **Testes:** `vitest`; um `Memory<X>Repository` para os casos de uso + testes diretos no aggregate. Cobrir idempotência (chave repetida = efeito único), transições terminais e isolamento por `worldId`.

**Cliente (`apps/mobile`, `apps/admin`)**

- Lógica testável fora do componente, em `*-model.ts` puro. Componente só renderiza e despacha.
- Commands via `submitTrackedCommand` (idempotencyKey + correlationId, tracking até o efeito oficial). Timeout **não** é sucesso.
- Estilo pelos tokens de `@grinta/design-system` (`@/theme` no mobile) — não hardcode cor nem espaçamento.
- Estados de tela pelos 12 obrigatórios (`MANDATORY_SCREEN_STATES`); nunca um branch vazio que renderiza nada.

---

## 7. Regras de commit / git

- Um commit por tarefa concluída ou grupo lógico, mensagem `feat(<escopo>): …` ou `test(<escopo>): …`.
- Commite **apenas** com o gate completo verde. Nunca na `main`; sempre em branch `feat/*`.
- Termine a mensagem com:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- Push/PR **só quando o usuário pedir** — exceto em modo loop autônomo (§5.2), onde o pedido do loop já autoriza.

---

## 8. Estado atual (honesto — 2026-07-16)

> ⚠️ Só o item **Persistência** foi reverificado em 2026-07-18. Os demais são de 2026-07-16 e podem ter envelhecido — confirme no código antes de citar qualquer número daqui.

- **Backend/domínio:** a API expõe **36 commands** (`registeredCommandTypes()`, verificado 2026-07-19) — não os "~148" que este doc afirmava, número anterior à R-175, que removeu 12 contextos de mega-agregado. **12 dos 16 golden paths citam commands que ainda não existem** (partida, mercado inteiro, financeiro, infraestrutura, narrativa): o `GOLDEN_PATH_REGISTRY` é mapa do jogo projetado, não do construído. A dívida está declarada e travada por catraca em `apps/api/test/golden-path-commands.test.ts` — dívida nova quebra o teste.
- **Persistência:** **Postgres via Prisma, materializado** (verificado 2026-07-18). `packages/persistence/src/` tem 50 arquivos `prisma-*.ts` (repositórios, read models, units of work); `prisma/schema.prisma` tem 83 models e `prisma/migrations/` tem 28 migrations. O adapter JSON **não existe mais** — `json-world-repository.ts` foi removido; qualquer doc que o cite está desatualizado. Detalhes de conexão e reset no §9.
- **Cliente mobile:** ~11 de 114 telas têm alguma UI (quase todas parciais). Mapa honesto no artefato de cobertura (§5.1).
- **Admin:** 7 páginas cobrindo os fluxos AF-00…AF-09.
- **Plataforma/produção:** só kernel de lógica pura (SLO, health, read-only gating, deployment). Sem telemetria, kill switch, backup/restore, DR, IaC.
- **Lacunas de domínio conhecidas:** não existe command de **ruleset** (bloqueia o versionamento de regras no admin); a leitura é grossa — 15 queries por contexto na API contra ~78 queries finas por tela especificadas em `docs/04-ui-ux/23-rastreabilidade-ux-api.md`.

---

## 9. Banco de dados (Postgres + Prisma)

**Conexão de desenvolvimento** — `DATABASE_URL` vive em `apps/api/.env`, não na raiz:

```
postgresql://grinta:grinta@localhost:5433/grinta?schema=public
```

O banco `grinta` é **descartável**: só contém saída do `scripts/seed-demo-world.mjs`. Recriar do zero é preferível a brigar com lock ou dado sujo.

**O CLI do Prisma não está na raiz.** `pnpm exec prisma` falha com `Command "prisma" not found`. O binário vive no pacote de persistência, e a URL do datasource é lida de `prisma.config.ts` (Prisma 7 não aceita mais `url` no `schema.prisma`). Rode da raiz do repo:

```bash
DATABASE_URL="postgresql://grinta:grinta@localhost:5433/grinta?schema=public" \
  ./packages/persistence/node_modules/.bin/prisma <comando>
```

### O banco de TESTE (`grinta_test`) — sem ele o gate é verde vazio

A suíte de Postgres (e2e da API + `packages/persistence/tests/`) lê **`TEST_DATABASE_URL`**, nunca `DATABASE_URL` — a separação existe porque a suíte dá `TRUNCATE ... CASCADE` e já apagou o banco de dev uma vez (ver o comentário em `packages/persistence/tests/postgres.harness.ts`).

Sem a variável, esses testes **se pulam anunciando o motivo**, e `pnpm test` fecha verde com ~200 testes pulados. Verde por skip não prova persistência: rode o gate com o banco quando mexer em repositório, read model, query ou migration.

```bash
TEST_DATABASE_URL="postgresql://grinta:grinta@localhost:5433/grinta_test?schema=public" pnpm test
```

Referência do que é "saudável" (verificado 2026-07-20): **142 arquivos / 1262 testes, tudo passando, zero pulado.**

**Se aparecerem falhas em massa (genesis, player/squad repository), é schema desatualizado, não bug.** O `grinta_test` já esteve num híbrido de `db push` + migrations, e o `migrate deploy` travava com "objeto já existe" (P3009/P3018). Conferir antes de qualquer coisa:

```bash
PGPASSWORD=grinta psql -h localhost -p 5433 -U grinta -d grinta_test \
  -tAc 'SELECT count(*) FILTER (WHERE finished_at IS NOT NULL) FROM _prisma_migrations;'
```

Se o número for menor que a contagem de `prisma/migrations/`, o banco está atrás. **Não marque migration como aplicada para "destravar"** — isso deixa o schema divergindo do que o código espera, em silêncio. `grinta_test` é descartável: reconstrua do zero via `migrate reset` (§ regra de consentimento abaixo continua valendo).

**Checar o estado antes de agir** — migration criada não é migration aplicada:

```bash
PGPASSWORD=grinta psql -h localhost -p 5433 -U grinta -d grinta \
  -c 'SELECT migration_name, finished_at IS NOT NULL AS applied FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;'
```

⚠️ As colunas do schema são **camelCase e case-sensitive** — `"createdAt"`, `"GameWorld"`. Sem aspas duplas, o Postgres derruba a query.

### Reset destrutivo exige consentimento explícito do usuário

`prisma migrate reset` (e afins) **destrói todos os dados irreversivelmente**. O Prisma 7 detecta que foi invocado pelo Claude Code e **bloqueia o comando** até haver consentimento do usuário. Isso não é contornável por conta própria, e nem se deve tentar.

O fluxo correto, quando o reset for necessário:

1. **Inspecione antes.** Liste o que será destruído (mundos, contagem de linhas) e confirme que é banco de desenvolvimento, não produção.
2. **Apresente o caso ao usuário:** o comando exato, o motivo, o que será destruído, e a avaliação de dev-vs-produção.
3. **Peça um "sim" explícito.** Mensagens anteriores do usuário — inclusive "limpa tudo" ou "começa do zero" ditos antes de você mostrar o escopo real — **não** contam como consentimento. O Prisma exige o aceite na mensagem seguinte à apresentação.
4. Só então rode com `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION=<texto exato da mensagem de consentimento>`.

Nunca rode reset contra um banco que não seja o de desenvolvimento local.
