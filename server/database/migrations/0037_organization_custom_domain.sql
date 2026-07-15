CREATE TYPE "custom_domain_status" AS ENUM('pending', 'verified', 'disabled');

CREATE TABLE IF NOT EXISTS "organization_custom_domain" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "hostname" text NOT NULL,
  "status" "custom_domain_status" NOT NULL DEFAULT 'pending',
  "verification_token" text NOT NULL,
  "verified_at" timestamp,
  "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "organization_custom_domain_hostname_idx" ON "organization_custom_domain" ("hostname");
CREATE INDEX IF NOT EXISTS "organization_custom_domain_organization_id_idx" ON "organization_custom_domain" ("organization_id");
