-- Migration: Platform-level SaaS admin role (separate from org member roles)
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "platform_role" text;

UPDATE "user"
SET "platform_role" = 'saas_admin'
WHERE lower("email") = 'alessandro.fonseca@gmail.com'
  AND ("platform_role" IS NULL OR "platform_role" = '');
