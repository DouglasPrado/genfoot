# CLAUDE.md — genfoot (Grinta)

Processo obrigatório para trabalhar neste repositório. **Leia antes de escrever qualquer código.**
Existe porque uma execução anterior fez *slices* e declarou specs "concluídas" — isso é proibido (ver Anti-padrões).

---

## 1. O projeto em 30 segundos

- Monorepo **pnpm + turbo**. Domínio puro em `packages/core` (não importa adapters). Apps em `apps/simulator` e `apps/guide`.
- **SpecKit é a fonte da verdade.** As specs vivem em `specs/NNN-*/` e cada pacote tem: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/README.md`, `checklists/requirements.md` e (após `/speckit.tasks`) `tasks.md`.
- **Gate de qualidade** (TEM que estar verde antes de qualquer commit):
  ```bash
  pnpm lint && pnpm typecheck && pnpm test && pnpm build
  ```

---

## 2. O fluxo SpecKit (documentação oficial: github.com/github/spec-kit)

Ordem canônica dos comandos — **use os skills `/speckit.*`, não improvise**:

| # | Comando | Faz | Produz |
|---|---------|-----|--------|
| 1 | `/speckit.constitution` | Ratifica princípios do projeto (TDD, domínio puro, determinismo…) | `.specify/memory/constitution.md` |
| 2 | `/speckit.specify` | Descreve **o quê/por quê** (sem stack) | `spec.md` |
| 3 | `/speckit.clarify` | Remove ambiguidades por perguntas | seção Clarifications no `spec.md` |
| 4 | `/speckit.plan` | Estratégia técnica + design | `plan.md`, `data-model.md`, `research.md`, `quickstart.md`, `contracts/` |
| 5 | `/speckit.tasks` | Quebra o plano em tarefas ordenadas, com caminhos de arquivo e marcadores `[P]` | `tasks.md` |
| 6 | `/speckit.analyze` | Consistência cruzada spec↔plan↔tasks + cobertura (rodar **depois** de tasks, **antes** de implement) | relatório de gaps |
| 7 | `/speckit.implement` | **Executa TODAS as tarefas de `tasks.md`**, fase a fase, TDD, respeitando dependências e `[P]` | código + testes verdes |
| 8 | `/speckit.converge` | Avalia o código vs spec/plan/tasks e **acrescenta o que faltou como novas tarefas** | tarefas novas em `tasks.md` |

`/speckit.checklist` e `/speckit.taskstoissues` são opcionais.

---

## 3. Processo obrigatório por spec (não desvie)

Para cada spec, na ordem, apontando a feature ativa em `.specify/feature.json` (`{"feature_directory":"specs/NNN-..."}`):

1. **`/speckit.tasks`** — gere/atualize `tasks.md` cobrindo o **ESCOPO INTEIRO**: **todos** os commands e events do `contracts/README.md`, **todas** as entidades do `data-model.md`, **todas** as user stories (P1…Pn), testes e adapters. Se o `tasks.md` estiver sub-dimensionado, **regenere** — nunca apare à mão pra parecer pronto.
2. **`/speckit.analyze`** — corrija gaps/inconsistências **antes** de implementar.
3. **`/speckit.implement`** — é assim que as tarefas são feitas. Ele executa tudo em `tasks.md`, TDD (teste primeiro → falha → implementa → verde). **Não** implemente "um pedaço" à mão.
4. **Verifique o gate completo** (`lint && typecheck && test && build`). Resolva TODA falha. Rode teste e commit em **passos separados** (nunca `pnpm test | tail && git commit` — o pipe mascara o exit code).
5. **`/speckit.converge`** — se ele acrescentar tarefas, volte ao passo 3. Repita até `converge` não achar mais nada e `tasks.md` ter **zero `- [ ]`**.
6. Só então mude o `Status` da spec para `DELIVERED`, atualize `specs/README.md` + `001-.../validation/portfolio-completeness.md` **com evidência**, e commite.

---

## 4. Definição de PRONTO (uma spec só é `DELIVERED` quando TUDO isto vale)

A barra é a do próprio roadmap: *"DELIVERED covers only reproduced scope."* Um slice é **PARTIAL**, não pronto.

- [ ] **Todos** os commands do `contracts/README.md` implementados (método no aggregate **+** caso de uso).
- [ ] **Todos** os events emitidos onde o contrato manda.
- [ ] **Todas** as entidades do `data-model.md` existem **e persistem** (adapter real), não só em memória.
- [ ] **Todas** as user stories (P1…Pn) com seu teste independente verde.
- [ ] Evidência do `quickstart.md` reproduzida (os comandos rodam verdes).
- [ ] `/speckit.converge` não retorna novas tarefas; `tasks.md` sem `- [ ]`.
- [ ] Gate verde: `lint + typecheck + test + build`.

---

## 5. Anti-padrões (o que deu errado antes — NÃO repita)

- ❌ Implementar um "slice" (núcleo P1/P2) e declarar a spec `DELIVERED`. Slice = **PARTIAL**.
- ❌ Marcar tarefa `[x]` em `tasks.md` sem código + teste por trás.
- ❌ Pular `/speckit.analyze` e `/speckit.converge`.
- ❌ Implementar à mão em vez de dirigir por `/speckit.implement`.
- ❌ Usar golden paths como única prova — são testes de **convergência**, não a superfície completa da feature.
- ❌ Mascarar falha de teste (`pnpm test | tail && git commit`). Rode o teste, cheque o exit, commite depois.
- ❌ Tratar repositório em memória como "pronto" — o `data-model.md` exige adapter de persistência.
- ❌ Narrativa otimista. Reporte o estado real (o que está `DELIVERED` vs `PARTIAL` vs `PLANNED`).

---

## 6. Convenções de código (siga o que já existe em `packages/core`)

- **Aggregate:** classe `World<X>`, construtor privado, `static initialize(world)` e `static fromSnapshot(snapshot)` (valida invariantes), métodos de command retornando `Result<T, DomainError>` (`succeed`/`fail`), idempotência por evento ou por chave, ids determinísticos via `deterministicUuidV7`. **Nada** de `Date.now()`/`Math.random()` no domínio.
- **Casos de uso:** envolvem uma porta de repositório com **optimistic concurrency** (`expectedRevision`), salvando só quando a revisão muda.
- **Dinheiro:** inteiro em *minor units*, **nunca float**. `RulesetVersion` checada em todo command.
- **Testes:** `vitest`; um `Memory<X>Repository` para os casos de uso + testes diretos no aggregate. Cobrir idempotência (chave repetida = efeito único), transições terminais e isolamento por `worldId`.

---

## 7. Regras de commit / git

- Um commit por tarefa concluída ou grupo lógico (padrão SpecKit), mensagem `feat(<ID>): …` ou `test(<ID>): …`.
- Commite **apenas** com o gate completo verde. Nunca na `main`; sempre em branch `feat/*`.
- Termine a mensagem com:
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  ```
- Push/PR **só quando o usuário pedir**.

---

## 8. Estado atual (honesto — 2026-07-14)

- Cobertura ~**52% dos commands** e ~**60% dos events** do contrato; ~**151 tarefas `[ ]`** pendentes. **Nenhuma** spec é de fato `DELIVERED` (todas `PARTIAL`/`PLANNED`). Mapa em `specs/GAP-ANALYSIS.md`.
- Faltam subsistemas inteiros: sagas cross-context (X-002/SAGA-01/03), partida ao vivo (C8 US2), standings/homologação (C7 US2), dívida/fechamento (C9), conta/sessão (C1), caso/quarentena/correção (C12), apps de cliente (X-003) e **adapters de persistência** (só o BC-004 persiste).
- ⚠️ `.specify/memory/constitution.md` ainda é **placeholder**. Rode `/speckit.constitution` para ratificar os princípios (TDD, domínio puro, determinismo, owner único, conservação monetária) — assim `/speckit.implement` os impõe.
</content>
