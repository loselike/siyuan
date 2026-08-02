ALTER TABLE "WarehouseRentRule"
ADD COLUMN "freePeriodUnit" TEXT NOT NULL DEFAULT 'DAY',
ADD COLUMN "billingCycleUnit" TEXT NOT NULL DEFAULT 'DAY';

ALTER TABLE "WarehouseRentRule"
ADD CONSTRAINT "WarehouseRentRule_freePeriodUnit_check"
CHECK ("freePeriodUnit" IN ('DAY', 'MONTH')),
ADD CONSTRAINT "WarehouseRentRule_billingCycleUnit_check"
CHECK ("billingCycleUnit" IN ('DAY', 'MONTH'));
