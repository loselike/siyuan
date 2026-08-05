-- Until 2026-08-04 the company-channel form hid the carrier field and assigned
-- it automatically. Clear only the exact legacy id/carrier pairs observed
-- before the optional field was released. A later explicit change to a
-- different carrier, or any newly created channel, is not affected.
UPDATE "Channel" AS channel
SET "carrierId" = NULL
FROM (
  VALUES
    ('ch-cndhl', 'cr-dhl'),
    ('ch-cnfedex-ie', 'cr-fedex'),
    ('ch-cnfedex-ip', 'cr-fedex'),
    ('ch-cnups', 'cr-ups'),
    ('ch-cnups-1785733550658', 'cr-ups'),
    ('ch-ddp-1785735853834', 'cr-ups'),
    ('ch-hkdhl', 'cr-dhl'),
    ('ch-hkfedex-ie', 'cr-dhl'),
    ('ch-hkfedex-ip', 'cr-fedex'),
    ('ch-hkups', 'cr-ups'),
    ('ch-hkups-1785734219944', 'cr-ups')
) AS legacy("channelId", "carrierId")
WHERE channel.id = legacy."channelId"
  AND channel."carrierId" = legacy."carrierId";
