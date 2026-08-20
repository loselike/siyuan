-- Remove only the superseded customer-service reverse block permissions.
-- The current positive customer-service permissions remain unchanged.  This
-- migration touches the permission catalog and role links only; business
-- records are protected by row-count guards.
BEGIN;
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

CREATE TEMP TABLE "_CustomerServiceBusinessRowCounts" (
  "tableName" text PRIMARY KEY,
  "rowCount" bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO "_CustomerServiceBusinessRowCounts" ("tableName", "rowCount") VALUES
  ('Shipment', (SELECT COUNT(*) FROM "Shipment")),
  ('ProblemTicket', (SELECT COUNT(*) FROM "ProblemTicket")),
  ('AuditLog', (SELECT COUNT(*) FROM "AuditLog"));

CREATE TEMP TABLE "_CustomerServiceLegacyBlockCodes" ("code" text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_CustomerServiceLegacyBlockCodes" ("code") VALUES
  ('customer-service:transfer:fill-block'),
  ('customer-service:data-confirm:business-update-block'),
  ('customer-service:data-confirm:agent-update-block'),
  ('customer-service:data-confirm:business-approve-block'),
  ('customer-service:data-confirm:agent-approve-block'),
  ('customer-service:pending-routing:fee-detail-block'),
  ('customer-service:pending-routing:readonly-block'),
  ('customer-service:waiting-departure:update-block'),
  ('customer-service:waiting-departure:confirm-departure-block'),
  ('customer-service:waiting-departure:problem-create-block'),
  ('customer-service:waiting-departure:label-upload-block');

-- A legacy block is an explicit deny. Remove any matching positive grant from
-- the same role before deleting the marker so cleanup cannot widen access.
CREATE TEMP TABLE "_CustomerServiceLegacyBlockMappings" (
  "blockCode" text NOT NULL,
  "allowCode" text NOT NULL
) ON COMMIT DROP;
INSERT INTO "_CustomerServiceLegacyBlockMappings" ("blockCode", "allowCode") VALUES
  ('customer-service:transfer:fill-block', 'customer-service:transfer:write'),
  ('customer-service:pending-routing:fee-detail-block', 'customer-service:pending-routing:fee-detail-view'),
  ('customer-service:pending-routing:readonly-block', 'customer-service:pending-routing:view'),
  ('customer-service:data-confirm:business-update-block', 'customer-service:data-confirm:business-update'),
  ('customer-service:data-confirm:agent-update-block', 'customer-service:data-confirm:agent-update'),
  ('customer-service:data-confirm:business-approve-block', 'customer-service:data-confirm:business-approve'),
  ('customer-service:data-confirm:agent-approve-block', 'customer-service:data-confirm:agent-approve'),
  ('customer-service:waiting-departure:update-block', 'customer-service:waiting-departure:update-info'),
  ('customer-service:waiting-departure:update-block', 'customer-service:waiting-departure:update-transfer-no'),
  ('customer-service:waiting-departure:update-block', 'customer-service:waiting-departure:update-etd-eta'),
  ('customer-service:waiting-departure:update-block', 'customer-service:waiting-departure:update-tracking-website'),
  ('customer-service:waiting-departure:confirm-departure-block', 'customer-service:waiting-departure:confirm-departure'),
  ('customer-service:waiting-departure:problem-create-block', 'customer-service:waiting-departure:problem-create'),
  ('customer-service:waiting-departure:label-upload-block', 'customer-service:waiting-departure:label-upload');

-- Roles without the explicit-permissions marker still receive role defaults at
-- runtime.  Deleting a legacy deny from such a role would therefore make the
-- default allow reappear.  Refuse the cleanup until every affected role is
-- persisted explicitly; this keeps the migration fail-closed and makes it
-- safe to retry without mutating business data.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "_PermissionToRole" deny_link
    JOIN "Permission" deny_perm ON deny_perm."id" = deny_link."A"
    JOIN "_CustomerServiceLegacyBlockCodes" legacy ON legacy."code" = deny_perm."code"
    LEFT JOIN "Permission" marker_perm ON marker_perm."code" = 'system-internal:role-permissions-configured'
    LEFT JOIN "_PermissionToRole" marker_link
      ON marker_link."A" = marker_perm."id"
     AND marker_link."B" = deny_link."B"
    WHERE marker_link."B" IS NULL
  ) THEN
    RAISE EXCEPTION 'customer-service permission cleanup requires explicit role permissions marker';
  END IF;
END $$;

-- The old approval denies also covered the aggregate approval action.  Keep
-- that deny effective before removing the legacy markers; otherwise a role
-- with approve-all could still approve the blocked business/agent section.
DELETE FROM "_PermissionToRole" allow_link
USING "Permission" allow_perm
WHERE allow_link."A" = allow_perm."id"
  AND allow_perm."code" = 'customer-service:data-confirm:approve-all'
  AND EXISTS (
    SELECT 1
    FROM "_PermissionToRole" deny_link
    JOIN "Permission" deny_perm ON deny_perm."id" = deny_link."A"
    WHERE deny_link."B" = allow_link."B"
      AND deny_perm."code" IN (
        'customer-service:data-confirm:business-approve-block',
        'customer-service:data-confirm:agent-approve-block'
      )
  );

-- A readonly deny must not be re-created by normalization from one of its
-- legacy child grants after the parent marker is removed.
DELETE FROM "_PermissionToRole" child_link
USING "Permission" child_perm
WHERE child_link."A" = child_perm."id"
  AND child_perm."code" IN (
    'customer-service:pending-routing:fee-detail-view',
    'customer-service:pending-routing:agent-view',
    'customer-service:pending-routing:problem-create',
    'customer-service:pending-routing:column-setting'
  )
  AND EXISTS (
    SELECT 1
    FROM "_PermissionToRole" deny_link
    JOIN "Permission" deny_perm ON deny_perm."id" = deny_link."A"
    WHERE deny_link."B" = child_link."B"
      AND deny_perm."code" = 'customer-service:pending-routing:readonly-block'
  );

DELETE FROM "_PermissionToRole" allow_link
USING "Permission" block_perm, "Permission" allow_perm, "_CustomerServiceLegacyBlockMappings" mapping
WHERE allow_link."A" = allow_perm."id"
  AND block_perm."code" = mapping."blockCode"
  AND allow_perm."code" = mapping."allowCode"
  AND EXISTS (
    SELECT 1
    FROM "_PermissionToRole" deny_link
    WHERE deny_link."A" = block_perm."id"
      AND deny_link."B" = allow_link."B"
  );

DELETE FROM "_PermissionToRole" link
USING "Permission" permission
JOIN "_CustomerServiceLegacyBlockCodes" legacy ON legacy."code" = permission."code"
WHERE link."A" = permission."id";

DELETE FROM "Permission" permission
USING "_CustomerServiceLegacyBlockCodes" legacy
WHERE permission."code" = legacy."code";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Permission" permission
    JOIN "_CustomerServiceLegacyBlockCodes" legacy ON legacy."code" = permission."code"
  ) THEN
    RAISE EXCEPTION 'legacy customer-service block permissions remain';
  END IF;

  IF (SELECT "rowCount" FROM "_CustomerServiceBusinessRowCounts" WHERE "tableName" = 'Shipment') <> (SELECT COUNT(*) FROM "Shipment")
    OR (SELECT "rowCount" FROM "_CustomerServiceBusinessRowCounts" WHERE "tableName" = 'ProblemTicket') <> (SELECT COUNT(*) FROM "ProblemTicket")
    OR (SELECT "rowCount" FROM "_CustomerServiceBusinessRowCounts" WHERE "tableName" = 'AuditLog') <> (SELECT COUNT(*) FROM "AuditLog") THEN
    RAISE EXCEPTION 'customer-service permission cleanup changed business data rows';
  END IF;
END $$;

COMMIT;
