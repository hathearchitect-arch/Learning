create EXTENSION if not exists vector;

--> statement-breakpoint
CREATE TABLE "access_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"code" text NOT NULL,
	"assigned_to" text NOT NULL,
	"comments" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_by" text,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now () NOT NULL,
	CONSTRAINT "access_code_code_unique" UNIQUE ("code")
);

--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);

--> statement-breakpoint
CREATE TABLE "agent" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"instructions" text DEFAULT 'You are a friendly assistant! Keep your responses concise and helpful.' NOT NULL,
	"model" text NOT NULL,
	"temperature" real DEFAULT 1,
	"greeting" json DEFAULT '["Hello there!","How can I help you today?"]' NOT NULL,
	"font" text DEFAULT 'Inter',
	"avatar" text,
	"logo_s3_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"monthly_query_limit" integer DEFAULT 100 NOT NULL,
	"theme" text,
	"theme_attributes" json,
	"is_tool_knowledgebase_enabled" boolean DEFAULT true NOT NULL,
	"tool_knowledgebase_settings" json DEFAULT '{"maxResults":5,"minSimilarityScore":0.5,"isCustomFilteringEnabled":false}' NOT NULL,
	"is_tool_code_generation_enabled" boolean DEFAULT false NOT NULL,
	"is_tool_image_generation_enabled" boolean DEFAULT false NOT NULL,
	"is_tool_query_database_enabled" boolean DEFAULT false NOT NULL,
	"user_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL,
	"updated_at" timestamp DEFAULT now () NOT NULL,
	CONSTRAINT "agent_slug_unique" UNIQUE ("slug")
);

--> statement-breakpoint
CREATE TABLE "agent_folder" (
	"id" uuid DEFAULT gen_random_uuid () NOT NULL,
	"agent_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL,
	"updated_at" timestamp DEFAULT now () NOT NULL,
	CONSTRAINT "agent_folder_agent_id_folder_id_pk" PRIMARY KEY ("agent_id", "folder_id")
);

--> statement-breakpoint
CREATE TABLE "agent_suggested_action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"agent_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL,
	"updated_at" timestamp DEFAULT now () NOT NULL
);

--> statement-breakpoint
CREATE TABLE "apikey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"user_id" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer,
	"remaining" integer,
	"last_request" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"permissions" text,
	"metadata" text
);

--> statement-breakpoint
CREATE TABLE "chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"userId" text NOT NULL,
	"agentId" uuid NOT NULL,
	"visibility" varchar DEFAULT 'private' NOT NULL
);

--> statement-breakpoint
CREATE TABLE "document" (
	"id" uuid DEFAULT gen_random_uuid () NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"text" varchar DEFAULT 'text' NOT NULL,
	"userId" text NOT NULL,
	CONSTRAINT "document_id_createdAt_pk" PRIMARY KEY ("id", "createdAt")
);

--> statement-breakpoint
CREATE TABLE "embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"file_id" uuid,
	"chunks" text NOT NULL,
	"metadata" json,
	"custom_metadata" jsonb,
	"embedding" vector (1024) NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL
);

--> statement-breakpoint
CREATE TABLE "file" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"name" text NOT NULL,
	"folder_id" uuid,
	"organization_id" text NOT NULL,
	"s3_key" text,
	"type" varchar,
	"size" integer,
	"description" text,
	"is_vectorized" boolean DEFAULT false NOT NULL,
	"metadata" json,
	"tags" json,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL,
	"updated_at" timestamp DEFAULT now () NOT NULL
);

--> statement-breakpoint
CREATE TABLE "folder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now () NOT NULL
);

--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"inviter_id" text NOT NULL
);

--> statement-breakpoint
CREATE TABLE "member" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp NOT NULL
);

--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"chatId" uuid NOT NULL,
	"role" varchar NOT NULL,
	"parts" json NOT NULL,
	"attachments" json NOT NULL,
	"createdAt" timestamp NOT NULL
);

--> statement-breakpoint
CREATE TABLE "organization" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"plan" varchar DEFAULT 'free' NOT NULL,
	"plan_expires_at" timestamp DEFAULT NOW () + INTERVAL '2 weeks' NOT NULL,
	"created_at" timestamp NOT NULL,
	"metadata" text,
	CONSTRAINT "organization_slug_unique" UNIQUE ("slug")
);

--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"active_organization_id" text,
	"impersonated_by" text,
	CONSTRAINT "session_token_unique" UNIQUE ("token")
);

--> statement-breakpoint
CREATE TABLE "stream" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"chatId" uuid NOT NULL,
	"createdAt" timestamp NOT NULL
);

--> statement-breakpoint
CREATE TABLE "suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
	"documentId" uuid NOT NULL,
	"documentCreatedAt" timestamp NOT NULL,
	"originalText" text NOT NULL,
	"suggestedText" text NOT NULL,
	"description" text,
	"isResolved" boolean DEFAULT false NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp NOT NULL
);

--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp,
	CONSTRAINT "user_email_unique" UNIQUE ("email")
);

--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);

--> statement-breakpoint
CREATE TABLE "vote" (
	"chatId" uuid NOT NULL,
	"messageId" uuid NOT NULL,
	"isUpvoted" boolean NOT NULL,
	CONSTRAINT "vote_chatId_messageId_pk" PRIMARY KEY ("chatId", "messageId")
);

--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "agent" ADD CONSTRAINT "agent_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "agent_folder" ADD CONSTRAINT "agent_folder_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "agent_folder" ADD CONSTRAINT "agent_folder_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "agent_suggested_action" ADD CONSTRAINT "agent_suggested_action_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "embeddings" ADD CONSTRAINT "embeddings_file_id_file_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_folder_id_folder_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folder" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "file" ADD CONSTRAINT "file_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_parent_id_folder_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folder" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "folder" ADD CONSTRAINT "folder_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_inviter_id_user_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "member" ADD CONSTRAINT "member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user" ("id") ON DELETE cascade ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "stream" ADD CONSTRAINT "stream_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_documentId_documentCreatedAt_document_id_createdAt_fk" FOREIGN KEY ("documentId", "documentCreatedAt") REFERENCES "public"."document" ("id", "createdAt") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
ALTER TABLE "vote" ADD CONSTRAINT "vote_messageId_message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."message" ("id") ON DELETE no action ON UPDATE no action;

--> statement-breakpoint
CREATE INDEX "embeddingIndex" ON "embeddings" USING hnsw ("embedding" vector_cosine_ops);

--> statement-breakpoint
CREATE INDEX "chunksIndex" ON "embeddings" USING gin (to_tsvector ('simple', "chunks"));

--> statement-breakpoint
CREATE INDEX "metadataIndex" ON "embeddings" USING gin ("custom_metadata" jsonb_ops);