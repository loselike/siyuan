WITH default_tags("id", "name", "sortOrder") AS (
  VALUES
    ('problem-tag-data-mismatch', '数据不对', 10),
    ('problem-tag-origin-inspection', '起运港查验', 20),
    ('problem-tag-destination-inspection', '目的港运港查验', 30),
    ('problem-tag-container-rolled', '集装箱被甩在XX码头', 40),
    ('problem-tag-consignee-unreachable', '联系不上收货人', 50),
    ('problem-tag-address-error', '收货人地址错误', 60),
    ('problem-tag-cargo-lost', '货物丢失', 70),
    ('problem-tag-cargo-damaged', '货物破损', 80)
),
enabled_count AS (
  SELECT COUNT(*)::int AS "count"
  FROM "CommonTag"
  WHERE "scene" = 'PROBLEM_TICKET' AND "enabled" = true
),
missing_defaults AS (
  SELECT defaults.*, ROW_NUMBER() OVER (ORDER BY defaults."sortOrder") AS "position"
  FROM default_tags defaults
  WHERE NOT EXISTS (
    SELECT 1
    FROM "CommonTag" existing
    WHERE existing."scene" = 'PROBLEM_TICKET' AND existing."name" = defaults."name"
  )
)
INSERT INTO "CommonTag" (
  "id",
  "name",
  "scene",
  "enabled",
  "customerVisibleAllowed",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT
  missing."id",
  missing."name",
  'PROBLEM_TICKET',
  true,
  true,
  missing."sortOrder",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM missing_defaults missing
CROSS JOIN enabled_count existing
WHERE missing."position" <= GREATEST(0, 10 - existing."count")
ON CONFLICT DO NOTHING;
