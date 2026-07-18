-- R-191 (cumpre R-181) — o catálogo de moedas passa a existir.
--
-- Eram 17 colunas `currencyId @db.Uuid` apontando para uma tabela inexistente.
-- Nasce o catálogo, com a moeda-base semeada aqui (BRL, id canônico fixo). O
-- dinheiro é sempre BigInt em unidade mínima nela (R-181): `minorUnits = 2` são
-- os centavos do Real.
--
-- As FKs nascem só para as tabelas que C9 usa AGORA (FinancialAccount,
-- JournalEntry, JournalLine) mais GameWorld.currencyId. As outras ~13 entram
-- quando cada tabela for materializada, ou no gate DB (#40). Não é para reconciliar
-- o schema inteiro aqui.
--
-- Os mundos existentes têm currencyId NULL (a FK SET NULL os aceita) e as tabelas
-- financeiras estão vazias — a migração aplica sem tocar dado.

-- CreateTable
CREATE TABLE "Currency" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "minorUnits" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "Currency"("code");

-- AddForeignKey
ALTER TABLE "GameWorld" ADD CONSTRAINT "GameWorld_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialAccount" ADD CONSTRAINT "FinancialAccount_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_currencyId_fkey" FOREIGN KEY ("currencyId") REFERENCES "Currency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- A moeda-base: Real brasileiro. O id é canônico e fixo — o mesmo que as
-- fixtures e a gênese referenciam. Sem ele, todo mundo precisaria de um catálogo
-- semeado à parte antes de qualquer teste financeiro.
INSERT INTO "Currency" ("id", "code", "name", "symbol", "minorUnits")
VALUES ('019b76da-a800-7787-9462-49c009becccc', 'BRL', 'Real brasileiro', 'R$', 2);
