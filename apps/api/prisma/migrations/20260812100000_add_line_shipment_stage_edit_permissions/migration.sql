-- Positive stage-edit authorization for the line shipment pool.
-- This is additive and idempotent: legacy stage-edit-block relations remain
-- so rollback can continue using the previous deny model.
INSERT INTO "Permission" ("id", "code") VALUES
  ('perm-operations-line-shipment-stage-edit-review-pending', 'operations:line-shipment:stage-edit:review-pending'),
  ('perm-operations-line-shipment-stage-edit-waiting-sort', 'operations:line-shipment:stage-edit:waiting-sort'),
  ('perm-operations-line-shipment-stage-edit-waiting-dispatch', 'operations:line-shipment:stage-edit:waiting-dispatch'),
  ('perm-operations-line-shipment-stage-edit-outbounded', 'operations:line-shipment:stage-edit:outbounded'),
  ('perm-operations-line-shipment-stage-edit-data-confirm', 'operations:line-shipment:stage-edit:data-confirm'),
  ('perm-operations-line-shipment-stage-edit-transfer-no', 'operations:line-shipment:stage-edit:transfer-no'),
  ('perm-operations-line-shipment-stage-edit-waiting-departure', 'operations:line-shipment:stage-edit:waiting-departure'),
  ('perm-operations-line-shipment-stage-edit-departed', 'operations:line-shipment:stage-edit:departed'),
  ('perm-operations-line-shipment-stage-edit-arrived-port', 'operations:line-shipment:stage-edit:arrived-port'),
  ('perm-operations-line-shipment-stage-edit-delivering', 'operations:line-shipment:stage-edit:delivering'),
  ('perm-operations-line-shipment-stage-edit-signed', 'operations:line-shipment:stage-edit:signed'),
  ('perm-operations-line-shipment-stage-edit-problem', 'operations:line-shipment:stage-edit:problem'),
  ('perm-operations-line-shipment-stage-edit-after-sale', 'operations:line-shipment:stage-edit:after-sale')
ON CONFLICT ("code") DO NOTHING;

WITH stage(slug) AS (VALUES
  ('review-pending'), ('waiting-sort'), ('waiting-dispatch'), ('outbounded'),
  ('data-confirm'), ('transfer-no'), ('waiting-departure'), ('departed'),
  ('arrived-port'), ('delivering'), ('signed'), ('problem'), ('after-sale')
)
INSERT INTO "_PermissionToRole" ("A", "B")
SELECT allow_perm.id, role.id
FROM "Role" role
JOIN "Permission" process_perm ON process_perm."code" = 'operations:line-shipment:process'
JOIN "_PermissionToRole" process_link ON process_link."A" = process_perm.id AND process_link."B" = role.id
JOIN "Permission" status_perm ON status_perm."code" = 'operations:line-shipment:status-update'
JOIN "_PermissionToRole" status_link ON status_link."A" = status_perm.id AND status_link."B" = role.id
CROSS JOIN stage
JOIN "Permission" allow_perm ON allow_perm."code" = 'operations:line-shipment:stage-edit:' || stage.slug
LEFT JOIN "Permission" block_perm ON block_perm."code" = 'operations:line-shipment:stage-edit-block:' || stage.slug
LEFT JOIN "_PermissionToRole" block_link ON block_link."A" = block_perm.id AND block_link."B" = role.id
WHERE block_link."A" IS NULL
ON CONFLICT DO NOTHING;
