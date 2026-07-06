import { useCallback, useEffect, useMemo, useRef, useState, type Key, type MouseEvent as ReactMouseEvent, type ReactNode, type ThHTMLAttributes } from 'react';
import { Button, Card, Checkbox, Empty, Flex, message as antdMessage, Modal, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig, TableProps } from 'antd/es/table';
import { Search, Settings } from 'lucide-react';
import { shipmentStatusLabels, type ShipmentStatus } from '@siyuan/shared';

const { Text, Title } = Typography;

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

type ManagedTableColumnSettings = {
  storageKey: string;
  title?: string;
  labels?: Record<string, string>;
  defaultHiddenKeys?: string[];
  defaultColumnOrder?: string[];
  buttonLabel?: string;
};

type ManagedTableProps<RecordType extends object> = Omit<TableProps<RecordType>, 'columns'> & {
  columns: ColumnsType<RecordType>;
  minimumScrollX?: number;
  columnSettings?: ManagedTableColumnSettings;
  resizableColumns?: boolean;
};

export function ManagedTable<RecordType extends object>({
  columns,
  minimumScrollX = 960,
  columnSettings,
  resizableColumns = true,
  pagination,
  scroll,
  className,
  sticky,
  ...props
}: ManagedTableProps<RecordType>) {
  const columnKeys = useMemo(
    () =>
      Array.from(
        new Set(columns.map((column) => getTableColumnKey(column as ManagedColumnLike)).filter((key): key is string => Boolean(key)))
      ),
    [columns]
  );
  const widthStorageKey = useMemo(() => getManagedTableWidthStorageKey(columns as ManagedColumnLike[], columnSettings, className), [className, columnSettings, columns]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => readManagedTableColumnSettings(columnSettings, columnKeys).hiddenKeys);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => readManagedTableColumnSettings(columnSettings, columnKeys).columnOrder);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => readManagedTableColumnWidths(widthStorageKey));
  const resizeCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (columnSettings) {
      const normalizedOrder = normalizeManagedTableColumnOrder(columnOrder, columnKeys);
      localStorage.setItem(columnSettings.storageKey, JSON.stringify({
        hiddenKeys: hiddenKeys.filter((key) => columnKeys.includes(key)),
        columnOrder: normalizedOrder
      }));
    }
  }, [columnKeys, columnOrder, columnSettings, hiddenKeys]);

  useEffect(() => {
    setHiddenKeys((current) => current.filter((key) => columnKeys.includes(key)));
    setColumnOrder((current) => normalizeManagedTableColumnOrder(current.length ? current : columnSettings?.defaultColumnOrder, columnKeys));
  }, [columnKeys, columnSettings?.defaultColumnOrder]);

  useEffect(() => {
    if (widthStorageKey) {
      localStorage.setItem(widthStorageKey, JSON.stringify(Object.fromEntries(Object.entries(columnWidths).filter(([key]) => columnKeys.includes(key)))));
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
    const sourceColumns = columnSettings ? orderManagedTableColumns(columns, columnOrder) : columns;
    const nextColumns = sourceColumns.filter((column) => {
      const key = getTableColumnKey(column as ManagedColumnLike);
      return !key || !hiddenKeys.includes(key);
    });
    return nextColumns.length ? nextColumns : columns.slice(0, 1);
  }, [columnOrder, columnSettings, columns, hiddenKeys]);
  const managedColumns = useMemo(
    () => applyManagedColumnWidths(visibleColumns, columnWidths, resizableColumns ? startColumnResize : undefined),
    [columnWidths, resizableColumns, startColumnResize, visibleColumns]
  );
  const normalizedPagination = pagination === false ? false : { ...tenRowTablePagination, ...pagination };
  const tableScrollX = scroll?.x ?? getManagedTableScrollX(managedColumns as ColumnsType<unknown>, minimumScrollX);

  return (
    <div className="managed-table-shell">
      {columnSettings ? (
        <Flex className="managed-table-toolbar" justify="flex-end">
          <Button icon={<Settings size={15} />} onClick={() => setSettingsOpen(true)}>
            {columnSettings.buttonLabel ?? '列设置'}
          </Button>
        </Flex>
      ) : null}
      <Table<RecordType>
        {...props}
        className={['managed-table', resizableColumns ? 'managed-table-resizable' : null, className].filter(Boolean).join(' ')}
        columns={managedColumns}
        components={resizableColumns ? { ...props.components, header: { ...props.components?.header, cell: ResizableHeaderCell } } : props.components}
        pagination={normalizedPagination}
        scroll={{ ...scroll, x: tableScrollX }}
        sticky={sticky ?? true}
      />
      {columnSettings ? (
        <Modal
          title={columnSettings.title ?? '列设置'}
          open={settingsOpen}
          width={560}
          onCancel={() => setSettingsOpen(false)}
          footer={[
            <Button key="all" onClick={() => setHiddenKeys([])}>
              全选
            </Button>,
            <Button key="default" onClick={() => {
              setHiddenKeys(columnSettings.defaultHiddenKeys ?? []);
              setColumnOrder(normalizeManagedTableColumnOrder(columnSettings.defaultColumnOrder, columnKeys));
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
              return (
                <div className="managed-column-settings-row" key={key}>
                  <Checkbox
                    checked={visible}
                    onChange={(event) => {
                      const checked = event.target.checked;
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
                    {columnSettings.labels?.[key] ?? getTableColumnLabel(columns as ManagedColumnLike[], key)}
                  </Checkbox>
                  <Space size={6}>
                    <Button size="small" disabled={index === 0} onClick={() => setColumnOrder((current) => moveManagedTableColumn(current, columnKeys, key, -1))}>
                      上移
                    </Button>
                    <Button size="small" disabled={index === keys.length - 1} onClick={() => setColumnOrder((current) => moveManagedTableColumn(current, columnKeys, key, 1))}>
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
  const column = columns.find((item) => getTableColumnKey(item) === key);
  return typeof column?.title === 'string' ? column.title : key;
}

function normalizeManagedTableColumnOrder(order: string[] | undefined, columnKeys: string[]) {
  const normalized = (order ?? []).filter((key, index, array) => columnKeys.includes(key) && array.indexOf(key) === index);
  return [...normalized, ...columnKeys.filter((key) => !normalized.includes(key))];
}

function orderManagedTableColumns<RecordType extends object>(columns: ColumnsType<RecordType>, columnOrder: string[]) {
  const keyedColumns = new Map<string, ColumnsType<RecordType>[number]>();
  const keylessColumns: ColumnsType<RecordType> = [];
  columns.forEach((column) => {
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
  return [...orderedColumns, ...keylessColumns] as ColumnsType<RecordType>;
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
      const stored = saved as { hiddenKeys?: unknown; columnOrder?: unknown };
      const hiddenKeys = Array.isArray(stored.hiddenKeys)
        ? stored.hiddenKeys.filter((key): key is string => typeof key === 'string' && columnKeys.includes(key))
        : fallback.hiddenKeys;
      const columnOrder = Array.isArray(stored.columnOrder)
        ? normalizeManagedTableColumnOrder(stored.columnOrder.filter((key): key is string => typeof key === 'string'), columnKeys)
        : fallback.columnOrder;
      return { hiddenKeys, columnOrder };
    }
    return fallback;
  } catch {
    return fallback;
  }
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
    return Object.fromEntries(
      Object.entries(saved).filter((entry): entry is [string, number] => typeof entry[0] === 'string' && typeof entry[1] === 'number' && Number.isFinite(entry[1]))
    );
  } catch {
    return {};
  }
}

export function cleanNoticeMessage(message: string): string {
  const trimmed = message.split(noticeEventSeparator)[0].trim();
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
  const isError = [
    '失败',
    '错误',
    '不正确',
    '不允许',
    '不能',
    '无法',
    '必须',
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
  const isWarning = !isError && [
    '请先',
    '未找到',
    '未匹配',
    '缺失',
    '异常',
    '待确认',
    '超时',
    '提醒'
  ].some((keyword) => cleanMessage.includes(keyword));

  if (isError) {
    return { type: 'error', title: '操作未完成', description: cleanMessage };
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
