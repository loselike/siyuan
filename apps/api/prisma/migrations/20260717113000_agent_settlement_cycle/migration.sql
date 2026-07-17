-- Agent settlement cycle is reference data used by payable operations.
-- Existing agents remain unset until their supplier terms are verified.
ALTER TABLE "Agent" ADD COLUMN "settlementCycle" TEXT;
