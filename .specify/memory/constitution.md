<!--
Sync Impact Report
- Version change: (template/placeholder) → 1.0.0
- Ratification: initial adoption on 2026-07-14 (first concrete constitution; previously an unfilled template)
- Principles defined (7): I. Domínio Puro (Library-First) · II. Test-First (NÃO-NEGOCIÁVEL) ·
  III. Determinismo & Replay · IV. Owner Único & Isolamento por World ·
  V. Idempotência & Concorrência Otimista · VI. Conservação Monetária (dinheiro só em C9) ·
  VII. Contratos Versionados & Fatos Append-Only
- Added sections: "Restrições de Arquitetura & Qualidade" (Section 2), "Fluxo de Desenvolvimento (SpecKit)" (Section 3), Governance
- Removed sections: none
- Templates checked for alignment:
  ✅ .specify/templates/plan-template.md — "Constitution Check" já genérico; princípios cobrem os gates citados nos plan.md
  ✅ .specify/templates/spec-template.md — sem seções obrigatórias em conflito
  ✅ .specify/templates/tasks-template.md — categorização por user story + testes compatível com Test-First
  ✅ .claude/skills/speckit-*/SKILL.md — sem referências agent-specific desatualizadas exigindo mudança
  ✅ CLAUDE.md (raiz) — processo alinhado; §8 referencia esta ratificação
- Deferred TODOs: none
-->

# Grinta Constitution

Grinta (repo `genfoot`) é um simulador de futebol *headless*, determinístico e auditável, organizado
em bounded contexts. Esta constituição define os princípios NÃO-NEGOCIÁVEIS que todo código e todo
fluxo SpecKit devem respeitar. Ela **prevalece** sobre conveniência ou pressa.

## Core Principles

### I. Domínio Puro (Library-First)

Toda a lógica de negócio MUST viver em `packages/core` como domínio puro. O core NÃO MUST importar
adapters (Prisma/PostgreSQL, JSON, transporte, HTTP, UI). As portas (repository/transport) são
definidas no core; adapters e consumers dependem dos **contratos versionados**, nunca o contrário.
**Rationale:** mantém o núcleo testável em isolamento, reusável e livre de infraestrutura, e impede
que decisões de I/O vazem para as regras do jogo.

### II. Test-First (NÃO-NEGOCIÁVEL)

TDD é obrigatório. Nenhuma linha de implementação MUST ser escrita antes de um teste existir, ser
validado e **FALHAR** (ciclo Red → Green → Refactor). Os testes usam Vitest e cobrem unidade,
propriedade, contrato, integração e replay. Todo command MUST ter teste de **idempotência** (repetir
a mesma chave produz um único efeito), de **estado terminal** e de **isolamento por `worldId`**.
Um "slice" sem sua suíte de testes NÃO conta como implementado.
**Rationale:** é a única defesa contra "implementar pela metade e declarar pronto".

### III. Determinismo & Replay

Data lógica, seed/stream e `rulesetVersion` MUST ser explícitos e ficar no histórico. É PROIBIDO
`Date.now()`, `Math.random()` ou qualquer relógio/RNG global dentro do domínio — use `WorldDate`,
`SeededRandom` e `deterministicUuidV7`. A mesma seed + ruleset MUST produzir os mesmos hashes:
**online ≡ offline ≡ replay**.
**Rationale:** reprodutibilidade e auditoria são requisitos de produto (calibração, DR, replay).

### IV. Owner Único & Isolamento por World

Cada aggregate é o **único escritor** do seu estado. Consumers MUST integrar por IDs, queries,
commands ou eventos versionados — **sem escrita cruzada** em aggregate alheio. Toda escrita MUST
carregar `worldId`, `expectedVersion`, chave de idempotência e o ruleset aplicável, e MUST ser
isolada por mundo.
**Rationale:** preserva fronteiras de contexto e permite escala/particionamento por `worldId`.

