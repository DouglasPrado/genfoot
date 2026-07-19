-- Automação (X-001): as regras ganham risco e prioridade — as duas colunas de
-- que as invariantes "alto risco não delegável" e "sem conflito de precedência"
-- dependiam — e o histórico imutável de versões (AutomationRuleVersion).
--
-- Migração cirúrgica: não reconcilia o drift alheio de FKs (dívida #40).

-- AutomationRule: risco (1..5) e prioridade.
ALTER TABLE "AutomationRule" ADD COLUMN "risk" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "AutomationRule" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- AutomationRuleVersion: o histórico congelado de cada regra.
CREATE TABLE "AutomationRuleVersion" (
  "id" UUID NOT NULL,
  "ruleId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "level" "AutomationLevel" NOT NULL,
  "status" "AutomationRuleStatus" NOT NULL,
  "triggerJson" JSONB,
  "conditionJson" JSONB,
  "actionJson" JSONB,
  "risk" INTEGER NOT NULL,
  "priority" INTEGER NOT NULL,
  CONSTRAINT "AutomationRuleVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AutomationRuleVersion_ruleId_version_key" ON "AutomationRuleVersion"("ruleId", "version");
CREATE INDEX "AutomationRuleVersion_ruleId_idx" ON "AutomationRuleVersion"("ruleId");

ALTER TABLE "AutomationRuleVersion"
  ADD CONSTRAINT "AutomationRuleVersion_ruleId_fkey"
  FOREIGN KEY ("ruleId") REFERENCES "AutomationRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
