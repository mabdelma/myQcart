CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_phone" text,
	"customer_email" text,
	"party_size" integer NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"estimated_wait_minutes" integer DEFAULT 15,
	"notified_at" text,
	"seated_at" text,
	"notes" text,
	"source" text DEFAULT 'web' NOT NULL,
	"position" integer,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
