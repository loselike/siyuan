ALTER TABLE "TrackingEvent"
  ADD COLUMN "location" TEXT,
  ADD COLUMN "carrier" TEXT,
  ADD COLUMN "transferNo" TEXT,
  ADD COLUMN "rawContent" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MANUAL_ENTRY',
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'LOGISTICS';

-- Historical rows written by internal workflow actions must not appear in the
-- external logistics timeline. Their corresponding ShipmentEvent remains the
-- authoritative internal lifecycle record.
UPDATE "TrackingEvent"
SET "kind" = 'INTERNAL'
WHERE "status" ~ '^(录单|财务录单|业务员自审|审核驳回|审核通过|创建出货订单|创建预报|新建出货订单|已生成面单|面单已作废|人工修改运单|代理退回|批量添加轨迹|已出库|待出库|待排货|已入库|收货扫描|渠道已确认)';

CREATE INDEX "TrackingEvent_shipmentId_kind_happenedAt_idx"
  ON "TrackingEvent"("shipmentId", "kind", "happenedAt");
