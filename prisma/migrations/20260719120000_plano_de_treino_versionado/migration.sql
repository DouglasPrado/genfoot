-- R-214: TrainingPlan ganha concorrência otimista.
--
-- A rastreabilidade UX-API (§9) exige `expectedVersion` no SetTrainingPlan e a
-- INV-31 o cobre, mas a coluna nunca existiu: a trava estava declarada no doc e
-- era inexequível no banco. Dois aparelhos salvando o plano se sobrescreviam em
-- silêncio, que é exatamente o que a concorrência otimista existe para impedir.
--
-- `@@unique([gameWorldId, id])` acompanha por ser o par de referência das FKs
-- compostas por mundo (Decisão 19.8), como nos demais agregados de topo.

ALTER TABLE "TrainingPlan" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "TrainingPlan_gameWorldId_id_key" ON "TrainingPlan"("gameWorldId", "id");
