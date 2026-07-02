DELETE FROM "AgentMarkupRule"
WHERE "agentName" IN ('a代理', 'b代理');

INSERT INTO "AgentMarkupRule" ("id", "agentName", "markupPerKg", "enabled", "createdAt", "updatedAt")
SELECT
  'markup-agent-' || md5(source."agentName"),
  source."agentName",
  0.5,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT row."agentName"
  FROM "PriceBookRow" row
  INNER JOIN "PriceBook" book ON book."id" = row."priceBookId"
  WHERE book."deletedAt" IS NULL
    AND row."agentName" IN ('深圳振韵国际', '驰汉')
) source
WHERE NOT EXISTS (
  SELECT 1
  FROM "AgentMarkupRule" rule
  WHERE rule."agentName" = source."agentName"
    AND rule."channelName" IS NULL
    AND rule."realChannelName" IS NULL
    AND rule."destinationCountry" IS NULL
);
