-- Fine-grained pricing permissions.  Legacy pricing:lookup/manage grants remain untouched
-- for compatibility; new role configuration uses these concrete permissions.
WITH permission_codes(code) AS (
  VALUES
    ('pricing:lookup:view'), ('pricing:lookup:meta-view'), ('pricing:lookup:amazon'), ('pricing:lookup:europe-oversize'), ('pricing:lookup:europe-express'), ('pricing:lookup:south-africa'), ('pricing:lookup:usa-air-sea'), ('pricing:lookup:canada-air-sea'), ('pricing:lookup:dubai-air-sea'), ('pricing:lookup:dubai-image-view'), ('pricing:lookup:south-africa-table-view'), ('pricing:lookup:copy-quote'), ('pricing:lookup:requirement-detail-view'), ('pricing:lookup:postal-rule-view'), ('pricing:lookup:error-detail-view'), ('pricing:lookup:internal-source-view'), ('pricing:lookup:cost-view'), ('pricing:lookup:gross-profit-view'), ('pricing:lookup:markup-breakdown-view'),
    ('pricing:markup:read'), ('pricing:markup:metrics-view'), ('pricing:markup:module-view'), ('pricing:markup:default-create'), ('pricing:markup:update'), ('pricing:markup:enable'), ('pricing:markup:delete'), ('pricing:markup:export'), ('pricing:markup:import'), ('pricing:markup:batch-upsert'), ('pricing:markup:batch-enable'), ('pricing:markup:batch-delete'), ('pricing:markup:preview'), ('pricing:markup:line-detail-view'), ('pricing:markup:line-custom-create'), ('pricing:markup:line-custom-update'), ('pricing:markup:batch-line-update'), ('pricing:markup:source-price-book-view'), ('pricing:markup:unmatched-view'),
    ('pricing:markup-tier:read'), ('pricing:markup-tier:create'), ('pricing:markup-tier:update'), ('pricing:markup-tier:enable'), ('pricing:markup-tier:delete'), ('pricing:markup-tier:kg-view'), ('pricing:markup-tier:cbm-view'),
    ('pricing:channel-remark:read'), ('pricing:channel-remark:create'), ('pricing:channel-remark:update'), ('pricing:channel-remark:enable'),
    ('pricing:price-books:read'), ('pricing:price-books:list-view'), ('pricing:price-books:rows-view'), ('pricing:price-books:import-job-view'), ('pricing:price-books:upload'), ('pricing:price-books:import'), ('pricing:price-books:import-error-view'), ('pricing:price-books:remark-update'), ('pricing:price-books:delete'), ('pricing:price-books:sync-health-view'), ('pricing:price-books:health-report-view'), ('pricing:price-books:legacy-source-view'), ('pricing:price-books:legacy-source-import'), ('pricing:price-books:legacy-source-delete'), ('pricing:price-books:legacy-rebuild'), ('pricing:price-books:cleanup-original-agents'), ('pricing:price-books:cost-row-view'), ('pricing:price-books:view-all-agents'), ('pricing:price-books:postal-rule-view'),
    ('pricing:dubai-display:active-view'), ('pricing:dubai-display:versions-view'), ('pricing:dubai-display:retry'), ('pricing:dubai-display:activate'), ('pricing:dubai-display:unpublished-view'),
    ('pricing:south-africa:rules-read'), ('pricing:south-africa:rules-create'), ('pricing:south-africa:rules-update'), ('pricing:south-africa:rules-enable'), ('pricing:south-africa:rules-delete'), ('pricing:south-africa:image-view'), ('pricing:south-africa:image-upload'), ('pricing:south-africa:match-result-view')
)
INSERT INTO "Permission" ("id", "code")
SELECT 'perm_' || md5(code), code FROM permission_codes
ON CONFLICT ("code") DO NOTHING;

-- Business and customer-service roles keep ordinary lookup access only.  Pricing
-- maintenance remains explicitly assignable in the role-permission workspace.
WITH lookup_codes(code) AS (
  VALUES
    ('pricing:lookup:view'), ('pricing:lookup:meta-view'), ('pricing:lookup:amazon'), ('pricing:lookup:europe-oversize'), ('pricing:lookup:europe-express'), ('pricing:lookup:south-africa'), ('pricing:lookup:usa-air-sea'), ('pricing:lookup:canada-air-sea'), ('pricing:lookup:dubai-air-sea'), ('pricing:lookup:dubai-image-view'), ('pricing:lookup:south-africa-table-view'), ('pricing:lookup:copy-quote'), ('pricing:lookup:requirement-detail-view'), ('pricing:lookup:postal-rule-view'), ('pricing:lookup:error-detail-view')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM lookup_codes
JOIN "Permission" permission ON permission."code" = lookup_codes.code
JOIN "Role" role ON role."name" IN ('CUSTOMER_SERVICE', 'OPERATOR', 'FINANCE', 'UG_CUSTOMER_SERVICE', 'UG_FINANCE', 'UG_PAYABLE_FINANCE', 'UG_BUSINESS', 'UG_SZ_WUHAN', 'UG_ZZ_SIHUA', 'UG_WH_JIUYULIAN', 'UG_BUSINESS_MANAGER', 'UG_BUSINESS_SUPERVISOR')
ON CONFLICT ("A", "B") DO NOTHING;

-- The existing market pricing owner retains all pricing maintenance permissions.
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT permission."id", role."id"
FROM "Permission" permission
JOIN "Role" role ON role."name" = 'UG_MARKET'
WHERE permission."code" LIKE 'pricing:%'
ON CONFLICT ("A", "B") DO NOTHING;
