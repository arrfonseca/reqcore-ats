-- Migration: Add internal ISCO occupation category to job table (not shown on public listings)
ALTER TABLE "job" ADD COLUMN "isco_category_id" text;
