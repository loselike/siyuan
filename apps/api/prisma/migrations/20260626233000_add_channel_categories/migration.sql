CREATE TABLE "ChannelCategory" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ChannelCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChannelCategory_name_key" ON "ChannelCategory"("name");

INSERT INTO "ChannelCategory" ("id", "name", "enabled") VALUES
  ('cc-ups', 'UPS', true),
  ('cc-dhl', 'DHL', true),
  ('cc-fedex', 'FEDEX', true),
  ('cc-ems', 'EMS', true),
  ('cc-dpd', 'DPD', true),
  ('cc-truck', '卡车', true)
ON CONFLICT ("name") DO NOTHING;
