CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"tenant_id" text NOT NULL,
	"table_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text,
	"customer_phone" text,
	"party_size" integer NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"duration" integer DEFAULT 90 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"notes" text,
	"special_requests" text,
	"source" text DEFAULT 'web' NOT NULL,
	"deposit_amount" double precision DEFAULT 0,
	"deposit_payment_id" text,
	"reminder_sent" boolean DEFAULT false NOT NULL,
	"created_at" text DEFAULT now() NOT NULL,
	"updated_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."tables"("id") ON DELETE no action ON UPDATE no action;
