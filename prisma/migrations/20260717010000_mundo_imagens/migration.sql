-- Banner e foto quadrada do mundo.
--
-- Guarda a CHAVE do objeto no bucket, não a URL. Gravar
-- `https://cdn.oggiadmin.com.br/...` aqui assaria infraestrutura — e o domínio
-- de OUTRO projeto — dentro da linha do mundo: trocar de bucket ou de CDN
-- quebraria todo banner já salvo, sem migração possível a não ser reescrever
-- string. Quem compõe a URL pública é a borda, que conhece `R2_CDN_URL`.
ALTER TABLE "GameWorld" ADD COLUMN "bannerKey" TEXT;
ALTER TABLE "GameWorld" ADD COLUMN "squarePhotoKey" TEXT;
