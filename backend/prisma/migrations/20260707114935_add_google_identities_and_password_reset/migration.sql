-- CreateEnum
CREATE TYPE "IdentityProvider" AS ENUM ('GOOGLE');

-- CreateTable
CREATE TABLE "admin_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "provider_email" TEXT NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "request_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_identities" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "provider" "IdentityProvider" NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "provider_email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "request_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_identities_provider_email_idx" ON "admin_identities"("provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_identities_provider_provider_subject_key" ON "admin_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "admin_identities_user_id_provider_key" ON "admin_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "admin_password_reset_tokens_token_hash_key" ON "admin_password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "admin_password_reset_tokens_user_id_expires_at_idx" ON "admin_password_reset_tokens"("user_id", "expires_at");

-- CreateIndex
CREATE INDEX "admin_password_reset_tokens_expires_at_used_at_revoked_at_idx" ON "admin_password_reset_tokens"("expires_at", "used_at", "revoked_at");

-- CreateIndex
CREATE INDEX "customer_identities_provider_email_idx" ON "customer_identities"("provider_email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_provider_provider_subject_key" ON "customer_identities"("provider", "provider_subject");

-- CreateIndex
CREATE UNIQUE INDEX "customer_identities_customer_id_provider_key" ON "customer_identities"("customer_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "customer_password_reset_tokens_token_hash_key" ON "customer_password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "customer_password_reset_tokens_customer_id_expires_at_idx" ON "customer_password_reset_tokens"("customer_id", "expires_at");

-- CreateIndex
CREATE INDEX "customer_password_reset_tokens_expires_at_used_at_revoked_a_idx" ON "customer_password_reset_tokens"("expires_at", "used_at", "revoked_at");

-- AddForeignKey
ALTER TABLE "admin_identities" ADD CONSTRAINT "admin_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_password_reset_tokens" ADD CONSTRAINT "admin_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_identities" ADD CONSTRAINT "customer_identities_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_password_reset_tokens" ADD CONSTRAINT "customer_password_reset_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
