ALTER TABLE "Channel"
  ADD COLUMN "overweightWarningThresholdKg" DECIMAL(12, 4),
  ADD COLUMN "overGirthLengthWidthHeightThresholdCm" DECIMAL(12, 4),
  ADD COLUMN "overGirthLengthPlusTwoWidthHeightThresholdCm" DECIMAL(12, 4),
  ADD COLUMN "perPieceMinimumChargeWeightKg" DECIMAL(12, 4),
  ADD COLUMN "perShipmentMinimumCharge" DECIMAL(12, 4),
  ADD COLUMN "perShipmentMinimumChargeUnit" TEXT,
  ADD COLUMN "densityRatio" DECIMAL(12, 4);

ALTER TABLE "Channel"
  ADD CONSTRAINT "Channel_perShipmentMinimumChargeUnit_check"
  CHECK (
    "perShipmentMinimumChargeUnit" IS NULL
    OR "perShipmentMinimumChargeUnit" IN ('KG', 'CBM')
  ),
  ADD CONSTRAINT "Channel_optionalRulePositiveValues_check"
  CHECK (
    ("overweightWarningThresholdKg" IS NULL OR "overweightWarningThresholdKg" > 0)
    AND ("overGirthLengthWidthHeightThresholdCm" IS NULL OR "overGirthLengthWidthHeightThresholdCm" > 0)
    AND ("overGirthLengthPlusTwoWidthHeightThresholdCm" IS NULL OR "overGirthLengthPlusTwoWidthHeightThresholdCm" > 0)
    AND ("perPieceMinimumChargeWeightKg" IS NULL OR "perPieceMinimumChargeWeightKg" > 0)
    AND ("perShipmentMinimumCharge" IS NULL OR "perShipmentMinimumCharge" > 0)
    AND ("densityRatio" IS NULL OR "densityRatio" > 0)
  ),
  ADD CONSTRAINT "Channel_perShipmentMinimumChargePair_check"
  CHECK (
    ("perShipmentMinimumCharge" IS NULL AND "perShipmentMinimumChargeUnit" IS NULL)
    OR ("perShipmentMinimumCharge" IS NOT NULL AND "perShipmentMinimumChargeUnit" IS NOT NULL)
  ),
  ADD CONSTRAINT "Channel_cbmMinimumDensityRatio_check"
  CHECK (
    "perShipmentMinimumChargeUnit" <> 'CBM'
    OR "densityRatio" IS NOT NULL
  );
