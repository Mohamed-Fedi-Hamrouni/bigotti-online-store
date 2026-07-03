ALTER TABLE "product_images"
ADD COLUMN "color" TEXT;

CREATE INDEX "product_images_product_id_color_idx"
ON "product_images"("product_id", "color");