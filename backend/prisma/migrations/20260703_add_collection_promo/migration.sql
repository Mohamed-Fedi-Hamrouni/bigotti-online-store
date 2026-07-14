ALTER TABLE "collections"
ADD COLUMN "promo_is_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "promo_percentage" DECIMAL(5, 2),
ADD COLUMN "promo_start_date" TIMESTAMP(3),
ADD COLUMN "promo_end_date" TIMESTAMP(3);
