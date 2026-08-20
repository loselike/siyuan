import { cloneElement, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type HTMLAttributes, type Key, type MouseEvent as ReactMouseEvent, type ReactNode, type ThHTMLAttributes } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn';
import { Alert, Button, Card, Checkbox, DatePicker, Empty, Flex, Input, message as antdMessage, Modal, Segmented, Skeleton, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import type { ButtonProps } from 'antd';
import type { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import zhCNDatePickerLocale from 'antd/es/date-picker/locale/zh_CN';
import type { ModalFuncProps } from 'antd/es/modal';
import type { ColumnGroupType, ColumnsType, ColumnType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { CalendarDays, Search, Settings } from 'lucide-react';
import { shipmentStatusLabels, type ShipmentStatus } from '@siyuan/shared';
import {
  getAccountTablePreferenceKey,
  saveAccountTablePreference,
  useAccountTablePreferences
} from './tablePreferences';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
export const APP_DATE_FORMAT = 'YYYY-MM-DD';
export const APP_DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm';
export const APP_DATE_TIME_VALUE_FORMAT = 'YYYY-MM-DDTHH:mm';

export function renderAuthorizedAction(allowed: boolean, action: ReactNode) {
  return allowed ? action : null;
}

export type NoticeBarType = 'success' | 'info' | 'warning' | 'error';

export interface NoticeBarPresentation {
  type: NoticeBarType;
  title: string;
  description?: string;
}

const noticeEventSeparator = '\u2063notice:';
let noticeEventSequence = 0;

export function createNoticeMessage(message: string | null) {
  if (!message) {
    return message;
  }
  noticeEventSequence += 1;
  return `${message}${noticeEventSeparator}${Date.now()}-${noticeEventSequence}`;
}

export const STANDARD_LIST_PAGE_SIZE_OPTIONS = [10, 30, 50] as const;

export const tenRowTablePagination: TablePaginationConfig = {
  defaultPageSize: 10,
  showSizeChanger: true,
  pageSizeOptions: [...STANDARD_LIST_PAGE_SIZE_OPTIONS],
  showTotal: (total) => `共 ${total} 条`
};

export function resolveListPaginationChange(
  previous: { current: number; pageSize: number },
  current: number,
  pageSize: number
) {
  return {
    current: previous.pageSize === pageSize ? current : 1,
    pageSize
  };
}

export function paginationWhenNeeded(
  total: number,
  pagination: TablePaginationConfig = tenRowTablePagination
): TablePaginationConfig | false {
  const pageSize = Number(
    pagination.pageSize
      ?? pagination.defaultPageSize
      ?? tenRowTablePagination.defaultPageSize
      ?? 10
  );
  return total > pageSize ? pagination : false;
}

export function getManagedTableScrollX(columns: ColumnsType<unknown>, minimum = 960): number {
  const width = columns.reduce((sum, column) => {
    if ('children' in column && Array.isArray(column.children) && column.children.length) {
      return sum + getManagedTableScrollX(column.children as ColumnsType<unknown>, 0) - 24;
    }
    const rawWidth = column.width;
    if (typeof rawWidth === 'number') {
      return sum + rawWidth;
    }
    if (typeof rawWidth === 'string') {
      const parsed = Number(rawWidth.replace('px', ''));
      return sum + (Number.isFinite(parsed) ? parsed : 140);
    }
    return sum + 140;
  }, 0);
  return Math.max(minimum, width + 24);
}

export function isAppDateValue(value?: string | null) {
  if (!value) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return dayjs(value).format(APP_DATE_FORMAT) === value;
}

export function isAppDateRangeInvalid(start?: string | null, end?: string | null) {
  if (!start || !end || !isAppDateValue(start) || !isAppDateValue(end)) return false;
  return dayjs(end).isBefore(dayjs(start), 'day');
}

function toAppDateValue(value?: string | null): Dayjs | null {
  return isAppDateValue(value) ? dayjs(value).locale('zh-cn') : null;
}

function toAppDateTimeValue(value?: string | null): Dayjs | null {
  if (!value) return null;
  const parsed = dayjs(value).locale('zh-cn');
  return parsed.isValid() ? parsed : null;
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(' ') || undefined;
}

function withConfirmLocale<T extends { lang?: Record<string, unknown> } | undefined>(locale: T) {
  return {
    ...zhCNDatePickerLocale,
    ...locale,
    lang: {
      ...zhCNDatePickerLocale.lang,
      ...(locale as { lang?: Record<string, unknown> } | undefined)?.lang,
      ok: '确认'
    }
  } as T;
}

function preventFooterMouseDown(event: ReactMouseEvent<HTMLElement>) {
  event.preventDefault();
}

type AppDatePickerProps = Omit<DatePickerProps, 'value' | 'onChange' | 'format' | 'picker'> & {
  value?: string;
  onChange?: (value?: string) => void;
};

export function AppDatePicker({
  value,
  onChange,
  placeholder = '年 / 月 / 日',
  className,
  allowClear = true,
  onBlur,
  locale,
  renderExtraFooter,
  showToday = true,
  needConfirm = true,
  open,
  onOpenChange,
  onOk,
  ...props
}: AppDatePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string | undefined>(value);
  const mergedOpen = open ?? internalOpen;

  useEffect(() => {
    if (!mergedOpen) {
      setDraftValue(value);
    }
  }, [mergedOpen, value]);

  const closePicker = () => {
    if (open === undefined) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };
  const commitValue = (nextValue?: string) => {
    onChange?.(nextValue);
    closePicker();
  };

  return (
    <DatePicker
      {...props}
      allowClear={allowClear}
      className={joinClassNames('app-date-picker', className)}
      format={APP_DATE_FORMAT}
      inputReadOnly={false}
      locale={withConfirmLocale(locale)}
      needConfirm={needConfirm}
      placeholder={placeholder}
      renderExtraFooter={(mode) => (
        <div className="app-date-picker-confirm-footer">
          <Button
            type="link"
            size="small"
            onMouseDown={preventFooterMouseDown}
            onClick={() => {
              setDraftValue(undefined);
              commitValue(undefined);
            }}
          >
            清除
          </Button>
          {renderExtraFooter?.(mode)}
        </div>
      )}
      showToday={showToday}
      suffixIcon={<CalendarDays size={16} />}
      key={value ?? '__empty_date__'}
      open={mergedOpen}
      value={toAppDateValue(needConfirm && mergedOpen ? draftValue : value)}
      onOpenChange={(nextOpen) => {
        if (open === undefined) {
          setInternalOpen(nextOpen);
        }
        if (nextOpen) {
          setDraftValue(value);
        }
        onOpenChange?.(nextOpen);
      }}
      onChange={(_, dateString) => {
        const nextValue = Array.isArray(dateString) ? dateString[0] : dateString || undefined;
        if (needConfirm) {
          setDraftValue(nextValue);
        } else {
          onChange?.(nextValue);
        }
      }}
      onOk={(date) => {
        const nextValue = date?.format(APP_DATE_FORMAT) ?? draftValue;
        commitValue(nextValue);
        onOk?.(date);
      }}
      onBlur={(event, info) => {
        const nextValue = ((event.target as HTMLInputElement).value ?? '').trim();
        if (!needConfirm && (!nextValue || isAppDateValue(nextValue))) {
          onChange?.(nextValue || undefined);
        }
        onBlur?.(event, info);
      }}
    />
  );
}

type AppDateTimePickerProps = Omit<DatePickerProps, 'value' | 'onChange' | 'format' | 'picker'> & {
  value?: string;
  onChange?: (value?: string) => void;
};

export function AppDateTimePicker({
  value,
  onChange,
  placeholder = '年 / 月 / 日  时:分',
  className,
  allowClear = true,
  locale,
  renderExtraFooter,
  showTime = { format: 'HH:mm' },
  showToday = true,
  needConfirm = true,
  open,
  onOpenChange,
  onOk,
  ...props
}: AppDateTimePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string | undefined>(value);
  const mergedOpen = open ?? internalOpen;

  useEffect(() => {
    if (!mergedOpen) {
      setDraftValue(value);
    }
  }, [mergedOpen, value]);

  const closePicker = () => {
    if (open === undefined) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };
  const commitValue = (nextValue?: string) => {
    onChange?.(nextValue);
    closePicker();
  };

  return (
    <DatePicker
      {...props}
      allowClear={allowClear}
      className={joinClassNames('app-date-picker', 'app-date-time-picker', className)}
      format={APP_DATE_TIME_FORMAT}
      inputReadOnly={false}
      locale={withConfirmLocale(locale)}
      needConfirm={needConfirm}
      placeholder={placeholder}
      renderExtraFooter={(mode) => (
        <div className="app-date-picker-confirm-footer">
          <Button
            type="link"
            size="small"
            onMouseDown={preventFooterMouseDown}
            onClick={() => {
              setDraftValue(undefined);
              commitValue(undefined);
            }}
          >
            清除
          </Button>
          {renderExtraFooter?.(mode)}
        </div>
      )}
      showTime={showTime}
      showToday={showToday}
      suffixIcon={<CalendarDays size={16} />}
      key={value ?? '__empty_date_time__'}
      open={mergedOpen}
      value={toAppDateTimeValue(needConfirm && mergedOpen ? draftValue : value)}
      onOpenChange={(nextOpen) => {
        if (open === undefined) {
          setInternalOpen(nextOpen);
        }
        if (nextOpen) {
          setDraftValue(value);
        }
        onOpenChange?.(nextOpen);
      }}
      onChange={(_, dateString) => {
        const nextValue = Array.isArray(dateString)
          ? dateString[0]
          : dateString
            ? toAppDateTimeValue(dateString)?.format(APP_DATE_TIME_VALUE_FORMAT)
            : undefined;
        if (needConfirm) {
          setDraftValue(nextValue);
        } else {
          onChange?.(nextValue);
        }
      }}
      onOk={(date) => {
        const nextValue = date?.format(APP_DATE_TIME_VALUE_FORMAT) ?? draftValue;
        commitValue(nextValue);
        onOk?.(date);
      }}
    />
  );
}

type AppDateRangePickerValue = [string | undefined, string | undefined];
type AppDateRangePickerProps = Omit<RangePickerProps, 'value' | 'onChange' | 'format' | 'picker'> & {
  value?: AppDateRangePickerValue;
  onChange?: (value: AppDateRangePickerValue) => void;
};

export function AppDateRangePicker({
  value,
  onChange,
  placeholder = ['开始日期', '结束日期'],
  className,
  allowClear = true,
  locale,
  renderExtraFooter,
  needConfirm = true,
  open,
  onOpenChange,
  onOk,
  ...props
}: AppDateRangePickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<AppDateRangePickerValue>(value ?? [undefined, undefined]);
  const mergedOpen = open ?? internalOpen;

  useEffect(() => {
    if (!mergedOpen) {
      setDraftValue(value ?? [undefined, undefined]);
    }
  }, [mergedOpen, value]);

  const closePicker = () => {
    if (open === undefined) {
      setInternalOpen(false);
    }
    onOpenChange?.(false);
  };
  const commitValue = (nextValue: AppDateRangePickerValue) => {
    onChange?.(nextValue);
    closePicker();
  };

  return (
    <RangePicker
      {...props}
      allowClear={allowClear}
      className={joinClassNames('app-date-picker', 'app-date-range-picker', className)}
      format={APP_DATE_FORMAT}
      inputReadOnly={false}
      locale={withConfirmLocale(locale)}
      needConfirm={needConfirm}
      placeholder={placeholder}
      renderExtraFooter={(mode) => (
        <div className="app-date-picker-confirm-footer">
          <Button
            type="link"
            size="small"
            onMouseDown={preventFooterMouseDown}
            onClick={() => {
              setDraftValue([undefined, undefined]);
              commitValue([undefined, undefined]);
            }}
          >
            清除
          </Button>
          {renderExtraFooter?.(mode)}
        </div>
      )}
      suffixIcon={<CalendarDays size={16} />}
      key={`${value?.[0] ?? ''}:${value?.[1] ?? ''}`}
      open={mergedOpen}
      value={[
        toAppDateValue((needConfirm && mergedOpen ? draftValue : value)?.[0]),
        toAppDateValue((needConfirm && mergedOpen ? draftValue : value)?.[1])
      ]}
      onOpenChange={(nextOpen) => {
        if (open === undefined) {
          setInternalOpen(nextOpen);
        }
        if (nextOpen) {
          setDraftValue(value ?? [undefined, undefined]);
        }
        onOpenChange?.(nextOpen);
      }}
      onChange={(_, dateStrings) => {
        const nextValue: AppDateRangePickerValue = [dateStrings[0] || undefined, dateStrings[1] || undefined];
        if (needConfirm) {
          setDraftValue(nextValue);
        } else {
          onChange?.(nextValue);
        }
      }}
      onOk={(dates) => {
        const nextValue: AppDateRangePickerValue = Array.isArray(dates)
          ? [dates[0]?.format(APP_DATE_FORMAT), dates[1]?.format(APP_DATE_FORMAT)]
          : draftValue;
        if (nextValue[0] && nextValue[1]) {
          commitValue(nextValue);
        }
        onOk?.(dates);
      }}
    />
  );
}

export type ConfirmActionRisk = 'normal' | 'warning' | 'danger';

export type ConfirmActionSummaryItem = {
  label: string;
  value?: ReactNode;
};

export type ConfirmDangerActionOptions = {
  actionName: string;
  objectName?: ReactNode;
  currentStatus?: ReactNode;
  nextStatus?: ReactNode;
  count?: number;
  amount?: ReactNode;
  currency?: ReactNode;
  riskTip?: ReactNode;
  /** 展示原因输入，但不强制填写。 */
  showReason?: boolean;
  requireReason?: boolean;
  reasonLabel?: string;
  confirmText?: string;
  risk?: ConfirmActionRisk;
  onConfirm: (reason?: string) => Promise<void> | void;
  confirm?: typeof Modal.confirm;
};

export function buildConfirmActionTitle(actionName: string) {
  return `确认${actionName}？`;
}

export function buildConfirmActionSummary(options: Pick<ConfirmDangerActionOptions, 'objectName' | 'currentStatus' | 'nextStatus' | 'count' | 'amount' | 'currency' | 'riskTip'>) {
  const items: ConfirmActionSummaryItem[] = [];
  if (options.objectName) items.push({ label: '操作对象', value: options.objectName });
  if (options.currentStatus || options.nextStatus) items.push({ label: '状态变化', value: `${options.currentStatus ?? '-'} -> ${options.nextStatus ?? '-'}` });
  items.push({ label: '影响数量', value: `${options.count ?? 1} 条` });
  if (options.amount !== undefined && options.amount !== null) {
    items.push({ label: '财务金额', value: `${options.amount}${options.currency ? ` ${options.currency}` : ''}` });
  }
  if (options.riskTip) items.push({ label: '风险提示', value: options.riskTip });
  return items;
}

function ConfirmActionContent({ options, onReasonChange }: { options: ConfirmDangerActionOptions; onReasonChange: (value: string) => void }) {
  const items = buildConfirmActionSummary(options);
  return (
    <Space direction="vertical" size={10} className="confirm-action-content">
      <div className="confirm-action-summary">
        {items.map((item) => (
          <div className="confirm-action-summary-row" key={item.label}>
            <Text type="secondary">{item.label}</Text>
            <Text strong>{item.value}</Text>
          </div>
        ))}
      </div>
      {options.showReason || options.requireReason ? (
        <Input.TextArea
          aria-label={options.reasonLabel ?? '操作原因'}
          className="confirm-action-reason"
          rows={3}
          maxLength={300}
          showCount
          placeholder={options.requireReason ? '请填写操作原因，至少 2 个字符' : '可填写操作原因（选填）'}
          onChange={(event) => onReasonChange(event.target.value)}
        />
      ) : null}
    </Space>
  );
}

export function confirmDangerAction(options: ConfirmDangerActionOptions) {
  let reason = '';
  const modalOptions: ModalFuncProps = {
    title: buildConfirmActionTitle(options.actionName),
    content: <ConfirmActionContent options={options} onReasonChange={(value) => { reason = value; }} />,
    okText: options.confirmText ?? `确认${options.actionName}`,
    cancelText: '取消',
    okButtonProps: options.risk === 'danger' ? { danger: true } : undefined,
    onOk: async () => {
      const trimmedReason = reason.trim();
      if (options.requireReason && trimmedReason.length < 2) {
        antdMessage.warning('请填写操作原因');
        return Promise.reject(new Error('请填写操作原因'));
      }
      await options.onConfirm(trimmedReason || undefined);
    }
  };
  (options.confirm ?? Modal.confirm)(modalOptions);
}

export type ConfirmActionButtonProps = Omit<ButtonProps, 'onClick'> & Omit<ConfirmDangerActionOptions, 'confirm'>;

export function ConfirmActionButton({
  actionName,
  objectName,
  currentStatus,
  nextStatus,
  count,
  amount,
  currency,
  riskTip,
  showReason,
  requireReason,
  reasonLabel,
  confirmText,
  risk,
  onConfirm,
  children,
  ...buttonProps
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const options: ConfirmDangerActionOptions = {
    actionName,
    objectName,
    currentStatus,
    nextStatus,
    count,
    amount,
    currency,
    riskTip,
    showReason,
    requireReason,
    reasonLabel,
    confirmText,
    risk,
    onConfirm
  };
  const close = () => {
    setOpen(false);
    setReason('');
  };
  const submit = async () => {
    const trimmedReason = reason.trim();
    if (requireReason && trimmedReason.length < 2) {
      antdMessage.warning('请填写操作原因');
      return;
    }
    setSubmitting(true);
    try {
      await onConfirm(trimmedReason || undefined);
      close();
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children ?? actionName}
      </Button>
      <Modal
        title={buildConfirmActionTitle(actionName)}
        open={open}
        onCancel={close}
        onOk={() => void submit()}
        okText={confirmText ?? `确认${actionName}`}
        cancelText="取消"
        okButtonProps={risk === 'danger' ? { danger: true } : undefined}
        confirmLoading={submitting}
        destroyOnHidden
      >
        <ConfirmActionContent options={options} onReasonChange={setReason} />
      </Modal>
    </>
  );
}

export type ManagedTableColumnSettings = {
  storageKey: string;
  title?: string;
  labels?: Record<string, string>;
  defaultHiddenKeys?: string[];
  defaultColumnOrder?: string[];
  buttonLabel?: string;
  lockedKeys?: string[];
};

export type RecordDetailField = {
  key: string;
  label: string;
  value: ReactNode;
  span?: 1 | 2 | 3;
  format?: (value: ReactNode) => ReactNode;
  copyable?: boolean;
};

function renderRecordDetailValue(field: Pick<RecordDetailField, 'value' | 'format'>) {
  return field.format ? field.format(field.value) : (field.value ?? '-');
}

export function RecordDetailModal({
  open,
  title,
  fields = [],
  footer,
  onClose
}: {
  open: boolean;
  title: ReactNode;
  fields?: RecordDetailField[];
  footer?: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal
      className="record-detail-modal"
      open={open}
      width={1120}
      destroyOnHidden
      onCancel={onClose}
      footer={footer === undefined ? <Button aria-label="关闭" onClick={onClose}>关闭</Button> : footer}
      title={title}
    >
      <div className="record-detail-content">
        <div className="record-detail-flat-fields">
          {fields.map((field) => (
            <div className={`record-detail-flat-field record-detail-field-span-${field.span ?? 1}`} key={field.key}>
              <span className="record-detail-label">{field.label}</span>
              <div className="record-detail-value">{renderRecordDetailValue(field)}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export type ManagedTableColumnRecordDetail<RecordType extends object> = false | {
  label?: string;
  value?: (record: RecordType, index?: number) => ReactNode;
  span?: 1 | 2 | 3;
  interactive?: boolean;
};

export type ManagedTableRecordDetailOptions<RecordType extends object> = {
  title?: ReactNode | ((record: RecordType) => ReactNode);
  canOpen?: (record: RecordType) => boolean;
  ariaLabel?: (record: RecordType) => string;
  excludeColumnKeys?: string[];
  columns?: ManagedTableColumns<RecordType>;
  footer?: (record: RecordType, close: () => void, index?: number) => ReactNode;
};

/**
 * A business-table column has one identity for display, column settings and sorting.
 * `sortValue` is used for calculated/display-only columns that have no direct dataIndex.
 */
export type ManagedTableColumn<RecordType extends object> = (ColumnType<RecordType> | ColumnGroupType<RecordType>) & {
  sortValue?: (record: RecordType) => unknown;
  sortable?: boolean;
  resizable?: boolean;
  settingsLabel?: string;
  recordDetail?: ManagedTableColumnRecordDetail<RecordType>;
};

export type ManagedTableColumns<RecordType extends object> = ManagedTableColumn<RecordType>[];

export type ManagedTableDensity = 'auto' | 'standard' | 'compact' | 'dense';

export type ManagedTableProps<RecordType extends object> = Omit<TableProps<RecordType>, 'columns'> & {
  columns: ManagedTableColumns<RecordType>;
  minimumScrollX?: number;
  columnSettings?: ManagedTableColumnSettings | false;
  columnSettingsPlacement?: 'column' | 'toolbar';
  density?: ManagedTableDensity;
  toolbarLeading?: ReactNode;
  toolbarActions?: ReactNode;
  showSelectionSummary?: boolean;
  resizableColumns?: boolean;
  recordDetail?: false | true | ManagedTableRecordDetailOptions<RecordType>;
  /** Opens the existing read-only detail without requiring a table-row gesture. */
  recordDetailTarget?: { key: string; record: RecordType } | null;
};

export type ManagedTableViewMode = 'matrix' | 'ledger';

export type ManagedTableViewDefinition<RecordType extends object> = {
  label?: ReactNode;
  columns: ManagedTableColumns<RecordType>;
  tableProps?: Partial<Omit<ManagedTableProps<RecordType>, 'columns' | 'dataSource' | 'pagination' | 'rowSelection' | 'toolbarLeading' | 'toolbarActions'>>;
  shellClassName?: string;
};

export type ManagedMatrixField = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  title?: string;
  wrap?: boolean;
  emphasis?: boolean;
};

export type ManagedMatrixCellProps = {
  fields: Array<ManagedMatrixField | null | false | undefined>;
  labelWidth?: number | string;
  gap?: number | string;
  columns?: number;
  className?: string;
};

/**
 * Shared field/value layout for business matrix tables. Business pages still
 * decide the groups and fields explicitly; this component only standardizes
 * label tracks, wrapping and vertical rhythm.
 */
export function ManagedMatrixCell({ fields, labelWidth = 64, gap = 6, columns = 1, className }: ManagedMatrixCellProps) {
  const visibleFields = fields.filter(Boolean) as ManagedMatrixField[];
  const style = {
    '--managed-matrix-label-width': typeof labelWidth === 'number' ? `${labelWidth}px` : labelWidth,
    '--managed-matrix-row-gap': typeof gap === 'number' ? `${gap}px` : gap,
    '--managed-matrix-column-count': Math.max(1, Math.floor(columns))
  } as CSSProperties;

  return (
    <div className={joinClassNames('managed-matrix-cell', columns > 1 ? 'managed-matrix-cell-grid' : undefined, className)} style={style}>
      {visibleFields.map((field) => (
        <div
          key={field.key}
          className={joinClassNames('managed-matrix-field', field.wrap ? 'managed-matrix-field-wrap' : undefined)}
        >
          <span className="managed-matrix-label">{field.label}</span>
          <span
            className={joinClassNames('managed-matrix-value', field.emphasis ? 'managed-matrix-value-emphasis' : undefined)}
            title={field.title}
          >
            {field.value ?? '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ManagedMatrixDateTime({ value }: { value?: string | null }) {
  const normalized = value?.trim();
  if (!normalized) return <span>-</span>;
  const [date, ...timeParts] = normalized.split(/\s+/);
  const time = timeParts.join(' ');
  return (
    <span className="managed-matrix-datetime" title={normalized}>
      <strong>{date}</strong>
      {time ? <span>{time}</span> : null}
    </span>
  );
}

export type ManagedDualViewTableProps<RecordType extends object> = Omit<
  ManagedTableProps<RecordType>,
  'columns' | 'minimumScrollX' | 'columnSettings' | 'className' | 'tableLayout' | 'resizableColumns' | 'recordDetail'
> & {
  views: Record<ManagedTableViewMode, ManagedTableViewDefinition<RecordType>>;
  viewStorageKey: string;
  defaultView?: ManagedTableViewMode;
  viewAriaLabel?: string;
  shellClassName?: string;
  onViewChange?: (view: ManagedTableViewMode) => void;
};

/**
 * Callers often create pagination objects inline. Ant Design treats a changed
 * pagination object as a state update, so callback identity alone must not
 * cause the table to run its internal pagination effects again.
 */
function getManagedTablePaginationSignature(pagination: TableProps<object>['pagination']) {
  if (pagination === false) return 'false';
  if (!pagination) return 'default';
  return JSON.stringify({
    current: pagination.current,
    defaultCurrent: pagination.defaultCurrent,
    pageSize: pagination.pageSize,
    defaultPageSize: pagination.defaultPageSize,
    total: pagination.total,
    disabled: pagination.disabled,
    hideOnSinglePage: pagination.hideOnSinglePage,
    showLessItems: pagination.showLessItems,
    showQuickJumper: typeof pagination.showQuickJumper === 'object' ? Boolean(pagination.showQuickJumper) : pagination.showQuickJumper,
    showSizeChanger: typeof pagination.showSizeChanger === 'object' ? Boolean(pagination.showSizeChanger) : pagination.showSizeChanger,
    pageSizeOptions: pagination.pageSizeOptions?.join(','),
    responsive: pagination.responsive,
    simple: typeof pagination.simple === 'object' ? Boolean(pagination.simple) : pagination.simple,
    size: pagination.size,
    align: pagination.align,
    position: pagination.position?.join(','),
    hasOnChange: typeof pagination.onChange === 'function',
    hasOnShowSizeChange: typeof pagination.onShowSizeChange === 'function'
  });
}

function getManagedTableScrollSignature(scroll: TableProps<object>['scroll']) {
  if (!scroll) return 'default';
  return JSON.stringify({
    x: scroll.x,
    y: scroll.y,
    scrollToFirstRowOnChange: scroll.scrollToFirstRowOnChange
  });
}

export function ManagedTable<RecordType extends object>({
  columns,
  minimumScrollX = 960,
  columnSettings,
  columnSettingsPlacement = 'column',
  density = 'auto',
  toolbarLeading,
  toolbarActions,
  showSelectionSummary = true,
  resizableColumns = true,
  recordDetail,
  recordDetailTarget,
  pagination,
  rowSelection,
  scroll,
  className,
  sticky,
  onChange,
  onRow,
  ...props
}: ManagedTableProps<RecordType>) {
  const resolvedColumns = useMemo(
    () => resolveManagedTableColumnKeys(columns),
    [columns]
  );
  const recordDetailOptions = recordDetail && recordDetail !== true ? recordDetail : undefined;
  const internalRecordDetailEnabled = recordDetail !== undefined && recordDetail !== false;
  const resolvedRecordDetailColumns = useMemo(
    () => resolveManagedTableColumnKeys(recordDetailOptions?.columns ?? columns),
    [columns, recordDetailOptions?.columns]
  );
  const columnKeys = useMemo(
    () =>
      Array.from(
        new Set(collectManagedTableColumnKeys(resolvedColumns as ManagedColumnLike[]))
      ),
    [resolvedColumns]
  );
  const effectiveColumnSettings = useMemo<ManagedTableColumnSettings | undefined>(() => {
    if (columnSettings === false || !columnKeys.length) {
      return undefined;
    }
    if (columnSettings) {
      return columnSettings;
    }
    return {
      storageKey: getManagedTableColumnStorageKey(resolvedColumns as ManagedColumnLike[], className),
      title: '列设置',
      lockedKeys: inferManagedTableLockedColumnKeys(columnKeys)
    };
  }, [className, columnKeys, columnSettings, resolvedColumns]);
  const widthStorageKey = useMemo(() => getManagedTableWidthStorageKey(resolvedColumns as ManagedColumnLike[], effectiveColumnSettings, className), [className, effectiveColumnSettings, resolvedColumns]);
  const accountTablePreferences = useAccountTablePreferences();
  const columnPreferenceKey = useMemo(
    () => effectiveColumnSettings ? getAccountTablePreferenceKey('columns', effectiveColumnSettings.storageKey) : undefined,
    [effectiveColumnSettings]
  );
  const widthPreferenceKey = useMemo(
    () => getAccountTablePreferenceKey('widths', widthStorageKey),
    [widthStorageKey]
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => readManagedTableColumnSettings(effectiveColumnSettings, columnKeys).hiddenKeys);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => readManagedTableColumnSettings(effectiveColumnSettings, columnKeys).columnOrder);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => readManagedTableColumnWidths(widthStorageKey));
  const [activeRecordDetail, setActiveRecordDetail] = useState<{ record: RecordType; index?: number } | null>(null);
  const lastRecordDetailTargetKeyRef = useRef<string | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const hydratedColumnPreferenceRef = useRef<string | undefined>(undefined);
  const hydratedWidthPreferenceRef = useRef<string | undefined>(undefined);
  const suppressColumnPreferenceSaveRef = useRef(false);
  const suppressWidthPreferenceSaveRef = useRef(false);

  useEffect(() => {
    if (!recordDetailTarget) {
      lastRecordDetailTargetKeyRef.current = null;
      return;
    }
    if (!internalRecordDetailEnabled || lastRecordDetailTargetKeyRef.current === recordDetailTarget.key) {
      return;
    }
    if (recordDetailOptions?.canOpen && !recordDetailOptions.canOpen(recordDetailTarget.record)) {
      return;
    }
    lastRecordDetailTargetKeyRef.current = recordDetailTarget.key;
    setActiveRecordDetail({ record: recordDetailTarget.record });
  }, [internalRecordDetailEnabled, recordDetailOptions, recordDetailTarget]);

  useEffect(() => {
    const preferenceKey = columnPreferenceKey;
    const accountId = accountTablePreferences.accountId;
    if (!accountId || !preferenceKey) {
      hydratedColumnPreferenceRef.current = undefined;
      return;
    }
    const identity = `${accountId}:${preferenceKey}`;
    if (!accountTablePreferences.loaded || !effectiveColumnSettings || hydratedColumnPreferenceRef.current === identity) return;
    hydratedColumnPreferenceRef.current = identity;
    suppressColumnPreferenceSaveRef.current = true;
    const remoteValue = accountTablePreferences.values[preferenceKey];
    if (remoteValue) {
      const next = normalizeManagedTableRemoteColumnSettings(remoteValue, effectiveColumnSettings, columnKeys);
      setHiddenKeys(next.hiddenKeys);
      setColumnOrder(next.columnOrder);
      writeManagedTableColumnSettings(effectiveColumnSettings.storageKey, {
        hiddenKeys: next.hiddenKeys,
        columnOrder: next.columnOrder,
        schemaKeys: columnKeys
      });
      return;
    }
    const lockedKeys = getManagedTableLockedKeys(effectiveColumnSettings, columnKeys);
    saveAccountTablePreference(preferenceKey, {
      version: 1,
      localKey: effectiveColumnSettings.storageKey,
      hiddenKeys: hiddenKeys.filter((key) => columnKeys.includes(key) && !lockedKeys.includes(key)),
      columnOrder: normalizeManagedTableColumnOrder(columnOrder, columnKeys),
      schemaKeys: columnKeys
    });
  }, [accountTablePreferences.accountId, accountTablePreferences.loaded, accountTablePreferences.values, columnKeys, columnPreferenceKey, effectiveColumnSettings]);

  useEffect(() => {
    if (effectiveColumnSettings) {
      const normalizedOrder = normalizeManagedTableColumnOrder(columnOrder, columnKeys);
      const lockedKeys = getManagedTableLockedKeys(effectiveColumnSettings, columnKeys);
      const settings = {
        hiddenKeys: hiddenKeys.filter((key) => columnKeys.includes(key) && !lockedKeys.includes(key)),
        columnOrder: normalizedOrder,
        schemaKeys: columnKeys
      };
      writeManagedTableColumnSettings(effectiveColumnSettings.storageKey, settings);
      const preferenceKey = columnPreferenceKey;
      const identity = accountTablePreferences.accountId && preferenceKey
        ? `${accountTablePreferences.accountId}:${preferenceKey}`
        : undefined;
      if (preferenceKey && identity && accountTablePreferences.loaded && hydratedColumnPreferenceRef.current === identity) {
        if (suppressColumnPreferenceSaveRef.current) {
          suppressColumnPreferenceSaveRef.current = false;
        } else {
          saveAccountTablePreference(preferenceKey, {
            version: 1,
            localKey: effectiveColumnSettings.storageKey,
            ...settings
          });
        }
      }
    }
  }, [accountTablePreferences.accountId, accountTablePreferences.loaded, columnKeys, columnOrder, columnPreferenceKey, effectiveColumnSettings, hiddenKeys]);

  useEffect(() => {
    const lockedKeys = getManagedTableLockedKeys(effectiveColumnSettings, columnKeys);
    setHiddenKeys((current) => {
      const next = current.filter((key) => columnKeys.includes(key) && !lockedKeys.includes(key));
      return areManagedTableStringArraysEqual(current, next) ? current : next;
    });
    setColumnOrder((current) => {
      const next = normalizeManagedTableColumnOrder(current.length ? current : effectiveColumnSettings?.defaultColumnOrder, columnKeys);
      return areManagedTableStringArraysEqual(current, next) ? current : next;
    });
  }, [columnKeys, effectiveColumnSettings?.defaultColumnOrder, effectiveColumnSettings?.lockedKeys]);

  useEffect(() => {
    const preferenceKey = widthPreferenceKey;
    const identity = accountTablePreferences.accountId
      ? `${accountTablePreferences.accountId}:${widthPreferenceKey}`
      : undefined;
    if (!identity) {
      hydratedWidthPreferenceRef.current = undefined;
      return;
    }
    if (!accountTablePreferences.loaded || hydratedWidthPreferenceRef.current === identity) return;
    hydratedWidthPreferenceRef.current = identity;
    suppressWidthPreferenceSaveRef.current = true;
    const remoteValue = accountTablePreferences.values[preferenceKey];
    if (remoteValue) {
      const next = normalizeManagedTableRemoteColumnWidths(remoteValue, columnKeys);
      setColumnWidths(next);
      writeManagedTableColumnWidths(widthStorageKey, next);
      return;
    }
    const widths = Object.fromEntries(Object.entries(columnWidths).filter(([key]) => columnKeys.includes(key)));
    saveAccountTablePreference(preferenceKey, { version: 1, localKey: widthStorageKey, widths });
  }, [accountTablePreferences.accountId, accountTablePreferences.loaded, accountTablePreferences.values, columnKeys, widthPreferenceKey, widthStorageKey]);

  useEffect(() => {
    if (widthStorageKey) {
      const widths = Object.fromEntries(Object.entries(columnWidths).filter(([key]) => columnKeys.includes(key)));
      writeManagedTableColumnWidths(widthStorageKey, widths);
      const identity = accountTablePreferences.accountId && widthPreferenceKey
        ? `${accountTablePreferences.accountId}:${widthPreferenceKey}`
        : undefined;
      if (identity && accountTablePreferences.loaded && hydratedWidthPreferenceRef.current === identity) {
        if (suppressWidthPreferenceSaveRef.current) {
          suppressWidthPreferenceSaveRef.current = false;
        } else {
          saveAccountTablePreference(widthPreferenceKey, { version: 1, localKey: widthStorageKey, widths });
        }
      }
    }
  }, [accountTablePreferences.accountId, accountTablePreferences.loaded, columnKeys, columnWidths, widthPreferenceKey, widthStorageKey]);

  useEffect(() => {
    setColumnWidths(readManagedTableColumnWidths(widthStorageKey));
  }, [widthStorageKey]);

  useEffect(
    () => () => {
      resizeCleanupRef.current?.();
    },
    []
  );

  const startColumnResize = useCallback((key: string, startWidth: number, event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    resizeCleanupRef.current?.();
    const startX = event.clientX;
    document.body.classList.add('is-resizing-table-column');
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(72, Math.round(startWidth + moveEvent.clientX - startX));
      setColumnWidths((current) => ({ ...current, [key]: nextWidth }));
    };
    const handleMouseUp = () => {
      resizeCleanupRef.current?.();
      resizeCleanupRef.current = null;
    };
    const cleanup = () => {
      document.body.classList.remove('is-resizing-table-column');
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    resizeCleanupRef.current = cleanup;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, []);

  const visibleColumns = useMemo(() => {
    const sourceColumns = effectiveColumnSettings ? orderManagedTableColumns(resolvedColumns, columnOrder) : resolvedColumns;
    const nextColumns = filterManagedTableVisibleColumns(sourceColumns, hiddenKeys);
    return nextColumns.length ? nextColumns : resolvedColumns.slice(0, 1);
  }, [columnOrder, effectiveColumnSettings, hiddenKeys, resolvedColumns]);
  const dataSource = useMemo(() => (Array.isArray(props.dataSource) ? props.dataSource : []), [props.dataSource]);
  const managedColumns = useMemo(() => {
    const sortedColumns = applyManagedTableDefaultSorters(visibleColumns, dataSource);
    return resizableColumns
      ? applyManagedColumnWidths(sortedColumns, columnWidths, startColumnResize)
      : sortedColumns;
  }, [columnWidths, dataSource, resizableColumns, startColumnResize, visibleColumns]);
  const tableSettingsButton = useMemo(() => effectiveColumnSettings ? (
    <Tooltip title="列设置">
      <Button
        className="managed-table-settings-button"
        aria-label="列设置"
        icon={<Settings size={16} />}
        onClick={() => setSettingsOpen(true)}
      />
    </Tooltip>
  ) : null, [effectiveColumnSettings]);
  const detailDisabledColumnKeys = useMemo(
    () => new Set([
      ...(recordDetailOptions?.excludeColumnKeys ?? []),
      ...columnKeys.filter((key) => isManagedTableSelectionColumnKey(key) || isManagedTableActionColumnKey(key)),
      '__managed_table_column_settings'
    ]),
    [columnKeys, recordDetailOptions?.excludeColumnKeys]
  );
  const managedColumnsForTable = useMemo(() => {
    const detailAwareColumns = internalRecordDetailEnabled
      ? applyManagedTableRecordDetailCells(managedColumns, detailDisabledColumnKeys)
      : managedColumns;
    return applyManagedTableActionColumnClass(detailAwareColumns);
  }, [detailDisabledColumnKeys, internalRecordDetailEnabled, managedColumns]);
  const managedColumnsWithSettings = useMemo(() => {
    if (!tableSettingsButton || columnSettingsPlacement !== 'column') {
      return managedColumnsForTable;
    }
    const settingsColumn: ColumnsType<RecordType>[number] = {
      key: '__managed_table_column_settings',
      title: <span className="managed-table-settings-header">{tableSettingsButton}</span>,
      width: 48,
      fixed: 'right',
      align: 'center',
      className: 'managed-table-settings-column',
      onHeaderCell: () => ({ className: 'managed-table-settings-column' }),
      render: () => null
    };
    return [...managedColumnsForTable, settingsColumn];
  }, [columnSettingsPlacement, managedColumnsForTable, tableSettingsButton]);
  const visibleBusinessColumnCount = useMemo(
    () => collectManagedTableColumnKeys(managedColumnsForTable as ManagedColumnLike[])
      .filter((key) => !isManagedTableSelectionColumnKey(key) && !isManagedTableActionColumnKey(key))
      .length,
    [managedColumnsForTable]
  );
  const resolvedDensity = density === 'auto'
    ? visibleBusinessColumnCount >= 15
      ? 'dense'
      : visibleBusinessColumnCount >= 10
        ? 'compact'
        : 'standard'
    : density;
  const paginationRef = useRef(pagination);
  paginationRef.current = pagination;
  const handlePaginationChange = useCallback((page: number, pageSize: number) => {
    const current = paginationRef.current;
    if (current !== false) current?.onChange?.(page, pageSize);
  }, []);
  const handlePaginationSizeChange = useCallback((currentPage: number, pageSize: number) => {
    const current = paginationRef.current;
    if (current !== false) current?.onShowSizeChange?.(currentPage, pageSize);
  }, []);
  const paginationSignature = getManagedTablePaginationSignature(pagination as TableProps<object>['pagination']);
  // Ant Design compares this object in internal effects. Keep its reference
  // stable when only a caller's inline callback/object identity changes.
  const normalizedPagination = useMemo(
    () => {
      if (pagination === false) return false;
      const next: TablePaginationConfig = { ...tenRowTablePagination, ...pagination };
      if (typeof pagination?.onChange === 'function') {
        next.onChange = handlePaginationChange;
      }
      if (typeof pagination?.onShowSizeChange === 'function') {
        next.onShowSizeChange = handlePaginationSizeChange;
      }
      return next;
    },
    [handlePaginationChange, handlePaginationSizeChange, paginationSignature]
  );
  const [activePagination, setActivePagination] = useState(() => ({
    current: normalizedPagination === false ? 1 : normalizedPagination.current ?? normalizedPagination.defaultCurrent ?? 1,
    pageSize: normalizedPagination === false ? tenRowTablePagination.pageSize ?? 10 : normalizedPagination.pageSize ?? normalizedPagination.defaultPageSize ?? tenRowTablePagination.pageSize ?? 10
  }));
  useEffect(() => {
    if (normalizedPagination === false) {
      return;
    }
    setActivePagination((current) => {
      const next = {
        current: normalizedPagination.current ?? current.current,
        pageSize: normalizedPagination.pageSize ?? current.pageSize
      };
      return next.current === current.current && next.pageSize === current.pageSize ? current : next;
    });
  }, [normalizedPagination]);
  const effectivePagination = useMemo(() => normalizedPagination === false ? false : ({
    ...normalizedPagination,
    current: normalizedPagination.current ?? activePagination.current,
    pageSize: normalizedPagination.pageSize ?? activePagination.pageSize
  }), [activePagination.current, activePagination.pageSize, normalizedPagination]);
  const tableScrollX = scroll?.x ?? (minimumScrollX > 0 ? getManagedTableScrollX(managedColumnsForTable as ColumnsType<unknown>, minimumScrollX) : undefined);
  const scrollSignature = getManagedTableScrollSignature(scroll as TableProps<object>['scroll']);
  const managedScroll = useMemo(() => ({ ...scroll, x: tableScrollX }), [scrollSignature, tableScrollX]);
  const managedComponents = useMemo(
    () => resizableColumns
      ? { ...props.components, header: { ...props.components?.header, cell: ResizableHeaderCell } }
      : props.components,
    [props.components, resizableColumns]
  );
  const selectedRowKeys = Array.isArray(rowSelection?.selectedRowKeys) ? rowSelection.selectedRowKeys : [];

  // `rowSelection` is controlled by the caller. Do not prune or otherwise
  // write it back from an effect: a changing data source or inline selection
  // object can otherwise produce a parent ↔ table update loop. Selection
  // changes are emitted only by Ant Design user events through this callback.

  const managedRowSelection = useMemo(
    () =>
      rowSelection
        ? {
            ...rowSelection,
            columnWidth: rowSelection.columnWidth ?? 56,
            fixed: rowSelection.fixed ?? true,
            preserveSelectedRowKeys: rowSelection.preserveSelectedRowKeys ?? false
          }
        : undefined,
    [rowSelection]
  );
  const selectionSummary = rowSelection && showSelectionSummary ? (
    <span className="managed-table-selection-summary" aria-live="polite">
      已选 {selectedRowKeys.length} 条
    </span>
  ) : null;
  const toolbarSettingsButton = columnSettingsPlacement === 'toolbar' ? tableSettingsButton : null;
  const handleTableChange = useCallback<NonNullable<TableProps<RecordType>['onChange']>>((nextPagination, filters, sorter, extra) => {
    const nextCurrent = nextPagination.current ?? 1;
    const nextPageSize = nextPagination.pageSize ?? tenRowTablePagination.pageSize ?? 10;
    const paginationChanged = nextCurrent !== activePagination.current || nextPageSize !== activePagination.pageSize;
    if (
      rowSelection?.onChange
      && !rowSelection.preserveSelectedRowKeys
      && selectedRowKeys.length
      && (nextCurrent !== activePagination.current || nextPageSize !== activePagination.pageSize || extra.action !== 'paginate')
    ) {
      rowSelection.onChange([], [], { type: 'none' });
    }
    setActivePagination((current) => {
      if (current.current === nextCurrent && current.pageSize === nextPageSize) {
        return current;
      }
      return {
        current: nextCurrent,
        pageSize: nextPageSize
      };
    });
    if (extra.action !== 'paginate' || paginationChanged) {
      onChange?.(nextPagination, filters, sorter, extra);
    }
  }, [activePagination.current, activePagination.pageSize, onChange, rowSelection, selectedRowKeys.length]);
  const managedOnRow = useCallback<NonNullable<TableProps<RecordType>['onRow']>>((record, index) => {
    const originalRowProps = onRow?.(record, index) ?? {};
    const internalDetailEnabled = Boolean(internalRecordDetailEnabled && (recordDetailOptions?.canOpen?.(record) ?? true));
    if (!internalDetailEnabled) {
      return originalRowProps;
    }
    const openRecordDetail = (event: { target: EventTarget | null; currentTarget: EventTarget | null; defaultPrevented: boolean }) => {
      if (event.defaultPrevented || shouldIgnoreManagedTableRecordDetailEvent(event.target)) {
        return;
      }
      const columnKey = getManagedTableRecordDetailColumnKey(event.target);
      if (columnKey && detailDisabledColumnKeys.has(columnKey)) {
        return;
      }
      setActiveRecordDetail({ record, index });
    };
    return {
      ...originalRowProps,
      className: joinClassNames(originalRowProps.className, 'managed-table-record-detail-row'),
      tabIndex: originalRowProps.tabIndex ?? 0,
      'aria-label': recordDetailOptions?.ariaLabel?.(record),
      onDoubleClick: (event) => {
        originalRowProps.onDoubleClick?.(event);
        openRecordDetail(event);
      },
      onKeyDown: (event) => {
        originalRowProps.onKeyDown?.(event);
        if (event.key === 'Enter' && event.target === event.currentTarget) {
          openRecordDetail(event);
        }
      }
    };
  }, [detailDisabledColumnKeys, internalRecordDetailEnabled, onRow, recordDetailOptions]);

  const orderedRecordDetailColumns = useMemo(
    () => effectiveColumnSettings
      ? orderManagedTableColumns(resolvedRecordDetailColumns, columnOrder)
      : resolvedRecordDetailColumns,
    [columnOrder, effectiveColumnSettings, resolvedRecordDetailColumns]
  );
  const activeRecordDetailFields = useMemo(
    () => activeRecordDetail
      ? buildManagedTableRecordDetailFields(
          orderedRecordDetailColumns,
          activeRecordDetail.record,
          activeRecordDetail.index,
          detailDisabledColumnKeys
        )
      : [],
    [activeRecordDetail, detailDisabledColumnKeys, orderedRecordDetailColumns]
  );
  const activeRecordDetailTitle = activeRecordDetail
    ? resolveManagedTableRecordDetailTitle(recordDetailOptions?.title, effectiveColumnSettings?.title, activeRecordDetail.record)
    : '记录详情';
  const closeRecordDetail = useCallback(() => setActiveRecordDetail(null), []);
  const activeRecordDetailFooter = activeRecordDetail && recordDetailOptions?.footer
    ? recordDetailOptions.footer(activeRecordDetail.record, closeRecordDetail, activeRecordDetail.index)
    : undefined;

  return (
    <div className="managed-table-shell">
      {toolbarLeading || selectionSummary || toolbarActions || toolbarSettingsButton ? (
        <div className="managed-table-toolbar">
          <div className="managed-table-toolbar-leading">
            {toolbarLeading}
            {selectionSummary}
          </div>
          <div className="managed-table-toolbar-actions">
            {toolbarActions}
            {toolbarSettingsButton}
          </div>
        </div>
      ) : null}
      <Table<RecordType>
        {...props}
        className={[
          'managed-table',
          `managed-table-density-${resolvedDensity}`,
          resizableColumns ? 'managed-table-resizable' : null,
          className
        ].filter(Boolean).join(' ')}
        columns={managedColumnsWithSettings}
        components={managedComponents}
        pagination={effectivePagination}
        rowSelection={managedRowSelection}
        scroll={managedScroll}
        sticky={sticky ?? true}
        onChange={handleTableChange}
        onRow={managedOnRow}
      />
      {effectiveColumnSettings ? (
        <Modal
          title={effectiveColumnSettings.title ?? '列设置'}
          open={settingsOpen}
          width={560}
          destroyOnHidden
          onCancel={() => setSettingsOpen(false)}
          footer={[
            <Button key="all" onClick={() => setHiddenKeys([])}>
              全选
            </Button>,
            <Button key="default" onClick={() => {
              setHiddenKeys(effectiveColumnSettings.defaultHiddenKeys ?? []);
              setColumnOrder(normalizeManagedTableColumnOrder(effectiveColumnSettings.defaultColumnOrder, columnKeys));
              setColumnWidths({});
            }}>
              恢复默认
            </Button>,
            <Button key="close" type="primary" onClick={() => setSettingsOpen(false)}>
              完成
            </Button>
          ]}
        >
          <div className="managed-column-settings-list">
            {normalizeManagedTableColumnOrder(columnOrder, columnKeys).map((key, index, keys) => {
              const visible = !hiddenKeys.includes(key);
              const locked = getManagedTableLockedKeys(effectiveColumnSettings, columnKeys).includes(key);
              return (
                <div className="managed-column-settings-row" key={key}>
                  <Checkbox
                    checked={visible}
                    disabled={locked}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      if (locked) {
                        return;
                      }
                      setHiddenKeys((current) => {
                        if (checked) {
                          return current.filter((item) => item !== key);
                        }
                        const visibleCount = columnKeys.length - current.length;
                        if (visibleCount <= 1 && !current.includes(key)) {
                          return current;
                        }
                        return current.includes(key) ? current : [...current, key];
                      });
                    }}
                  >
                    {effectiveColumnSettings.labels?.[key] ?? getTableColumnLabel(resolvedColumns as ManagedColumnLike[], key)}
                  </Checkbox>
                  <Space size={6}>
                    <Button size="small" disabled={locked || index === 0} onClick={() => setColumnOrder((current) => moveManagedTableColumnToFirst(current, columnKeys, key))}>
                      移到首行
                    </Button>
                    <Button size="small" disabled={locked || index === 0} onClick={() => setColumnOrder((current) => moveManagedTableColumn(current, columnKeys, key, -1))}>
                      上移
                    </Button>
                    <Button size="small" disabled={locked || index === keys.length - 1} onClick={() => setColumnOrder((current) => moveManagedTableColumn(current, columnKeys, key, 1))}>
                      下移
                    </Button>
                  </Space>
                </div>
              );
            })}
          </div>
        </Modal>
      ) : null}
      <RecordDetailModal
        open={Boolean(activeRecordDetail)}
        title={activeRecordDetailTitle}
        fields={activeRecordDetailFields}
        footer={activeRecordDetailFooter}
        onClose={closeRecordDetail}
      />
    </div>
  );
}

export function ManagedDualViewTable<RecordType extends object>({
  views,
  viewStorageKey,
  defaultView = 'ledger',
  viewAriaLabel = '表格视图',
  shellClassName,
  onViewChange,
  pagination,
  toolbarActions,
  ...props
}: ManagedDualViewTableProps<RecordType>) {
  const accountTablePreferences = useAccountTablePreferences();
  const viewPreferenceKey = useMemo(
    () => getAccountTablePreferenceKey('view', viewStorageKey),
    [viewStorageKey]
  );
  const [activeView, setActiveView] = useState<ManagedTableViewMode>(
    () => readManagedTableViewPreference(viewStorageKey, defaultView)
  );
  const hydratedViewPreferenceRef = useRef<string | undefined>(undefined);
  const suppressViewPreferenceSaveRef = useRef(false);
  const [uncontrolledPagination, setUncontrolledPagination] = useState(() => ({
    current: pagination === false ? 1 : pagination?.current ?? pagination?.defaultCurrent ?? 1,
    pageSize: pagination === false
      ? tenRowTablePagination.pageSize ?? 10
      : pagination?.pageSize ?? pagination?.defaultPageSize ?? tenRowTablePagination.pageSize ?? 10
  }));

  useEffect(() => {
    setActiveView(readManagedTableViewPreference(viewStorageKey, defaultView));
  }, [defaultView, viewStorageKey]);

  useEffect(() => {
    const identity = accountTablePreferences.accountId
      ? `${accountTablePreferences.accountId}:${viewPreferenceKey}`
      : undefined;
    if (!identity) {
      hydratedViewPreferenceRef.current = undefined;
      return;
    }
    if (!accountTablePreferences.loaded || hydratedViewPreferenceRef.current === identity) return;
    hydratedViewPreferenceRef.current = identity;
    suppressViewPreferenceSaveRef.current = true;
    const saved = accountTablePreferences.values[viewPreferenceKey];
    if (isManagedTableViewMode(saved?.view)) {
      setActiveView(saved.view);
      writeManagedTableViewPreference(viewStorageKey, saved.view);
      return;
    }
    saveAccountTablePreference(viewPreferenceKey, { version: 1, localKey: viewStorageKey, view: activeView });
  }, [accountTablePreferences.accountId, accountTablePreferences.loaded, accountTablePreferences.values, activeView, viewPreferenceKey, viewStorageKey]);

  useEffect(() => {
    writeManagedTableViewPreference(viewStorageKey, activeView);
    const identity = accountTablePreferences.accountId
      ? `${accountTablePreferences.accountId}:${viewPreferenceKey}`
      : undefined;
    if (identity && accountTablePreferences.loaded && hydratedViewPreferenceRef.current === identity) {
      if (suppressViewPreferenceSaveRef.current) {
        suppressViewPreferenceSaveRef.current = false;
      } else {
        saveAccountTablePreference(viewPreferenceKey, { version: 1, localKey: viewStorageKey, view: activeView });
      }
    }
    onViewChange?.(activeView);
  }, [accountTablePreferences.accountId, accountTablePreferences.loaded, activeView, onViewChange, viewPreferenceKey, viewStorageKey]);

  useEffect(() => {
    if (pagination === false) return;
    setUncontrolledPagination((current) => {
      const next = {
        current: pagination?.current ?? current.current,
        pageSize: pagination?.pageSize ?? current.pageSize
      };
      return next.current === current.current && next.pageSize === current.pageSize ? current : next;
    });
  }, [pagination, pagination === false ? undefined : pagination?.current, pagination === false ? undefined : pagination?.pageSize]);

  const managedPagination = pagination === false ? false : {
    ...pagination,
    current: pagination?.current ?? uncontrolledPagination.current,
    pageSize: pagination?.pageSize ?? uncontrolledPagination.pageSize,
    onChange: (page: number, pageSize: number) => {
      if (pagination?.current === undefined || pagination?.pageSize === undefined) {
        setUncontrolledPagination({ current: page, pageSize });
      }
      pagination?.onChange?.(page, pageSize);
    },
    onShowSizeChange: (current: number, pageSize: number) => {
      if (pagination?.current === undefined || pagination?.pageSize === undefined) {
        setUncontrolledPagination({ current, pageSize });
      }
      pagination?.onShowSizeChange?.(current, pageSize);
    }
  };
  const activeDefinition = views[activeView];
  const activeTableProps = activeDefinition.tableProps ?? {};
  const modeToolbar = (
    <>
      <Segmented
        aria-label={viewAriaLabel}
        size="small"
        value={activeView}
        options={[
          { label: views.matrix.label ?? '矩阵视图', value: 'matrix' },
          { label: views.ledger.label ?? '精密台账模式', value: 'ledger' }
        ]}
        onChange={(value) => setActiveView(value as ManagedTableViewMode)}
      />
      {toolbarActions}
    </>
  );

  return (
    <div className={joinClassNames('managed-dual-view-table', `managed-dual-view-table-${activeView}`, shellClassName, activeDefinition.shellClassName)}>
      <ManagedTable<RecordType>
        key={`${viewStorageKey}:${activeView}`}
        {...props}
        {...activeTableProps}
        className={joinClassNames(`managed-table-view-${activeView}`, activeTableProps.className)}
        columns={activeDefinition.columns}
        pagination={managedPagination}
        toolbarActions={modeToolbar}
      />
    </div>
  );
}

type ResizeHeaderCellProps = ThHTMLAttributes<HTMLTableCellElement> & {
  resizeColumnKey?: string;
  resizeColumnWidth?: number;
  onResizeColumnStart?: (key: string, width: number, event: ReactMouseEvent<HTMLElement>) => void;
};

function ResizableHeaderCell({ children, className, resizeColumnKey, resizeColumnWidth, onResizeColumnStart, ...props }: ResizeHeaderCellProps) {
  return (
    <th {...props} className={[className, resizeColumnKey ? 'managed-table-resizable-cell' : null].filter(Boolean).join(' ')}>
      {children}
      {resizeColumnKey && resizeColumnWidth ? (
        <span
          aria-hidden="true"
          className="managed-table-resize-handle"
          data-testid={`column-resize-handle-${sanitizeColumnKey(resizeColumnKey)}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => onResizeColumnStart?.(resizeColumnKey, resizeColumnWidth, event)}
        />
      ) : null}
    </th>
  );
}

function applyManagedTableRecordDetailCells<RecordType extends object>(
  columns: ColumnsType<RecordType>,
  disabledColumnKeys: Set<string>
): ColumnsType<RecordType> {
  return columns.map((column, index) => {
    if ('children' in column && Array.isArray(column.children)) {
      return {
        ...column,
        children: applyManagedTableRecordDetailCells(column.children as ColumnsType<RecordType>, disabledColumnKeys)
      };
    }
    const key = getTableColumnKey(column as ManagedColumnLike) ?? `column-${index}`;
    const disabled = disabledColumnKeys.has(key)
      || (typeof column.title === 'string' && /^(操作|动作|选择)$/.test(column.title.trim()));
    return {
      ...column,
      onCell: (record: RecordType, rowIndex?: number) => {
        const originalCell = typeof column.onCell === 'function' ? column.onCell(record, rowIndex) : {};
        return {
          ...originalCell,
          'data-managed-column-key': key,
          'data-record-detail-enabled': disabled ? 'false' : 'true'
        } as HTMLAttributes<HTMLElement>;
      }
    };
  });
}

const managedTableRecordDetailInteractiveSelector = [
  'button',
  'a',
  'input',
  'textarea',
  'select',
  '[role="button"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-record-detail-ignore]',
  '.ant-table-selection-column',
  '.managed-table-settings-column'
].join(',');

function getManagedTableRecordDetailTarget(target: EventTarget | null) {
  return target instanceof Element ? target : null;
}

function shouldIgnoreManagedTableRecordDetailEvent(target: EventTarget | null) {
  return Boolean(getManagedTableRecordDetailTarget(target)?.closest(managedTableRecordDetailInteractiveSelector));
}

function getManagedTableRecordDetailColumnKey(target: EventTarget | null) {
  return getManagedTableRecordDetailTarget(target)?.closest<HTMLElement>('[data-managed-column-key]')?.dataset.managedColumnKey ?? null;
}

function getManagedTableRecordDetailDataIndexValue<RecordType extends object>(
  record: RecordType,
  dataIndex: string | number | readonly (string | number)[] | undefined
) {
  if (dataIndex === undefined) {
    return undefined;
  }
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  return path.reduce<unknown>((value, segment) => {
    if (value === null || value === undefined || typeof value !== 'object') {
      return undefined;
    }
    return (value as Record<string | number, unknown>)[segment];
  }, record);
}

function inferManagedTableRecordDetailSpan(label: string, value: ReactNode): 1 | 2 | 3 {
  if (/(备注|要求|地址|异常原因|失败原因|处理说明|补充说明)/.test(label)) {
    return 3;
  }
  if (typeof value !== 'string') {
    return 1;
  }
  const weightedLength = Array.from(value).reduce((total, character) => total + (/[^\u0000-\u00ff]/.test(character) ? 2 : 1), 0);
  if (value.includes('\n') || weightedLength > 64) {
    return 3;
  }
  return weightedLength > 32 ? 2 : 1;
}

function makeManagedTableRecordDetailValueReadOnly(value: ReactNode): ReactNode {
  if (Array.isArray(value)) {
    return value.map((item, index) => <span key={index}>{makeManagedTableRecordDetailValueReadOnly(item)}</span>);
  }
  if (!isValidElement<{ children?: ReactNode; [key: string]: unknown }>(value)) {
    return value;
  }
  const props = value.props;
  const intrinsicType = typeof value.type === 'string' ? value.type : undefined;
  const isInteractive = Boolean(
    intrinsicType && ['button', 'a', 'input', 'textarea', 'select'].includes(intrinsicType)
      || props.href
      || props.role === 'button'
      || props.onClick
      || props.onDoubleClick
      || props.onChange
  );
  if (isInteractive) {
    return props.children ? makeManagedTableRecordDetailValueReadOnly(props.children) : String(props.value ?? '-');
  }
  const readOnlyProps = Object.fromEntries(
    Object.entries(props).filter(([key]) => !/^on[A-Z]/.test(key) && !['href', 'target', 'tabIndex'].includes(key))
  );
  if ('copyable' in readOnlyProps) {
    readOnlyProps.copyable = false;
  }
  return cloneElement(value, readOnlyProps, makeManagedTableRecordDetailValueReadOnly(props.children));
}

function buildManagedTableRecordDetailFields<RecordType extends object>(
  columns: ManagedTableColumns<RecordType>,
  record: RecordType,
  rowIndex: number | undefined,
  disabledColumnKeys: Set<string>
): RecordDetailField[] {
  return columns.flatMap((column) => {
    if ('children' in column && Array.isArray(column.children) && column.children.length) {
      return buildManagedTableRecordDetailFields(
        column.children as ManagedTableColumns<RecordType>,
        record,
        rowIndex,
        disabledColumnKeys
      );
    }
    const key = getTableColumnKey(column as ManagedColumnLike);
    if (!key
      || disabledColumnKeys.has(key)
      || isManagedTableSelectionColumnKey(key)
      || isManagedTableActionColumnKey(key)
      || column.recordDetail === false) {
      return [];
    }
    const detail = column.recordDetail || undefined;
    const label = detail?.label
      ?? (typeof column.settingsLabel === 'string' && column.settingsLabel.trim() ? column.settingsLabel.trim() : undefined)
      ?? (typeof column.title === 'string' && column.title.trim() ? column.title.trim() : undefined);
    if (!label) {
      return [];
    }
    const dataIndex = (column as ColumnType<RecordType>).dataIndex as string | number | readonly (string | number)[] | undefined;
    const dataValue = getManagedTableRecordDetailDataIndexValue(record, dataIndex)
      ?? (dataIndex === undefined && !key.startsWith(managedTableGeneratedColumnKeyPrefix)
        ? getManagedTableRecordDetailDataIndexValue(record, key)
        : undefined);
    const columnRender = (column as ColumnType<RecordType>).render;
    const renderedValue = typeof columnRender === 'function'
      ? columnRender(dataValue, record, rowIndex ?? 0)
      : dataValue;
    const rawValue = detail?.value ? detail.value(record, rowIndex) : renderedValue;
    if (rawValue && typeof rawValue === 'object' && !isValidElement(rawValue) && 'children' in rawValue) {
      const renderedCell = rawValue as { children?: ReactNode };
      return [{
        key,
        label,
        value: detail?.interactive ? (renderedCell.children ?? '-') : makeManagedTableRecordDetailValueReadOnly(renderedCell.children ?? '-'),
        span: detail?.span ?? 1
      }];
    }
    if (rawValue !== null && typeof rawValue === 'object' && !Array.isArray(rawValue) && !('$$typeof' in rawValue)) {
      return [];
    }
    const value = rawValue === null || rawValue === undefined || rawValue === ''
      ? '-'
      : typeof rawValue === 'boolean'
        ? (rawValue ? '是' : '否')
        : Array.isArray(rawValue)
          ? rawValue.join('、') || '-'
          : detail?.interactive
            ? rawValue as ReactNode
            : makeManagedTableRecordDetailValueReadOnly(rawValue as ReactNode);
    return [{
      key,
      label,
      value,
      span: detail?.span ?? inferManagedTableRecordDetailSpan(label, value)
    }];
  });
}

function resolveManagedTableRecordDetailTitle<RecordType extends object>(
  configuredTitle: ReactNode | ((record: RecordType) => ReactNode) | undefined,
  columnSettingsTitle: string | undefined,
  record: RecordType
) {
  if (typeof configuredTitle === 'function') {
    return configuredTitle(record);
  }
  if (configuredTitle) {
    return configuredTitle;
  }
  const baseTitle = columnSettingsTitle?.trim().replace(/列设置$/, '').trim();
  return baseTitle ? `${baseTitle}详情` : '记录详情';
}

function applyManagedColumnWidths<RecordType extends object>(
  columns: ColumnsType<RecordType>,
  widths: Record<string, number>,
  onResizeColumnStart?: (key: string, width: number, event: ReactMouseEvent<HTMLElement>) => void
): ColumnsType<RecordType> {
  return columns.map((column, index) => {
    const key = getTableColumnKey(column as ManagedColumnLike) ?? `column-${index}`;
    const existingWidth = getColumnNumericWidth(column as ManagedColumnLike);
    const columnResizable = (column as ManagedColumnLike).resizable !== false;
    const width = columnResizable ? widths[key] ?? existingWidth : existingWidth;
    const nextColumn = {
      ...column,
      width,
      onHeaderCell: (headerColumn: unknown) => {
        const originalHeaderCell = typeof column.onHeaderCell === 'function' ? column.onHeaderCell(headerColumn as never) : {};
        if (!columnResizable) return originalHeaderCell;
        return {
          ...originalHeaderCell,
          resizeColumnKey: key,
          resizeColumnWidth: width,
          onResizeColumnStart
        };
      }
    };
    if ('children' in column && Array.isArray(column.children)) {
      return {
        ...nextColumn,
        children: applyManagedColumnWidths(column.children as ColumnsType<RecordType>, widths, onResizeColumnStart)
      };
    }
    return nextColumn;
  });
}

function applyManagedTableDefaultSorters<RecordType extends object>(columns: ManagedTableColumns<RecordType>, records: RecordType[]): ManagedTableColumns<RecordType> {
  return columns.map((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      return {
        ...column,
        children: applyManagedTableDefaultSorters(column.children as ManagedTableColumns<RecordType>, records)
      };
    }
    if (!shouldApplyManagedTableDefaultSorter(column as ManagedColumnLike & { sorter?: unknown }, records)) {
      return column;
    }
    const managedColumn = column as ManagedColumnLike;
    return {
      ...column,
      sorter: (left: RecordType, right: RecordType) => compareManagedTableCellValues(
        getManagedTableColumnSortValue(left, managedColumn),
        getManagedTableColumnSortValue(right, managedColumn)
      )
    };
  });
}

function shouldApplyManagedTableDefaultSorter(column: ManagedColumnLike & { sorter?: unknown }, records: object[]) {
  return column.sortable !== false
    && (column.dataIndex !== undefined || typeof column.sortValue === 'function' || columnKeyMapsToRecordField(column, records))
    && !Object.prototype.hasOwnProperty.call(column, 'sorter');
}

function getManagedTableColumnSortValue(record: object, column: ManagedColumnLike) {
  if (typeof column.sortValue === 'function') {
    return column.sortValue(record);
  }
  return getManagedTableRecordValue(record, column.dataIndex ?? getTableColumnKey(column) ?? undefined);
}

function columnKeyMapsToRecordField(column: ManagedColumnLike, records: object[]) {
  const key = getTableColumnKey(column);
  return Boolean(key && records.some((record) => Object.prototype.hasOwnProperty.call(record, key)));
}

function getManagedTableRecordValue(record: object, dataIndex: ManagedColumnLike['dataIndex']): unknown {
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  let value: unknown = record;
  for (const key of path) {
    if ((typeof key !== 'string' && typeof key !== 'number') || !value || typeof value !== 'object') {
      return undefined;
    }
    value = (value as Record<string | number, unknown>)[key];
  }
  return value;
}

function compareManagedTableCellValues(left: unknown, right: unknown) {
  if (left === right) return 0;
  if (left === null || left === undefined || left === '') return 1;
  if (right === null || right === undefined || right === '') return -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left).localeCompare(String(right), 'zh-Hans-CN', { numeric: true, sensitivity: 'base' });
}

function getColumnNumericWidth(column: ManagedColumnLike & { width?: number | string }): number {
  const rawWidth = column.width;
  if (typeof rawWidth === 'number' && Number.isFinite(rawWidth)) {
    return rawWidth;
  }
  if (typeof rawWidth === 'string') {
    const parsed = Number(rawWidth.replace('px', ''));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 140;
}

function sanitizeColumnKey(key: string) {
  return key.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function normalizeTableColumnKey(key: Key | undefined): string | null {
  if (key === undefined) {
    return null;
  }
  return String(key);
}

type ManagedColumnLike = {
  key?: Key;
  dataIndex?: string | number | readonly (string | number)[];
  title?: ReactNode;
  sortValue?: (record: object) => unknown;
  sortable?: boolean;
  resizable?: boolean;
  settingsLabel?: string;
};

const managedTableGeneratedColumnKeyPrefix = '__managed_generated__:';

function resolveManagedTableColumnKeys<RecordType extends object>(columns: ManagedTableColumns<RecordType>): ManagedTableColumns<RecordType> {
  const usedKeys = new Set<string>();
  const reserveKey = (candidate: string) => {
    if (!usedKeys.has(candidate)) {
      usedKeys.add(candidate);
      return candidate;
    }
    let suffix = 2;
    while (usedKeys.has(`${candidate}:${suffix}`)) suffix += 1;
    const uniqueKey = `${candidate}:${suffix}`;
    usedKeys.add(uniqueKey);
    return uniqueKey;
  };
  const visit = (source: ManagedTableColumns<RecordType>, path: number[]): ManagedTableColumns<RecordType> => source.map((column, index) => {
    const nextPath = [...path, index];
    if ('children' in column && Array.isArray(column.children) && column.children.length) {
      return {
        ...column,
        children: visit(column.children as ManagedTableColumns<RecordType>, nextPath)
      };
    }
    const explicitKey = getTableColumnKey(column as ManagedColumnLike);
    const label = typeof column.settingsLabel === 'string' && column.settingsLabel.trim()
      ? column.settingsLabel.trim()
      : typeof column.title === 'string' && column.title.trim()
        ? column.title.trim()
        : `column-${nextPath.join('-')}`;
    const key = reserveKey(explicitKey ?? `${managedTableGeneratedColumnKeyPrefix}${label}`);
    return key === explicitKey ? column : { ...column, key };
  });
  return visit(columns, []);
}

function getTableColumnKey(column: ManagedColumnLike): string | null {
  const explicitKey = normalizeTableColumnKey(column.key);
  if (explicitKey) {
    return explicitKey;
  }
  const dataIndex = column.dataIndex;
  if (Array.isArray(dataIndex)) {
    return dataIndex.join('.');
  }
  if (typeof dataIndex === 'string' || typeof dataIndex === 'number') {
    return String(dataIndex);
  }
  return null;
}

function getTableColumnLabel(columns: ManagedColumnLike[], key: string) {
  const column = findManagedTableColumn(columns, key);
  if (typeof column?.settingsLabel === 'string' && column.settingsLabel.trim()) {
    return column.settingsLabel;
  }
  return typeof column?.title === 'string' ? column.title : key;
}

function collectManagedTableColumnKeys(columns: ManagedColumnLike[]): string[] {
  return columns.flatMap((column) => {
    if ('children' in column && Array.isArray(column.children) && column.children.length) {
      return collectManagedTableColumnKeys(column.children as ManagedColumnLike[]);
    }
    const key = getTableColumnKey(column);
    return key ? [key] : [];
  });
}

function findManagedTableColumn(columns: ManagedColumnLike[], key: string): ManagedColumnLike | undefined {
  for (const column of columns) {
    if (getTableColumnKey(column) === key) {
      return column;
    }
    if ('children' in column && Array.isArray(column.children)) {
      const found = findManagedTableColumn(column.children as ManagedColumnLike[], key);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

function normalizeManagedTableColumnOrder(order: string[] | undefined, columnKeys: string[]) {
  const selectionKeys = columnKeys.filter(isManagedTableSelectionColumnKey);
  const actionKeys = columnKeys.filter(isManagedTableTrailingActionColumnKey);
  const normalized = (order ?? []).filter((key, index, array) => columnKeys.includes(key) && !selectionKeys.includes(key) && !actionKeys.includes(key) && array.indexOf(key) === index);
  return [
    ...selectionKeys,
    ...normalized,
    ...columnKeys.filter((key) => !selectionKeys.includes(key) && !actionKeys.includes(key) && !normalized.includes(key)),
    ...actionKeys
  ];
}

function orderManagedTableColumns<RecordType extends object>(columns: ColumnsType<RecordType>, columnOrder: string[]) {
  const rank = new Map(normalizeManagedTableColumnOrder(columnOrder, collectManagedTableColumnKeys(columns as ManagedColumnLike[])).map((key, index) => [key, index]));
  const rankedColumn = (column: ColumnsType<RecordType>[number], fallback: number) => {
    const keys = collectManagedTableColumnKeys([column as ManagedColumnLike]);
    return Math.min(...keys.map((key) => rank.get(key) ?? fallback));
  };
  const keyedColumns = new Map<string, ColumnsType<RecordType>[number]>();
  const keylessColumns: ColumnsType<RecordType> = [];
  columns.forEach((column, index) => {
    if ('children' in column && Array.isArray(column.children)) {
      keylessColumns.push({
        ...column,
        children: orderManagedTableColumns(column.children as ColumnsType<RecordType>, columnOrder)
      });
      return;
    }
    const key = getTableColumnKey(column as ManagedColumnLike);
    if (key) {
      keyedColumns.set(key, column);
    } else {
      keylessColumns.push(column);
    }
  });
  const orderedColumns = normalizeManagedTableColumnOrder(columnOrder, Array.from(keyedColumns.keys()))
    .map((key) => keyedColumns.get(key))
    .filter((column): column is ColumnsType<RecordType>[number] => Boolean(column));
  return [...orderedColumns, ...keylessColumns].sort((left, right) => rankedColumn(left, columns.indexOf(left)) - rankedColumn(right, columns.indexOf(right))) as ColumnsType<RecordType>;
}

function filterManagedTableVisibleColumns<RecordType extends object>(columns: ColumnsType<RecordType>, hiddenKeys: string[]): ColumnsType<RecordType> {
  return columns.flatMap((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      const children = filterManagedTableVisibleColumns(column.children as ColumnsType<RecordType>, hiddenKeys);
      return children.length ? [{ ...column, children }] : [];
    }
    const key = getTableColumnKey(column as ManagedColumnLike);
    return key && hiddenKeys.includes(key) ? [] : [column];
  }) as ColumnsType<RecordType>;
}

function applyManagedTableActionColumnClass<RecordType extends object>(columns: ColumnsType<RecordType>): ColumnsType<RecordType> {
  return columns.map((column) => {
    if ('children' in column && Array.isArray(column.children)) {
      return {
        ...column,
        children: applyManagedTableActionColumnClass(column.children as ColumnsType<RecordType>)
      };
    }
    const key = getTableColumnKey(column as ManagedColumnLike);
    if (!key || !isManagedTableActionColumnKey(key)) {
      return column;
    }
    const isWideActionColumn = typeof column.width === 'number' && column.width >= 300;
    return {
      ...column,
      width: isWideActionColumn ? 240 : column.width,
      className: joinClassNames(
        column.className,
        'managed-table-action-column',
        isWideActionColumn ? 'managed-table-action-column-wrapped' : undefined
      )
    };
  });
}

function moveManagedTableColumn(currentOrder: string[], columnKeys: string[], key: string, offset: -1 | 1) {
  const next = normalizeManagedTableColumnOrder(currentOrder, columnKeys);
  const index = next.indexOf(key);
  const targetIndex = index + offset;
  if (index < 0 || targetIndex < 0 || targetIndex >= next.length) {
    return next;
  }
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

function moveManagedTableColumnToFirst(currentOrder: string[], columnKeys: string[], key: string) {
  const next = normalizeManagedTableColumnOrder(currentOrder, columnKeys);
  const index = next.indexOf(key);
  if (index <= 0) return next;
  next.splice(index, 1);
  next.unshift(key);
  return next;
}

function readManagedTableColumnSettings(columnSettings: ManagedTableColumnSettings | undefined, columnKeys: string[]) {
  const fallback = {
    hiddenKeys: columnSettings?.defaultHiddenKeys ?? [],
    columnOrder: normalizeManagedTableColumnOrder(columnSettings?.defaultColumnOrder, columnKeys)
  };
  if (!columnSettings) {
    return { hiddenKeys: [], columnOrder: columnKeys };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(columnSettings.storageKey) ?? 'null') as unknown;
    if (Array.isArray(saved)) {
      return {
        hiddenKeys: saved.filter((key): key is string => typeof key === 'string' && columnKeys.includes(key)),
        columnOrder: fallback.columnOrder
      };
    }
    if (saved && typeof saved === 'object') {
      const stored = saved as ManagedTableStoredSettings;
      const accountSettings = getManagedTableSettingsAccountKey();
      const scoped = accountSettings && stored.accounts ? stored.accounts[accountSettings] : undefined;
      // Once account-specific settings exist, never let another account inherit the latest root snapshot.
      const selected = scoped ?? (stored.accounts ? undefined : stored);
      if (!selected) return fallback;
      const lockedKeys = getManagedTableLockedKeys(columnSettings, columnKeys);
      const storedHiddenKeys = Array.isArray(selected.hiddenKeys)
        ? selected.hiddenKeys
        : Array.isArray(selected.hidden)
          ? selected.hidden
          : undefined;
      const storedColumnOrder = Array.isArray(selected.columnOrder)
        ? selected.columnOrder
        : Array.isArray(selected.order)
          ? selected.order
          : undefined;
      const storedSchemaKeys = Array.isArray(selected.schemaKeys)
        ? selected.schemaKeys.filter((key): key is string => typeof key === 'string')
        : undefined;
      const schemaChanged = storedSchemaKeys
        ? !areManagedTableStringArraysEqual(storedSchemaKeys, columnKeys)
        : Boolean(storedColumnOrder && columnKeys.some((key) => !lockedKeys.includes(key) && !storedColumnOrder.includes(key)));
      if (schemaChanged) return fallback;
      const hiddenKeys = storedHiddenKeys
        ? storedHiddenKeys.filter((key): key is string => typeof key === 'string' && columnKeys.includes(key) && !lockedKeys.includes(key))
        : fallback.hiddenKeys.filter((key) => !lockedKeys.includes(key));
      const columnOrder = storedColumnOrder
        ? normalizeManagedTableColumnOrder(storedColumnOrder.filter((key): key is string => typeof key === 'string'), columnKeys)
        : fallback.columnOrder;
      return { hiddenKeys, columnOrder };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function normalizeManagedTableRemoteColumnSettings(
  saved: Record<string, unknown>,
  columnSettings: ManagedTableColumnSettings,
  columnKeys: string[]
) {
  const lockedKeys = getManagedTableLockedKeys(columnSettings, columnKeys);
  const fallback = {
    hiddenKeys: (columnSettings.defaultHiddenKeys ?? []).filter((key) => columnKeys.includes(key) && !lockedKeys.includes(key)),
    columnOrder: normalizeManagedTableColumnOrder(columnSettings.defaultColumnOrder, columnKeys)
  };
  const storedSchemaKeys = Array.isArray(saved.schemaKeys)
    ? saved.schemaKeys.filter((key): key is string => typeof key === 'string')
    : undefined;
  if (storedSchemaKeys && !areManagedTableStringArraysEqual(storedSchemaKeys, columnKeys)) {
    return fallback;
  }
  const hiddenKeys = Array.isArray(saved.hiddenKeys)
    ? saved.hiddenKeys.filter((key): key is string => typeof key === 'string' && columnKeys.includes(key) && !lockedKeys.includes(key))
    : fallback.hiddenKeys;
  const columnOrder = Array.isArray(saved.columnOrder)
    ? normalizeManagedTableColumnOrder(saved.columnOrder.filter((key): key is string => typeof key === 'string'), columnKeys)
    : fallback.columnOrder;
  return { hiddenKeys, columnOrder };
}

type ManagedTableStoredSettings = {
  hiddenKeys?: unknown;
  columnOrder?: unknown;
  schemaKeys?: unknown;
  /** Compatible with finance's pre-ManagedTable column settings shape. */
  hidden?: unknown;
  order?: unknown;
  accounts?: Record<string, {
    hiddenKeys?: unknown;
    columnOrder?: unknown;
    schemaKeys?: unknown;
    hidden?: unknown;
    order?: unknown;
  }>;
};

type ManagedTableViewPreference = {
  view?: unknown;
  accounts?: Record<string, { view?: unknown }>;
};

function isManagedTableViewMode(value: unknown): value is ManagedTableViewMode {
  return value === 'matrix' || value === 'ledger';
}

function readManagedTableViewPreference(storageKey: string, fallback: ManagedTableViewMode) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as unknown;
    if (isManagedTableViewMode(saved)) {
      return saved;
    }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
      return fallback;
    }
    const stored = saved as ManagedTableViewPreference;
    const account = getManagedTableSettingsAccountKey();
    const accountView = account ? stored.accounts?.[account]?.view : undefined;
    if (isManagedTableViewMode(accountView)) {
      return accountView;
    }
    if (account && stored.accounts) {
      return fallback;
    }
    return isManagedTableViewMode(stored.view) ? stored.view : fallback;
  } catch {
    return fallback;
  }
}

function writeManagedTableViewPreference(storageKey: string, view: ManagedTableViewMode) {
  let current: ManagedTableViewPreference = {};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as unknown;
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      current = saved as ManagedTableViewPreference;
    }
  } catch {
    current = {};
  }
  const account = getManagedTableSettingsAccountKey();
  localStorage.setItem(storageKey, JSON.stringify({
    ...current,
    view,
    ...(account ? { accounts: { ...current.accounts, [account]: { view } } } : {})
  }));
}

function getManagedTableSettingsAccountKey() {
  try {
    const session = JSON.parse(localStorage.getItem('siyuan-session') ?? 'null') as { user?: { username?: unknown } } | null;
    const username = typeof session?.user?.username === 'string' ? session.user.username.trim() : '';
    return username || undefined;
  } catch {
    return undefined;
  }
}

function readManagedTableStorageObject(storageKey: string): ManagedTableStoredSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as unknown;
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved as ManagedTableStoredSettings : {};
  } catch {
    return {};
  }
}

function writeManagedTableColumnSettings(storageKey: string, settings: { hiddenKeys: string[]; columnOrder: string[]; schemaKeys: string[] }) {
  const current = readManagedTableStorageObject(storageKey);
  const account = getManagedTableSettingsAccountKey();
  localStorage.setItem(storageKey, JSON.stringify({
    ...current,
    ...settings,
    ...(account ? { accounts: { ...current.accounts, [account]: settings } } : {})
  }));
}

function getManagedTableColumnStorageKey(columns: ManagedColumnLike[], className: string | undefined) {
  const keys = columns.map((column, index) => getTableColumnKey(column) ?? `column-${index}`).join('|');
  return `managed-table-columns:${className ?? 'default'}:${keys}`;
}

function inferManagedTableLockedColumnKeys(columnKeys: string[]) {
  return columnKeys.filter((key) => isManagedTableSelectionColumnKey(key) || isManagedTableActionColumnKey(key));
}

function getManagedTableLockedKeys(columnSettings: ManagedTableColumnSettings | undefined, columnKeys: string[]) {
  return Array.from(new Set([...(columnSettings?.lockedKeys ?? []), ...inferManagedTableLockedColumnKeys(columnKeys)]));
}

function isManagedTableSelectionColumnKey(key: string) {
  return /^(select|selection|checkbox|rowSelection)$/i.test(key);
}

function isManagedTableActionColumnKey(key: string) {
  const semanticKey = key.startsWith(managedTableGeneratedColumnKeyPrefix)
    ? key.slice(managedTableGeneratedColumnKeyPrefix.length)
    : key;
  return isManagedTableTrailingActionColumnKey(key) || /(?:[-_:]actions?|[a-z0-9]Actions?)$/.test(semanticKey) || /^(操作|动作)$/i.test(semanticKey);
}

function isManagedTableTrailingActionColumnKey(key: string) {
  const semanticKey = key.startsWith(managedTableGeneratedColumnKeyPrefix)
    ? key.slice(managedTableGeneratedColumnKeyPrefix.length)
    : key;
  return /^(action|actions|operation|operations|operate|controls|操作|动作)$/i.test(semanticKey);
}

function getManagedTableWidthStorageKey(columns: ManagedColumnLike[], columnSettings: ManagedTableColumnSettings | undefined, className: string | undefined) {
  if (columnSettings) {
    return `${columnSettings.storageKey}:widths`;
  }
  const keys = columns.map((column, index) => getTableColumnKey(column) ?? `column-${index}`).join('|');
  return `managed-table-widths:${className ?? 'default'}:${keys}`;
}

function readManagedTableColumnWidths(storageKey: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null') as unknown;
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
      return {};
    }
    const account = getManagedTableSettingsAccountKey();
    const stored = saved as { accounts?: Record<string, unknown> };
    const selected = account && stored.accounts ? stored.accounts[account] : stored.accounts ? undefined : saved;
    if (!selected || typeof selected !== 'object' || Array.isArray(selected)) return {};
    return Object.fromEntries(
      Object.entries(selected).filter((entry): entry is [string, number] => typeof entry[0] === 'string' && typeof entry[1] === 'number' && Number.isFinite(entry[1]))
    );
  } catch {
    return {};
  }
}

function normalizeManagedTableRemoteColumnWidths(saved: Record<string, unknown>, columnKeys: string[]) {
  const widths = saved.widths;
  if (!widths || typeof widths !== 'object' || Array.isArray(widths)) return {};
  return Object.fromEntries(
    Object.entries(widths).filter((entry): entry is [string, number] => (
      columnKeys.includes(entry[0])
      && typeof entry[1] === 'number'
      && Number.isFinite(entry[1])
    ))
  );
}

function writeManagedTableColumnWidths(storageKey: string, widths: Record<string, number>) {
  const current = readManagedTableStorageObject(storageKey) as { accounts?: Record<string, Record<string, number>> } & Record<string, unknown>;
  const account = getManagedTableSettingsAccountKey();
  localStorage.setItem(storageKey, JSON.stringify({
    ...current,
    ...widths,
    ...(account ? { accounts: { ...current.accounts, [account]: widths } } : {})
  }));
}

function areManagedTableStringArraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((key, index) => key === right[index]);
}

export function cleanNoticeMessage(message: string): string {
  const trimmed = message.split(noticeEventSeparator)[0].trim();
  if (/<html[\s>]/i.test(trimmed) || /Gateway Time-out|Bad Gateway/i.test(trimmed)) {
    return '服务暂不可用，请稍后重试';
  }
  if (!trimmed.startsWith('{')) {
    return trimmed;
  }

  try {
    const payload = JSON.parse(trimmed) as { message?: unknown; error?: unknown; statusCode?: unknown };
    const parsedMessage = Array.isArray(payload.message)
      ? payload.message.join('；')
      : typeof payload.message === 'string'
        ? payload.message
        : undefined;
    const fallback = typeof payload.error === 'string' ? payload.error : undefined;
    return parsedMessage ?? fallback ?? `请求失败，状态码 ${payload.statusCode ?? '未知'}`;
  } catch {
    return trimmed;
  }
}

export function buildNoticeBarPresentation(message: string): NoticeBarPresentation {
  const cleanMessage = cleanNoticeMessage(message);
  const lowerMessage = cleanMessage.toLowerCase();
  const isCompleted = /(^|[，。；：\s])(?:已(?:新建|创建|更新|保存|启用|停用|删除|重置|提交|完成|生成|导出|匹配|撤销|恢复|标记|出货|打印|发起|下载|上传|归档|审核)|成功|处理完成|导入成功|审核通过)|权限已保存/.test(cleanMessage);
  const hasBlockingError = [
    '不允许',
    '不能',
    '无法',
    '已存在',
    '重复',
    '冲突',
    '没有匹配',
    '未授权',
    'unauthorized',
    'forbidden',
    'duplicate',
    'conflict',
    'bad request',
    'request entity too large',
    'token'
  ].some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
  const hasFailure = [
    '失败',
    '错误',
    '不正确',
    'failure',
    'error'
  ].some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
  const isWarning = [
    '请先',
    '未找到',
    '未匹配',
    '缺失',
    '异常',
    '待确认',
    '超时',
    '提醒',
    '必须'
  ].some((keyword) => cleanMessage.includes(keyword));

  if (isCompleted && hasFailure) {
    return { type: 'warning', title: '已完成但需关注', description: cleanMessage };
  }
  if (hasBlockingError || (!isCompleted && hasFailure)) {
    return { type: 'error', title: '操作未完成', description: cleanMessage };
  }
  if (isCompleted) {
    return { type: 'success', title: '操作成功', description: cleanMessage };
  }
  if (isWarning) {
    return { type: 'warning', title: '需要处理', description: cleanMessage };
  }
  return { type: 'success', title: '操作成功', description: cleanMessage };
}

export function renderNoticeBar(message?: string | null): ReactNode {
  if (!message) {
    return null;
  }

  return <NoticeToast message={message} />;
}

function NoticeToast({ message }: { message: string }) {
  const [api, contextHolder] = antdMessage.useMessage();

  useEffect(() => {
    if (!message) {
      return;
    }
    const notice = buildNoticeBarPresentation(message);
    api.open({
      type: notice.type,
      content: notice.description ?? notice.title,
      duration: notice.type === 'success' ? 2 : 3.5
    });
  }, [api, message]);

  return contextHolder;
}

export function renderFilterField(label: string, control: ReactNode) {
  return (
    <label className="module-filter-field">
      <span className="module-filter-label">{label}</span>
      {control}
    </label>
  );
}

export function renderFilterActions(onSearch: () => void, onReset: () => void) {
  return (
    <Flex gap={8} className="module-filter-actions">
      <Button type="primary" icon={<Search size={15} />} onClick={onSearch}>
        查询
      </Button>
      <Button onClick={onReset}>重置</Button>
    </Flex>
  );
}

export function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={['app-page', className].filter(Boolean).join(' ')}>{children}</div>;
}

export function AppPageHeader(props: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <Flex className="app-page-header" justify="space-between" align="flex-start" gap={12}>
      <div className="app-page-header-copy">
        <Title level={2}>{props.title}</Title>
        {props.description ? <Text type="secondary">{props.description}</Text> : null}
      </div>
      {props.actions ? <div className="app-page-header-actions">{props.actions}</div> : null}
    </Flex>
  );
}

export function AppFilterBar({ children }: { children: ReactNode }) {
  return <div className="app-filter-bar">{children}</div>;
}

export function AppActionGroup({ children }: { children: ReactNode }) {
  return (
    <Space className="app-action-group" size={8} wrap>
      {children}
    </Space>
  );
}

export function AppFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card size="small" className="app-form-section" title={title}>
      {children}
    </Card>
  );
}

export function AppEmptyState({ title = '暂无数据', description, action }: { title?: string; description?: ReactNode; action?: ReactNode }) {
  return (
    <Empty
      className="app-empty-state"
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={(
        <Space direction="vertical" size={4}>
          <Text strong>{title}</Text>
          {description ? <Text type="secondary">{description}</Text> : null}
        </Space>
      )}
    >
      {action}
    </Empty>
  );
}

export function MetricCard(props: { icon: ReactNode; title: string; value: string | number; extra?: ReactNode }) {
  return (
    <Card className="metric-card">
      <Flex justify="space-between" align="start">
        <Statistic title={props.title} value={props.value} />
        <div className="metric-icon">{props.icon}</div>
      </Flex>
      <div className="metric-extra">{props.extra}</div>
    </Card>
  );
}

export function CompactMetricCard(props: { icon: ReactNode; title: string; value: string | number; extra: ReactNode }) {
  return (
    <Card className="metric-card">
      <Space align="center" size={14}>
        <div className="metric-icon">{props.icon}</div>
        <div>
          <span className="ant-typography ant-typography-secondary">{props.title}</span>
          <div className="metric-value">{props.value}</div>
          <span className="ant-typography ant-typography-secondary">{props.extra}</span>
        </div>
      </Space>
    </Card>
  );
}

export function StatusTag({ status }: { status: ShipmentStatus }) {
  const colorMap: Partial<Record<ShipmentStatus, string>> = {
    DRAFT: 'warning',
    WAITING_SORT: 'blue',
    WAITING_DISPATCH: 'cyan',
    OUTBOUNDED: 'geekblue',
    WAITING_DEPARTURE: 'purple',
    DEPARTED: 'processing',
    ARRIVED_PORT: 'lime',
    DELIVERING: 'gold',
    WAITING_ONLINE: 'orange',
    WAITING_RETURN: 'volcano',
    PROBLEM: 'red',
    STUCK: 'magenta',
    SIGNED: 'green',
    REVIEW_REJECTED: 'red'
  };

  return <Tag color={colorMap[status] ?? 'default'}>{shipmentStatusLabels[status]}</Tag>;
}

export function RoutingStatusTag({ status }: { status: ShipmentStatus }) {
  if (status === 'WAITING_DISPATCH') {
    return <Tag color="cyan">待出库</Tag>;
  }

  return <StatusTag status={status} />;
}

export function riskWeight(risk: string) {
  return risk === 'high' ? 3 : risk === 'medium' ? 2 : 1;
}

export function riskLabel(risk: string) {
  return risk === 'high' ? '高风险' : risk === 'medium' ? '需关注' : '正常';
}
