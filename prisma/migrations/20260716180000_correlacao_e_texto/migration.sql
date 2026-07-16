-- `correlationId` e `causationId` vêm do CLIENTE — o contrato do envelope
-- sempre disse `z.string().min(1)` (doc 08: "identificador de correlação para
-- rastreio", sem tipo). O schema os declarava @db.Uuid, e o primeiro cliente
-- que mandasse "c1" derrubava o append de eventos com erro de banco.
--
-- Constranger a Uuid um valor que não controlamos não compra nada: não há join
-- por eles, e o custo é trocar rastreio por 500.
ALTER TABLE "DomainEventLog" ALTER COLUMN "correlationId" TYPE TEXT,
ALTER COLUMN "causationId" TYPE TEXT;
