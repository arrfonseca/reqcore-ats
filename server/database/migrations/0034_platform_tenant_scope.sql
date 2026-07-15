-- Platform tenant administration + SaaS console foundations

ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "status" text NOT NULL DEFAULT 'active';
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "legal_name" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "tax_id" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "phone" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "street" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "city" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "state" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "postal_code" text;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "country" text DEFAULT 'BR';
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "suspended_at" timestamp;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;
ALTER TABLE "organization" ADD COLUMN IF NOT EXISTS "suspended_reason" text;

UPDATE "user"
SET "platform_role" = 'saas_owner'
WHERE "platform_role" = 'saas_admin';

CREATE TABLE IF NOT EXISTS "tenant_subscription" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "plan_tier" text NOT NULL DEFAULT 'free',
  "status" text NOT NULL DEFAULT 'active',
  "external_customer_id" text,
  "current_period_end" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_subscription_organization_id_idx" ON "tenant_subscription" ("organization_id");

CREATE TABLE IF NOT EXISTS "platform_member" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'saas_owner',
  "scopes" jsonb,
  "invited_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_member_user_id_idx" ON "platform_member" ("user_id");

CREATE TABLE IF NOT EXISTS "platform_ai_config" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL DEFAULT 'Default',
  "provider" text NOT NULL DEFAULT 'openai',
  "model" text NOT NULL DEFAULT 'gpt-4o-mini',
  "api_key_encrypted" text,
  "base_url" text,
  "max_tokens" integer NOT NULL DEFAULT 4096,
  "input_price_per_1m" numeric(10, 4),
  "output_price_per_1m" numeric(10, 4),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tenant_ai_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "use_platform_ai" boolean NOT NULL DEFAULT true,
  "allow_own_llm" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "tenant_ai_settings_organization_id_idx" ON "tenant_ai_settings" ("organization_id");

CREATE TABLE IF NOT EXISTS "platform_country_locale" (
  "id" text PRIMARY KEY NOT NULL,
  "country_code" text NOT NULL,
  "name_display_format" "name_display_format" NOT NULL DEFAULT 'first_last',
  "date_format" "date_format" NOT NULL DEFAULT 'dmy',
  "default_language" text NOT NULL DEFAULT 'pt-BR',
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_country_locale_country_code_idx" ON "platform_country_locale" ("country_code");

INSERT INTO "platform_country_locale" ("id", "country_code", "name_display_format", "date_format", "default_language")
VALUES ('locale-br', 'BR', 'first_last', 'dmy', 'pt-BR')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "platform_integration_config" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "config_json" jsonb,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "platform_integration_config_provider_idx" ON "platform_integration_config" ("provider");

INSERT INTO "platform_integration_config" ("id", "provider", "enabled")
VALUES
  ('integ-google-calendar', 'google_calendar', false),
  ('integ-remotecal', 'remotecal', false)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS "ai_usage_daily" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "usage_date" date NOT NULL,
  "prompt_tokens" integer NOT NULL DEFAULT 0,
  "completion_tokens" integer NOT NULL DEFAULT 0,
  "estimated_cost_usd" numeric(12, 4) NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_daily_org_date_idx" ON "ai_usage_daily" ("organization_id", "usage_date");
