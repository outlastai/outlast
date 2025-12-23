-- AlterTable
ALTER TABLE "orders" ADD COLUMN "component_description" TEXT;
ALTER TABLE "orders" ADD COLUMN "lead_time_weeks" INTEGER;
ALTER TABLE "orders" ADD COLUMN "ordered_date" DATETIME;
ALTER TABLE "orders" ADD COLUMN "sub_system" TEXT;

-- AlterTable
ALTER TABLE "providers" ADD COLUMN "country" TEXT;
