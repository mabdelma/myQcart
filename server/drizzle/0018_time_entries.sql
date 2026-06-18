CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "user_id" text NOT NULL REFERENCES "users"("id"),
  "clock_in" text NOT NULL,
  "clock_out" text,
  "total_hours" double precision,
  "notes" text,
  "created_at" text NOT NULL DEFAULT now(),
  "updated_at" text NOT NULL DEFAULT now()
);
