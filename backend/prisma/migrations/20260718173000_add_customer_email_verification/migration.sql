ALTER TABLE "customers"
ADD COLUMN "email_verified_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

CREATE TABLE "customer_email_verification_tokens" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "request_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_email_verification_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_email_verification_tokens_token_hash_key"
ON "customer_email_verification_tokens"("token_hash");

CREATE INDEX "customer_email_verification_tokens_customer_id_expires_at_idx"
ON "customer_email_verification_tokens"("customer_id", "expires_at");

CREATE INDEX "customer_email_verification_tokens_expires_at_used_at_revoked_at_idx"
ON "customer_email_verification_tokens"("expires_at", "used_at", "revoked_at");

ALTER TABLE "customer_email_verification_tokens"
ADD CONSTRAINT "customer_email_verification_tokens_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
