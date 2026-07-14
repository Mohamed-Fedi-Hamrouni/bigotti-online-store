-- CreateEnum
CREATE TYPE "CategoryMenuGroup" AS ENUM ('HAUT', 'BAS', 'COSTUME_CEREMONIE', 'CHAUSSURES', 'ACCESSOIRES', 'AUTRE');

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "menu_group" "CategoryMenuGroup" NOT NULL DEFAULT 'AUTRE';

-- CreateIndex
CREATE INDEX "categories_menu_group_idx" ON "categories"("menu_group");
