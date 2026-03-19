ALTER TABLE "chat" DROP CONSTRAINT "chat_agentId_agent_id_fk";
--> statement-breakpoint
ALTER TABLE "message" DROP CONSTRAINT "message_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "stream" DROP CONSTRAINT "stream_chatId_chat_id_fk";
--> statement-breakpoint
ALTER TABLE "chat" ADD CONSTRAINT "chat_agentId_agent_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."agent"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream" ADD CONSTRAINT "stream_chatId_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."chat"("id") ON DELETE cascade ON UPDATE no action;