-- Migration: Per-org light/dark branding logos (S3 keys)
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS "logo_light_key" text;
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS "logo_dark_key" text;
