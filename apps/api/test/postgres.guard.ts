/**
 * A guarda de banco dos e2e da API — o espelho da que os testes de persistência
 * já tinham (`packages/persistence/tests/postgres.harness.ts`).
 *
 * Estes testes sobem o Nest, e desde R-173 o boot do Nest EXIGE `DATABASE_URL`
 * (o Postgres é o único armazenamento). Sem banco eles não podiam passar — mas
 * também não estavam pulando: explodiam no `beforeAll` com "DATABASE_URL não
 * definida" e derrubavam o `afterAll` atrás ("Cannot read properties of
 * undefined (reading 'close')"), deixando 7 arquivos vermelhos no gate padrão.
 *
 * Os testes de persistência já resolviam isso com `describe.skipIf(!hasDatabase)`,
 * anunciando o motivo no nome do describe. Os e2e da API nunca ganharam o mesmo
 * guard — foi por isso que `pnpm lint && pnpm typecheck && pnpm test && pnpm build`
 * (o gate do CLAUDE.md §1) não fechava em máquina nenhuma sem `TEST_DATABASE_URL`.
 *
 * Um teste PULADO se anuncia; um teste que explode por falta de ambiente vira
 * ruído que esconde regressão de verdade. A diferença importa para o gate.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

export const hasDatabase = TEST_DATABASE_URL !== "";

export const skipReason =
  "TEST_DATABASE_URL não definida. Estes e2e sobem o Nest, que exige Postgres (R-173). " +
  'Suba o banco e exporte a variável: TEST_DATABASE_URL="postgresql://grinta:grinta@localhost:5433/grinta_test?schema=public"';
