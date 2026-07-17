ALTER TABLE "PriceBookRow" ADD COLUMN "postalRule" TEXT;

CREATE INDEX "PriceBookRow_destinationCountry_postalRule_idx"
ON "PriceBookRow"("destinationCountry", "postalRule");
