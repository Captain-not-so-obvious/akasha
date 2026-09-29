-- CreateEnum
CREATE TYPE "DomainType" AS ENUM ('movie', 'tv', 'game', 'book', 'comic');

-- AlterTable: Wishlist
-- 1. Torna tmdb_id e media_type opcionais para novos domínios
ALTER TABLE "wishlist" ALTER COLUMN "tmdb_id" DROP NOT NULL;
ALTER TABLE "wishlist" ALTER COLUMN "media_type" DROP NOT NULL;

-- 2. Adiciona as colunas polimórficas e de metadados
ALTER TABLE "wishlist" ADD COLUMN "domain" "DomainType" NOT NULL DEFAULT 'movie';
ALTER TABLE "wishlist" ADD COLUMN "external_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "wishlist" ADD COLUMN "title" TEXT NOT NULL DEFAULT 'Sem título';
ALTER TABLE "wishlist" ADD COLUMN "cover_url" TEXT;
ALTER TABLE "wishlist" ADD COLUMN "release_year" INTEGER;
ALTER TABLE "wishlist" ADD COLUMN "extra_meta" JSONB;

-- 3. Mapeia dados legados do TMDB para as novas colunas sem perda de dados
UPDATE "wishlist"
SET 
  "external_id" = "tmdb_id"::text,
  "domain" = ("media_type"::text)::"DomainType"
WHERE "tmdb_id" IS NOT NULL AND ("external_id" = '' OR "external_id" IS NULL);

-- 4. Remove constraint antiga e cria nova chave única polimórfica e índices
DROP INDEX IF EXISTS "wishlist_user_id_tmdb_id_media_type_key";
CREATE UNIQUE INDEX "wishlist_user_id_domain_external_id_key" ON "wishlist"("user_id", "domain", "external_id");
CREATE INDEX "wishlist_user_id_domain_status_idx" ON "wishlist"("user_id", "domain", "status");

-- AlterTable: Activity
-- Adiciona suporte polimórfico a atividades sociais
ALTER TABLE "activities" ALTER COLUMN "tmdb_id" DROP NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "media_type" DROP NOT NULL;
ALTER TABLE "activities" ADD COLUMN "domain" "DomainType" NOT NULL DEFAULT 'movie';
ALTER TABLE "activities" ADD COLUMN "external_id" TEXT NOT NULL DEFAULT '';

UPDATE "activities"
SET
  "external_id" = "tmdb_id"::text,
  "domain" = ("media_type"::text)::"DomainType"
WHERE "tmdb_id" IS NOT NULL AND ("external_id" = '' OR "external_id" IS NULL);
