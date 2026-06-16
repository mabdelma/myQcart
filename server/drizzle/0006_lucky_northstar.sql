CREATE TABLE "tenant_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"owner_user_id" text,
	"created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "group_id" text;--> statement-breakpoint
ALTER TABLE "tenant_groups" ADD CONSTRAINT "tenant_groups_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_group_id_tenant_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."tenant_groups"("id") ON DELETE no action ON UPDATE no action;