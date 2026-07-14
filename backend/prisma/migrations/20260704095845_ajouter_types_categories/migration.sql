-- AlterTable
ALTER TABLE "products" ADD COLUMN     "category_type_id" TEXT;

-- CreateTable
CREATE TABLE "category_types" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "category_types_category_id_idx" ON "category_types"("category_id");

-- CreateIndex
CREATE INDEX "category_types_is_active_idx" ON "category_types"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "category_types_category_id_slug_key" ON "category_types"("category_id", "slug");

-- CreateIndex
CREATE INDEX "products_category_type_id_idx" ON "products"("category_type_id");

-- AddForeignKey
ALTER TABLE "category_types" ADD CONSTRAINT "category_types_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_type_id_fkey" FOREIGN KEY ("category_type_id") REFERENCES "category_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
