-- Migration: Add Brazilian contract type values to job_type enum
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'prazo_indeterminado';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'prazo_determinado';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'contrato_experiencia';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'trabalho_intermitente';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'teletrabalho';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'trabalho_temporario';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'aprendizagem';--> statement-breakpoint
ALTER TYPE "job_type" ADD VALUE IF NOT EXISTS 'contrato_pj';
