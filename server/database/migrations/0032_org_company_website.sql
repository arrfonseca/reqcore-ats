-- Migration: Company website URL for org public-facing links
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS "company_website_url" text;
