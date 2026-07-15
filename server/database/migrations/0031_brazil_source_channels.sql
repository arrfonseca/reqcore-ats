-- Migration: Add Brazilian job board source channels
ALTER TYPE "source_channel" ADD VALUE IF NOT EXISTS 'vagas_com';--> statement-breakpoint
ALTER TYPE "source_channel" ADD VALUE IF NOT EXISTS 'catho';--> statement-breakpoint
ALTER TYPE "source_channel" ADD VALUE IF NOT EXISTS 'infojobs';--> statement-breakpoint
ALTER TYPE "source_channel" ADD VALUE IF NOT EXISTS 'adecco';--> statement-breakpoint
ALTER TYPE "source_channel" ADD VALUE IF NOT EXISTS 'manpower';
