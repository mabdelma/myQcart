CREATE TABLE IF NOT EXISTS "gift_cards" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "code" text NOT NULL,
  "initial_balance" double precision NOT NULL,
  "current_balance" double precision NOT NULL,
  "expires_at" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" text NOT NULL DEFAULT now(),
  "updated_at" text NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "gift_card_redemptions" (
  "id" text PRIMARY KEY NOT NULL,
  "tenant_id" text NOT NULL REFERENCES "tenants"("id"),
  "gift_card_id" text NOT NULL REFERENCES "gift_cards"("id"),
  "order_id" text NOT NULL REFERENCES "orders"("id"),
  "amount" double precision NOT NULL,
  "created_at" text NOT NULL DEFAULT now()
);
