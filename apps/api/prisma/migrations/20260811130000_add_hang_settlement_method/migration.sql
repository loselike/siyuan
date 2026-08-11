-- 挂账允许提前进入付款申请，但应付审核仍受数据确认与转单号门禁。
INSERT INTO "FinanceCatalogItem" ("id", "category", "sortOrder", "name", "currency", "remark", "enabled", "createdAt", "updatedAt")
SELECT
  'finance-catalog-settlement-hang-account',
  'SETTLEMENT_METHOD',
  COALESCE((SELECT MAX("sortOrder") + 1 FROM "FinanceCatalogItem" WHERE "category" = 'SETTLEMENT_METHOD'), 1),
  '挂账',
  'RMB',
  '可提前付款，但应付审核仍需数据确认和转单号',
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1
  FROM "FinanceCatalogItem"
  WHERE "category" = 'SETTLEMENT_METHOD'
    AND "name" = '挂账'
);
