WITH individual_business_roles(name) AS (
  SELECT role."name"
  FROM "Role" AS role
  JOIN "_PermissionToRole" AS sales_scope_binding ON sales_scope_binding."B" = role."id"
  JOIN "Permission" AS sales_scope_permission ON sales_scope_permission."id" = sales_scope_binding."A"
  WHERE sales_scope_permission."code" = 'data-scope:sales-own'
    AND role."name" NOT IN ('UG_BUSINESS_MANAGER', 'UG_BUSINESS_SUPERVISOR')
    AND COALESCE(role."label", '') !~ '(经理|主管|manager|supervisor)'
),
cross_scope_permissions(code) AS (
  VALUES
    ('business:dashboard:team-view'),
    ('business:dashboard:all-view'),
    ('business:shipment:team-view'),
    ('business:shipment:all-view'),
    ('business:order-ai:all-order-context'),
    ('customer-service:transfer:view-all'),
    ('customer-service:dashboard:team-view'),
    ('customer-service:dashboard:all-view'),
    ('finance:dashboard:view-all'),
    ('finance:receivable:view-all'),
    ('finance:business-cost:view-all'),
    ('finance:water-receipt:view-all'),
    ('master-data:customers:view-all'),
    ('warehouse:rent-detail:scope-all')
)
DELETE FROM "_PermissionToRole" AS binding
USING "Role" AS role, "Permission" AS permission
WHERE binding."A" = permission."id"
  AND binding."B" = role."id"
  AND role."name" IN (SELECT name FROM individual_business_roles)
  AND permission."code" IN (SELECT code FROM cross_scope_permissions);

INSERT INTO "AuditLog" ("id", "actorId", "action", "target", "before", "after", "createdAt")
VALUES (
  'audit-enforce-business-customer-scope-20260814150000',
  'system',
  'system.role_permissions.business_customer_scope',
  'role-groups:individual-business',
  '{"reason":"业务员只能查看自己客户数据，清理历史跨范围权限"}'::jsonb,
  '{"scope":"sales-own","excludedRoleLabels":["经理","主管"],"warehouseExceptions":["warehouse:in-stock","warehouse:today-receipt"]}'::jsonb,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
