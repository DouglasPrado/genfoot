// B-06 · Prisma 7: a URL de conexão do datasource NÃO pode mais viver no
// `schema.prisma` (gera P1012). Ela é declarada aqui e consumida por Migrate /
// Introspect. Em runtime, o PrismaClient recebe `adapter` (conexão direta) ou
// `accelerateUrl` (Accelerate) — ver https://pris.ly/d/prisma7-client-config.
//
// Exportamos um objeto `PrismaConfig` puro (o loader do Prisma o normaliza via
// `defineConfig` internamente). Evitamos `import { defineConfig, env } from
// 'prisma/config'` de propósito: este projeto roda o CLI pela cache do npx, sem
// `node_modules` local, então esse import não resolve. `url` é opcional no
// config; quando `DATABASE_URL` não está setada, `validate` (que não conecta)
// segue funcionando.
export default {
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL,
  },
}
