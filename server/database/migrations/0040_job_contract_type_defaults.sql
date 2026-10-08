-- New enum values must be committed before they can be used.
UPDATE "job" SET "type" = 'prazo_indeterminado' WHERE "type" = 'full_time';--> statement-breakpoint
UPDATE "job" SET "type" = 'prazo_determinado' WHERE "type" IN ('part_time', 'contract');--> statement-breakpoint
UPDATE "job" SET "type" = 'aprendizagem' WHERE "type" = 'internship';--> statement-breakpoint
ALTER TABLE "job" ALTER COLUMN "type" SET DEFAULT 'prazo_indeterminado';
