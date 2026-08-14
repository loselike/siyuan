CREATE TABLE "WarehouseTallySortRule" (
  "id" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "preferredTimeSlot" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" TEXT,

  CONSTRAINT "WarehouseTallySortRule_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WarehouseTallySortRule_sortOrder_check" CHECK ("sortOrder" BETWEEN 1 AND 999),
  CONSTRAINT "WarehouseTallySortRule_preferredTimeSlot_check" CHECK ("preferredTimeSlot" IN ('MORNING', 'AFTERNOON', 'ALL_DAY')),
  CONSTRAINT "WarehouseTallySortRule_channel_check" CHECK ("channel" IN ('快递', '空运', '卡航', '铁路', '海运'))
);

CREATE UNIQUE INDEX "WarehouseTallySortRule_channel_key" ON "WarehouseTallySortRule"("channel");

INSERT INTO "WarehouseTallySortRule" ("id", "channel", "sortOrder", "preferredTimeSlot", "enabled", "updatedAt")
VALUES
  ('warehouse-tally-sort-express', '快递', 1, 'MORNING', true, CURRENT_TIMESTAMP),
  ('warehouse-tally-sort-air', '空运', 2, 'AFTERNOON', true, CURRENT_TIMESTAMP),
  ('warehouse-tally-sort-truck', '卡航', 3, 'ALL_DAY', true, CURRENT_TIMESTAMP),
  ('warehouse-tally-sort-rail', '铁路', 4, 'ALL_DAY', true, CURRENT_TIMESTAMP),
  ('warehouse-tally-sort-sea', '海运', 4, 'ALL_DAY', true, CURRENT_TIMESTAMP)
ON CONFLICT ("channel") DO NOTHING;
