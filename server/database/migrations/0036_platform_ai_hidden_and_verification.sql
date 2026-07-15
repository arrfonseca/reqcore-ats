-- Hidden models + verification cache for SaaS Global AI model picker

CREATE TABLE IF NOT EXISTS "platform_ai_hidden_model" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "model_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_ai_hidden_model_provider_model_idx"
  ON "platform_ai_hidden_model" ("provider", "model_id");

CREATE TABLE IF NOT EXISTS "platform_ai_model_verification" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL,
  "model_id" text NOT NULL,
  "base_url" text DEFAULT '' NOT NULL,
  "ok" boolean NOT NULL,
  "error_message" text,
  "verified_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "platform_ai_model_verification_unique_idx"
  ON "platform_ai_model_verification" ("provider", "model_id", "base_url");
