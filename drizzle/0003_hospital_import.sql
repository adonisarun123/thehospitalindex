ALTER TYPE "public"."payer_mode" ADD VALUE 'listed_by_hospital';--> statement-breakpoint
ALTER TYPE "public"."source_kind" ADD VALUE 'hospital_website';--> statement-breakpoint
ALTER TABLE "hospital_branch" ALTER COLUMN "settlement_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "hospital_branch" ADD CONSTRAINT "hospital_branch_published_needs_settlement" CHECK ("hospital_branch"."status" <> 'published' or "hospital_branch"."settlement_id" is not null);