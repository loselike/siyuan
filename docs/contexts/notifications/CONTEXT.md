# Notifications

The Notifications context delivers announcements and business-event messages to users while leaving every source workflow and approval state under its original context.

## Language

**公告**:
A message published by an authorized administrator to a fixed audience. Its recipients are resolved when the announcement is published.

**业务通知**:
A message derived from a committed business event, such as an approval, reverse approval, receipt arrival, warehouse exception, or problem-ticket update.

**投递**:
One user's copy of a notification, with that user's read, acknowledgement, and archive state.

**待办**:
An actionable item whose completion belongs to the source business workflow. A notification may point to a pending task but is not itself the task.
_Avoid_: using 已读 or 已归档 to imply that a business item has been processed

**返工待办**:
A personal pending task created when a business user's submitted data is returned for correction. It closes only when that same user submits a follow-up correction for the same source business item; reading, archiving, or acknowledging the associated notification has no effect on it.

**通知偏好**:
A user's choice to receive or suppress optional notification categories when a delivery is attempted. Critical announcements, rejection, and reverse-approval notifications cannot be suppressed.

**通知运行记录**:
The observable processing result of one source audit event, including delivered, no-recipient, failed, retrying, or dead-letter outcomes.

**精确定位**:
A notification navigation outcome that opens the existing read-only detail for its target record, only when the recipient's existing page permission and data scope can read that record. It never grants access, changes business state, or replays the source action.
