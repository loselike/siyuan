import { useCallback, useEffect, useMemo, useRef, useState, type Key, type MouseEvent as ReactMouseEvent, type ReactNode, type ThHTMLAttributes } from 'react';
import dayjs, { type Dayjs } from 'dayjs';
import { Button, Card, Checkbox, DatePicker, Empty, Flex, Input, message as antdMessage, Modal, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import type { ButtonProps } from 'antd';
import type { DatePickerProps, RangePickerProps } from 'antd/es/date-picker';
import zhCNDatePickerLocale from 'antd/es/date-picker/locale/zh_CN';
import type { ModalFuncProps } from 'antd/es/modal';
import type { ColumnGroupType, ColumnsType, ColumnType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { CalendarDays, Search, Settings } from 'lucide-react';
import { shipmentStatusLabels, type ShipmentStatus } from '@siyuan/shared';

const { Text, Title } = Typography;
const { RangePicker } = DatePicker;
export const APP_DATE_FORMAT = 'YYYY-MM-DD';

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

export const tenRowTablePagination: TablePaginationConfig = {
  pageSize: 10,
  showSizeChanger: false,
  showTotal: (total) => `共 ${total} 条`
};

export function getManagedTableScrollX(columns: ColumnsType<unknown>, minimum = 960) {
  const width = columns.reduce((sum, column) => {
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
  return isAppDateValue(value) ? dayjs(value) : null;
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
      {options.requireReason ? (
        <Input.TextArea
          aria-label={options.reasonLabel ?? '操作原因'}
          className="confirm-action-reason"
          rows={3}
          maxLength={300}
          showCount
          placeholder="请填写操作原因，至少 2 个字符"
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

type ManagedTableColumnSettings = {
  storageKey: string;
  title?: string;
  labels?: Record<string, string>;
  defaultHiddenKeys?: string[];
  defaultColumnOrder?: string[];
  buttonLabel?: string;
  lockedKeys?: string[];
};

/**
 * A business-table column has one identity for display, column settings and sorting.
 * `sortValue` is used for calculated/display-only columns that have no direct dataIndex.
 */
export type ManagedTableColumn<RecordType> = (ColumnType<RecordType> | ColumnGroupType<RecordType>) & {
  sortValue?: (record: RecordType) => unknown;
  sortable?: boolean;
  settingsLabel?: string;
};

export type ManagedTableColumns<RecordType> = ManagedTableColumn<RecordType>[];

type ManagedTableProps<RecordType extends object> = Omit<TableProps<RecordType>, 'columns'> & {
  columns: ManagedTableColumns<RecordType>;
  minimumScrollX?: number;
  columnSettings?: ManagedTableColumnSettings | false;
  columnSettingsPlacement?: 'column' | 'toolbar';
  resizableColumns?: boolean;
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
  resizableColumns = true,
  pagination,
  rowSelection,
  scroll,
  className,
  sticky,
  onChange,
  ...props
}: ManagedTableProps<RecordType>) {
  const columnKeys = useMemo(
    () =>
      Array.from(
        new Set(collectManagedTableColumnKeys(columns as ManagedColumnLike[]))
      ),
    [columns]
  );
  const effectiveColumnSettings = useMemo<ManagedTableColumnSettings | undefined>(() => {
    if (columnSettings === false || !columnKeys.length) {
      return undefined;
    }
    if (columnSettings) {
      return columnSettings;
    }
    return {
      storageKey: getManagedTableColumnStorageKey(columns as ManagedColumnLike[], className),
      title: '列设置',
      lockedKeys: inferManagedTableLockedColumnKeys(columnKeys)
    };
  }, [className, columnKeys, columnSettings, columns]);
  const widthStorageKey = useMemo(() => getManagedTableWidthStorageKey(columns as ManagedColumnLike[], effectiveColumnSettings, className), [className, effectiveColumnSettings, columns]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => readManagedTableColumnSettings(effectiveColumnSettings, columnKeys).hiddenKeys);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => readManagedTableColumnSettings(effectiveColumnSettings, columnKeys).columnOrder);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => readManagedTableColumnWidths(widthStorageKey));
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (effectiveColumnSettings) {
      const normalizedOrder = normalizeManagedTableColumnOrder(columnOrder, columnKeys);
      const lockedKeys = getManagedTableLockedKeys(effectiveColumnSettings, columnKeys);
      writeManagedTableColumnSettings(effectiveColumnSettings.storageKey, {
        hiddenKeys: hiddenKeys.filter((key) => columnKeys.includes(key) && !lockedKeys.includes(key)),
        columnOrder: normalizedOrder
      });
    }
  }, [columnKeys, columnOrder, effectiveColumnSettings, hiddenKeys]);

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
    if (widthStorageKey) {
      writeManagedTableColumnWidths(
        widthStorageKey,
        Object.fromEntries(Object.entries(columnWidths).filter(([key]) => columnKeys.includes(key)))
      );
    }
  }, [columnKeys, columnWidths, widthStorageKey]);

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
    const sourceColumns = effectiveColumnSettings ? orderManagedTableColumns(columns, columnOrder) : columns;
    const nextColumns = filterManagedTableVisibleColumns(sourceColumns, hiddenKeys);
    return nextColumns.length ? nextColumns : columns.slice(0, 1);
  }, [columnOrder, effectiveColumnSettings, columns, hiddenKeys]);
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
  const managedColumnsWithSettings = useMemo(() => {
    if (!tableSettingsButton || columnSettingsPlacement !== 'column') {
      return managedColumns;
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
    return [...managedColumns, settingsColumn];
  }, [columnSettingsPlacement, managedColumns, tableSettingsButton]);
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
  const tableScrollX = scroll?.x ?? (minimumScrollX > 0 ? getManagedTableScrollX(managedColumnsWithSettings as ColumnsType<unknown>, minimumScrollX) : undefined);
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
            preserveSelectedRowKeys: false
          }
        : undefined,
    [rowSelection]
  );
  const selectionSummary = rowSelection ? (
    <span className="managed-table-selection-summary" aria-live="polite">
      已选 {selectedRowKeys.length} 条
    </span>
  ) : null;
  const toolbarSettingsButton = columnSettingsPlacement === 'toolbar' ? tableSettingsButton : null;
  const handleTableChange = useCallback<NonNullable<TableProps<RecordType>['onChange']>>((nextPagination, filters, sorter, extra) => {
    const nextCurrent = nextPagination.current ?? 1;
    const nextPageSize = nextPagination.pageSize ?? tenRowTablePagination.pageSize ?? 10;
    const paginationChanged = nextCurrent !== activePagination.current || nextPageSize !== activePagination.pageSize;
    if (rowSelection?.onChange && selectedRowKeys.length && (nextCurrent !== activePagination.current || nextPageSize !== activePagination.pageSize || extra.action !== 'paginate')) {
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

  return (
    <div className="managed-table-shell">
      {selectionSummary || toolbarSettingsButton ? (
        <div className="managed-table-toolbar">
          <div>{selectionSummary}</div>
          <div>{toolbarSettingsButton}</div>
        </div>
      ) : null}
      <Table<RecordType>
        {...props}
        className={['managed-table', resizableColumns ? 'managed-table-resizable' : null, className].filter(Boolean).join(' ')}
        columns={managedColumnsWithSettings}
        components={managedComponents}
        pagination={effectivePagination}
        rowSelection={managedRowSelection}
        scroll={managedScroll}
        sticky={sticky ?? true}
        onChange={handleTableChange}
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
                    {effectiveColumnSettings.labels?.[key] ?? getTableColumnLabel(columns as ManagedColumnLike[], key)}
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

function applyManagedColumnWidths<RecordType extends object>(
  columns: ColumnsType<RecordType>,
  widths: Record<string, number>,
  onResizeColumnStart?: (key: string, width: number, event: ReactMouseEvent<HTMLElement>) => void
): ColumnsType<RecordType> {
  return columns.map((column, index) => {
    const key = getTableColumnKey(column as ManagedColumnLike) ?? `column-${index}`;
    const existingWidth = getColumnNumericWidth(column as ManagedColumnLike);
    const width = widths[key] ?? existingWidth;
    const nextColumn = {
      ...column,
      width,
      onHeaderCell: (headerColumn: unknown) => {
        const originalHeaderCell = typeof column.onHeaderCell === 'function' ? column.onHeaderCell(headerColumn as never) : {};
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
  settingsLabel?: string;
};

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
  const actionKeys = columnKeys.filter(isManagedTableActionColumnKey);
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

type ManagedTableStoredSettings = {
  hiddenKeys?: unknown;
  columnOrder?: unknown;
  /** Compatible with finance's pre-ManagedTable column settings shape. */
  hidden?: unknown;
  order?: unknown;
  accounts?: Record<string, {
    hiddenKeys?: unknown;
    columnOrder?: unknown;
    hidden?: unknown;
    order?: unknown;
  }>;
};

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

function writeManagedTableColumnSettings(storageKey: string, settings: { hiddenKeys: string[]; columnOrder: string[] }) {
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
  return /^(action|actions|operation|operations|operate|controls)$/i.test(key);
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

export function AppPage({ children }: { children: ReactNode }) {
  return <div className="app-page">{children}</div>;
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
