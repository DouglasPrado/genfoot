-- R-216: linha de base do desenvolvimento (derruba a trava B-07).
--
-- O potencial APROVEITÁVEL (R-12) é `base + margem × rendimento`, e a margem
-- precisa ser medida de um ponto FIXO. Sem esta coluna ela era medida da
-- habilidade atual, que sobe a cada ganho: o teto subia junto e convergia para
-- o potencial natural — a R-12 existia no doc e não travava nada no código.
--
-- Fica em `Player`, não em `PlayerDevelopment`: aquela tabela tem zero linhas e
-- todas as colunas obrigatórias sem default, então a base lá nasceria ausente
-- para todo jogador e a trava seguiria de pé com outra cara.
--
-- Jogador existente recebe a habilidade atual como base: é o que ele é hoje, e
-- a margem daqui para frente é o que a estrutura do clube vai render.

ALTER TABLE "Player" ADD COLUMN "baselineAbility" INTEGER;
UPDATE "Player" SET "baselineAbility" = "currentAbility" WHERE "baselineAbility" IS NULL;
ALTER TABLE "Player" ALTER COLUMN "baselineAbility" SET NOT NULL;
