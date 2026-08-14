-- Customer-service block permissions are compatibility-only after the positive authorization cutover.
-- Keep old rows for rollback/audit, but remove the corresponding positive grant when a
-- role still carries the old deny marker. The statements are idempotent.
WITH mappings(block_code, allow_code) AS (VALUES
  ('customer-service:transfer:fill-block', 'customer-service:transfer:write'),
  ('customer-service:pending-routing:fee-detail-block', 'customer-service:pending-routing:fee-detail-view'),
  ('customer-service:pending-routing:readonly-block', 'customer-service:pending-routing:view'),
  ('customer-service:data-confirm:business-update-block', 'customer-service:data-confirm:business-update'),
  ('customer-service:data-confirm:agent-update-block', 'customer-service:data-confirm:agent-update'),
  ('customer-service:data-confirm:business-approve-block', 'customer-service:data-confirm:business-approve'),
  ('customer-service:data-confirm:agent-approve-block', 'customer-service:data-confirm:agent-approve')
)
DELETE FROM "_PermissionToRole" link
USING "Permission" block_perm, "Permission" allow_perm, "Role" role, mappings
WHERE link."A" = allow_perm.id
  AND link."B" = role.id
  AND block_perm.code = mappings.block_code
  AND allow_perm.code = mappings.allow_code
  AND EXISTS (
    SELECT 1 FROM "_PermissionToRole" deny_link
    WHERE deny_link."A" = block_perm.id AND deny_link."B" = role.id
  );
