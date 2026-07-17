import { createPrismaClient, type PrismaClient } from "../src/prisma-connection.js";

/**
 * Harness dos testes que falam com o Postgres de verdade (R-173).
 *
 * A ida-e-volta de snapshot só é prova se atravessar o banco real: um mock
 * concorda com qualquer decomposição errada, inclusive as que perdem dado.
 *
 * ---
 *
 * **`TEST_DATABASE_URL`, nunca `DATABASE_URL`.** Esta separação custou os dados
 * do usuário: a suíte dá `TRUNCATE ... CASCADE` a cada teste, lia
 * `DATABASE_URL`, e essa é a MESMA variável que a API de dev usa. Rodar o gate
 * depois de criar um mundo apagava o mundo — 16 clubes, participações,
 * controles, a cadeia de eventos inteira. O admin abria vazio e parecia bug de
 * tela.
 *
 * Um teste destrutivo não pode herdar a URL de produção/dev por descuido de
 * ambiente. Aqui ele exige uma variável PRÓPRIA, e ainda recusa apontar para o
 * banco de dev mesmo que alguém a copie — porque copiar é exatamente o que
 * acontece quando a variável parece "a mesma coisa".
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

/**
 * A guarda: o banco tem de se CHAMAR `*_test`.
 *
 * Comparar `TEST_DATABASE_URL` com `DATABASE_URL` seria frágil — depende de a
 * outra variável estar setada neste processo, e não está no CI. O nome do banco
 * é uma propriedade do alvo, não do ambiente: `grinta_test` não é `grinta` em
 * lugar nenhum, e ninguém aponta para o banco de dev por acidente quando a
 * convenção é essa.
 *
 * `TRUNCATE` não tem desfazer. A mensagem tem de dizer o que fazer — falhar com
 * "URL inválida" manda o próximo debugar a suíte em vez do ambiente.
 */
function assertTestDatabase(): void {
  if (TEST_DATABASE_URL === "") return;
  const name = databaseName(TEST_DATABASE_URL);
  if (name.endsWith("_test")) return;
  throw new Error(
    `TEST_DATABASE_URL aponta para o banco "${name}", que não termina em "_test".\n` +
      "A suíte dá TRUNCATE ... CASCADE a cada teste: apontá-la para o banco de " +
      "desenvolvimento apaga os mundos, os clubes e a cadeia de eventos.\n\n" +
      "  docker exec grinta-postgres createdb -U grinta grinta_test\n" +
      "  export TEST_DATABASE_URL=postgresql://grinta:grinta@localhost:5433/grinta_test\n",
  );
}

function databaseName(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//u, "");
  } catch {
    return url;
  }
}

assertTestDatabase();

export const DATABASE_URL = TEST_DATABASE_URL;
export const hasDatabase = DATABASE_URL.trim() !== "";

export const skipReason =
  "TEST_DATABASE_URL não definida — a suíte precisa de um banco SÓ DELA, porque " +
  "trunca a cada teste. Crie com `docker exec grinta-postgres createdb -U grinta " +
  "grinta_test` e exporte a URL. Sem banco, round-trip não é prova.";

export function connect(): PrismaClient {
  return createPrismaClient(DATABASE_URL);
}

/**
 * Limpa as tabelas tocadas por um teste. TRUNCATE ... CASCADE em vez de delete
 * por tabela: a ordem das FKs muda a cada porta migrada, e um teste que quebra
 * por ordem de limpeza esconde o defeito real.
 */
export async function truncate(
  client: PrismaClient,
  tables: readonly string[],
): Promise<void> {
  if (tables.length === 0) return;
  const list = tables.map((t) => `"${t}"`).join(", ");
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE;`);
}
