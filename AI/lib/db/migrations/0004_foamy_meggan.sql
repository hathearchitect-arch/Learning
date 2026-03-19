ALTER TABLE "agent" ADD COLUMN "is_custom_metadata_filtering_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "custom_metadata_filter_function" varchar DEFAULT 'generic';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "custom_metadata_filter_config" jsonb;