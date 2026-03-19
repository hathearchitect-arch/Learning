ALTER TABLE "organization" ADD COLUMN "theme" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "font" text DEFAULT 'Inter';--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "logo_s3_key" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "chat_help_url" text DEFAULT 'https://gocaddie.ai/';