ALTER TABLE "agent" ALTER COLUMN "temperature" SET DEFAULT 0.5;--> statement-breakpoint
ALTER TABLE "embeddings" drop column "file_id";--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "file_id" uuid GENERATED ALWAYS AS (CAST("embeddings"."custom_metadata"->>'fileId' AS UUID)) STORED;