ALTER TABLE "orders" ALTER COLUMN "table_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "customer_phone" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "order_type" text DEFAULT 'dine_in' NOT NULL;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_address" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_fee" double precision DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_pickup_time" text;
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "estimated_delivery_time" text;
