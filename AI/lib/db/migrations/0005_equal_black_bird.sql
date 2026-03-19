CREATE TABLE "agent_user" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"user_id" text,
	"invite_email" text,
	"invite_status" varchar DEFAULT 'pending',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_user" ADD CONSTRAINT "agent_user_agent_id_agent_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_user" ADD CONSTRAINT "agent_user_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_user_unique_index" ON "agent_user" USING btree ("agent_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_user_invite_email_index" ON "agent_user" USING btree ("agent_id","invite_email");