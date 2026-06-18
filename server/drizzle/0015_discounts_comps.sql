ALTER TABLE "orders" ADD COLUMN "discount_amount" double precision DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "discount_reason" text;
--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "is_comp" boolean DEFAULT false NOT NULL;
