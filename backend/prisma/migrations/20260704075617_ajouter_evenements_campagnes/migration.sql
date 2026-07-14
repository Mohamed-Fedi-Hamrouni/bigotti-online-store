-- CreateEnum
CREATE TYPE "SaleCampaignType" AS ENUM ('REMISE_POURCENTAGE', 'REMISE_MONTANT_FIXE', 'ACHETEZ_X_OBTENEZ_Y', 'EVENEMENT_SIMPLE');

-- CreateEnum
CREATE TYPE "CampaignMediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterTable
ALTER TABLE "sale_campaigns" ADD COLUMN     "buy_quantity" INTEGER,
ADD COLUMN     "discount_value" DECIMAL(10,3),
ADD COLUMN     "display_on_home" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "free_quantity" INTEGER,
ADD COLUMN     "hero_subtitle" TEXT,
ADD COLUMN     "hero_title" TEXT,
ADD COLUMN     "media_path" TEXT,
ADD COLUMN     "media_type" "CampaignMediaType",
ADD COLUMN     "media_url" TEXT,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "type" "SaleCampaignType" NOT NULL DEFAULT 'EVENEMENT_SIMPLE';

-- CreateIndex
CREATE INDEX "sale_campaigns_is_active_idx" ON "sale_campaigns"("is_active");

-- CreateIndex
CREATE INDEX "sale_campaigns_display_on_home_idx" ON "sale_campaigns"("display_on_home");

-- CreateIndex
CREATE INDEX "sale_campaigns_type_idx" ON "sale_campaigns"("type");