### V. Idempotência & Concorrência Otimista

Todo command MUST ser idempotente por chave (retry seguro = um único efeito). Mutação MUST usar
concorrência otimista (`expectedVersion`/`revision`), salvando apenas quando a revisão muda. O commit
local precede a outbox; a integração/efeito cross-context ocorre **após** o commit.
**Rationale:** retry sem transação distribuída, sem efeitos duplicados.

### VI. Conservação Monetária (dinheiro só em C9)

Dinheiro existe **apenas** no ledger (C9 · Economia), em inteiro/*minor units*, **nunca** float.
Toda transação MUST ter ao menos duas partidas e soma algébrica **zero** por moeda; o residual global
do mundo MUST ser zero. Outros contexts referenciam valores/reservas por ID, mas não escrevem a razão.
**Rationale:** conservação é invariante do universo econômico; float e dono duplo corrompem o jogo.

### VII. Contratos Versionados & Fatos Append-Only

Evolução de contrato é **aditiva** dentro da major; quebra semântica cria nova major. Um evento
publicado NUNCA é reescrito. O histórico é **append-only** e as projeções são reconstruíveis a partir
dos fatos.
**Rationale:** garante compatibilidade de consumers e uma trilha auditável imutável.

## Restrições de Arquitetura & Qualidade

- Monorepo **pnpm + turbo**. Domínio em `packages/core`; apps em `apps/*`; tipos mínimos em
  `packages/shared`.
- **Gate obrigatório** — nenhum commit sem tudo verde:
  `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Padrão de aggregate: classe `World<X>`, construtor privado, `static initialize(world)` e
  `static fromSnapshot(snapshot)` (valida invariantes), métodos de command retornando
  `Result<T, DomainError>` (`succeed`/`fail`). Casos de uso envolvem a porta de repositório com
  concorrência otimista.
- **Definição de PRONTO (barra `DELIVERED`, "reproduced scope"):** uma spec só é `DELIVERED` quando
  TODOS os commands e events do `contracts/README.md` estão implementados, TODAS as entidades do
  `data-model.md` existem **e persistem** (adapter real, não só memória), TODAS as user stories têm
  teste independente verde, a evidência do `quickstart.md` é reproduzida, `/speckit.converge` não
  retorna novas tarefas e o `tasks.md` está sem `- [ ]`. Um slice é `PARTIAL`, não `DELIVERED`.

## Fluxo de Desenvolvimento (SpecKit)

O SpecKit é a fonte da verdade. Para cada spec, na ordem (ver `CLAUDE.md` §3):
`/speckit.constitution` (uma vez) → `/speckit.specify` → `/speckit.clarify` → `/speckit.plan` →
`/speckit.tasks` (cobrindo o ESCOPO INTEIRO) → `/speckit.analyze` → **`/speckit.implement`** (executa
todas as tarefas, TDD) → `/speckit.converge` (loop até zerar `[ ]`). Só então o `Status` da spec vira
`DELIVERED`, com `specs/README.md` e o portfolio-completeness atualizados **com evidência**.
Reporte sempre o estado real (`DELIVERED`/`PARTIAL`/`PLANNED`) — narrativa otimista é violação.

## Governance

Esta constituição prevalece sobre outras práticas. Emendas exigem: (a) justificativa escrita no Sync
Impact Report, (b) atualização dos templates dependentes (`plan`, `spec`, `tasks`) e do `CLAUDE.md`,
(c) bump de versão semântico. Versionamento: **MAJOR** para remoção/redefinição incompatível de
princípio; **MINOR** para novo princípio/seção ou expansão material; **PATCH** para clarificações.
Toda PR/revisão MUST verificar conformidade com estes princípios; complexidade fora deles MUST ser
justificada ou rejeitada. O `CLAUDE.md` é a guia operacional de runtime.

**Version**: 1.0.0 | **Ratified**: 2026-07-14 | **Last Amended**: 2026-07-14
