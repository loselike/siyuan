ALTER TABLE "Customer" ADD COLUMN "salesperson" TEXT;

UPDATE "Customer" SET "salesperson" = 'operator' WHERE "code" = '9409';
