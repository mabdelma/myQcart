CREATE TABLE "expo_push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"token" text NOT NULL,
	"device_info" text,
	"created_at" text DEFAULT now() NOT NULL,
	CONSTRAINT "expo_push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "expo_push_tokens" ADD CONSTRAINT "expo_push_tokens_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
