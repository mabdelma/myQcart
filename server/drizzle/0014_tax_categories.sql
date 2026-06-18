CREATE TABLE IF NOT EXISTS "tax_categories" (
  "id" text PRIMARY KEY,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "name" text NOT NULL,
  "rate" double precision DEFAULT 0 NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" text DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "tax_category_id" text REFERENCES "tax_categories"("id");
--> statement-breakpoint
ALTER TABLE "menu_items" ADD COLUMN "tax_exempt" boolean DEFAULT false NOT NULL;
