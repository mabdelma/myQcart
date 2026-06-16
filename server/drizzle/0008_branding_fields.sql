ALTER TABLE "tenant_groups" DROP CONSTRAINT "tenant_groups_owner_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "accent_color" text DEFAULT '#5C4033';--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "favicon_url" text;--> statement-breakpoint
ALTER TABLE "tenants" ADD COLUMN "custom_domain" text;