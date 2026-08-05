ALTER TABLE "Agent" ADD COLUMN "invoiceTemplates" JSONB;

UPDATE "Agent"
SET "invoiceTemplates" = (
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', 'legacy-' || source.slot,
      'name', COALESCE(NULLIF(source.name, ''), '模板 ' || source.slot),
      'url', source.url
    )
    ORDER BY source.slot
  )
  FROM (VALUES
    (1, "Agent"."invoiceTemplateName", "Agent"."invoiceTemplateUrl"),
    (2, "Agent"."invoiceTemplateName2", "Agent"."invoiceTemplateUrl2"),
    (3, "Agent"."invoiceTemplateName3", "Agent"."invoiceTemplateUrl3")
  ) AS source(slot, name, url)
  WHERE NULLIF(source.url, '') IS NOT NULL
)
WHERE NULLIF("invoiceTemplateUrl", '') IS NOT NULL
   OR NULLIF("invoiceTemplateUrl2", '') IS NOT NULL
   OR NULLIF("invoiceTemplateUrl3", '') IS NOT NULL;
