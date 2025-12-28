-- CreateTable: Add images column to orders table
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "images" JSONB DEFAULT '[]'::jsonb;
