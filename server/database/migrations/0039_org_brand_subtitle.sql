-- Migration: Org brand subtitle (tagline) for white-label auth/public surfaces
ALTER TABLE "org_settings" ADD COLUMN IF NOT EXISTS "brand_subtitle" text;
