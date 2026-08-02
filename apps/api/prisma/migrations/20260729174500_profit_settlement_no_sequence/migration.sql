CREATE SEQUENCE "ProfitSettlementNoSequence" START WITH 1 INCREMENT BY 1 NO CYCLE;

DO $$
DECLARE
  max_suffix BIGINT;
BEGIN
  SELECT COALESCE(MAX((regexp_match("settlementNo", '^JF[A-Z]{2}[0-9]{8}([0-9]+)$'))[1]::BIGINT), 0)
  INTO max_suffix
  FROM "ProfitSettlement"
  WHERE "settlementNo" ~ '^JF[A-Z]{2}[0-9]{8}[0-9]+$';

  IF max_suffix > 0 THEN
    PERFORM setval('"ProfitSettlementNoSequence"', max_suffix, true);
  ELSE
    PERFORM setval('"ProfitSettlementNoSequence"', 1, false);
  END IF;
END $$;
