# Conta global e Postgres como único armazenamento — R-172, R-173

> **Status:** CANÔNICO / RATIFICADO · **Data:** 2026-07-16 · **Autoridade:** decisão do dono do produto · **Escopo:** persistência e contexto de identidade (C1)

## Por que existe

O marco **M2** do [plano](../../CLAUDE.md) exigia "Materializar PostgreSQL/Prisma", e as specs de M2 foram marcadas `DELIVERED` sobre um **adapter JSON**: um arquivo por mundo, ~1,6 MB, com o mundo inteiro serializado. O `prisma/schema.prisma` existia com 75 models, sem migrations e sem nenhum código usando `PrismaClient` — desenho, não infraestrutura.

Ao materializar o banco, a primeira porta travou numa contradição que já estava registrada como pendência aberta em [R-171](provedor-de-identidade-2026-07-16.md), e que o JSON escondia porque aceita qualquer forma:

| | `UserAccount` — [`02-modelo-de-dados.md §6.3.1`](../02-tecnico/02-modelo-de-dados.md) e `prisma/schema.prisma` | `AccountSnapshot` — `packages/core/src/identity` |
|---|---|---|
| escopo | **global** (plataforma, sem `gameWorldId`) | **por mundo** (`gameWorldId`) |
| identidade | `email` normalizado, `@unique` | `idempotencyKey` |
| vínculo com mundo | `WorldParticipant (gameWorldId, userId)` | não usa |

São entidades diferentes. Escrever `AccountSnapshot` em `UserAccount` exigiria inventar `email` e `name`, descartar `gameWorldId` e criar uma conta por mundo num campo `@unique` — que o Postgres rejeita no segundo mundo. Não é detalhe de mapeamento: é divergência de modelo, e o banco a tornou intransponível.

## Decisões ratificadas

### R-172 — A conta é global; o domínio se dobra ao modelo canônico

`UserAccount` é entidade de **plataforma**, global, sem `gameWorldId`, com e-mail normalizado único — como [R-85](registro-de-decisoes.md) ("conta é fonte de verdade"), o `02-modelo-de-dados.md §6.3.1` e o `prisma/schema.prisma` já determinavam. O vínculo por mundo é `WorldParticipant`, com `unique(gameWorldId, userId)`.

**O modelo físico está certo; foi `packages/core` que divergiu.** A correção é no domínio, não no schema.

Consequências aceitas:

- `WorldIdentity`, hoje um agregado por mundo que possui `accounts`, deixa de possuí-las. Contas, credenciais, sessões e refresh tokens são de plataforma; o agregado por mundo fica com participações, reservas, controles e cooldowns, referenciando `userId` global.
- `identity:register-account` deixa de ser command de mundo.
- O app usa `mobile-account:${subject}` como chave de conta por mundo; passa a resolver a conta global pelo `sub` do provedor (R-171).
- O e-mail do `UserAccount` é espelhado do Clerk no primeiro acesso: o provedor autentica, a conta do jogo continua sendo a fonte de verdade (R-85).

### R-173 — Postgres é o único armazenamento; o adapter JSON é descontinuado

O `JsonWorldRepository` sai. Não haverá dois armazenamentos convivendo: dado partido entre arquivo e banco, sem transação atravessando, é pior que qualquer um dos dois sozinho.

A migração é **porta por porta** (são 16), cada uma verificável, mas o destino é único: nenhuma porta permanece em JSON. Enquanto houver porta não migrada, o estado é **parcial e declarado como tal** — nunca "pronto".

### Pendências abertas

- **Gate DB-01..DB-16 continua devido.** A migration atual é de desenvolvimento. O próprio `schema.prisma` avisa: produção exige antes as constraints PostgreSQL não expressáveis no Prisma e a conversão das FKs world-scoped restantes em compostas.
- **`UserCredential.passwordHash` segue sem uso** (R-171): quem detém credencial é o Clerk. A tabela existe no schema; decidir se some ou fica reservada.
- **Ciclo de vida entre provedor e jogo:** apagar um usuário no Clerk não desfaz nada no jogo. Com conta global e FK, isso passa a deixar `WorldParticipant` e `ClubControl` órfãos de forma visível.

## Efeito

Desbloqueia o `PrismaWorldRepository` e o gate M2. Não altera R-85 nem R-171: materializa o que ambas já diziam.
