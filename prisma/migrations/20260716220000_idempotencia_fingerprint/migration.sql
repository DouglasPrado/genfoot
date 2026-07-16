-- `IDEMPOTENCY_KEY_REUSED` — errorCode COMUM de toda mutação no catálogo
-- canônico (`docs/02-tecnico/10-catalogo-de-commands.md:61`): "mesma
-- idempotencyKey com payload divergente". Não existia em lugar nenhum do código,
-- e a tabela não tinha como detectá-lo: sem o fingerprint do PEDIDO, a chave só
-- sabia que já fora usada, não com o quê.
--
-- O default '' é TEMPORÁRIO: existe só para preencher as linhas que já existem
-- (todas de teste — nada em produção chamava `tryClaim`) e cai em seguida. Se
-- sobrevivesse, um insert que esquecesse o campo pegaria '' calado, e toda chave
-- com fingerprint vazio casaria com toda outra: reúso viraria replay.

ALTER TABLE "IdempotencyKey" ADD COLUMN "requestFingerprint" TEXT NOT NULL DEFAULT '';
ALTER TABLE "IdempotencyKey" ALTER COLUMN "requestFingerprint" DROP DEFAULT;
