import { useEffect, useMemo, useState, type Key, type ReactNode } from 'react';
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
  buttonLabel?: string;
};

type ManagedTableProps<RecordType extends object> = Omit<TableProps<RecordType>, 'columns'> & {
  columns: ColumnsType<RecordType>;
  minimumScrollX?: number;
  columnSettings?: ManagedTableColumnSettings;
};

export function ManagedTable<RecordType extends object>({
  columns,
  minimumScrollX = 960,
  columnSettings,
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>(() => {
    if (!columnSettings) {
      return [];
    }
    try {
      const saved = JSON.parse(localStorage.getItem(columnSettings.storageKey) ?? 'null');
      return Array.isArray(saved) ? saved.filter((key): key is string => typeof key === 'string') : columnSettings.defaultHiddenKeys ?? [];
    } catch {
      return columnSettings.defaultHiddenKeys ?? [];
    }
  });

  useEffect(() => {
    if (columnSettings) {
      localStorage.setItem(columnSettings.storageKey, JSON.stringify(hiddenKeys.filter((key) => columnKeys.includes(key))));
    }
  }, [columnKeys, columnSettings, hiddenKeys]);

  const visibleColumns = useMemo(() => {
    const nextColumns = columns.filter((column) => {
      const key = getTableColumnKey(column as ManagedColumnLike);
      return !key || !hiddenKeys.includes(key);
    });
    return nextColumns.length ? nextColumns : columns.slice(0, 1);
  }, [columns, hiddenKeys]);
  const normalizedPagination = pagination === false ? false : { ...tenRowTablePagination, ...pagination };
  const tableScrollX = scroll?.x ?? getManagedTableScrollX(visibleColumns as ColumnsType<unknown>, minimumScrollX);

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
        className={['managed-table', className].filter(Boolean).join(' ')}
        columns={visibleColumns}
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
            <Button key="default" onClick={() => setHiddenKeys(columnSettings.defaultHiddenKeys ?? [])}>
              恢复默认
            </Button>,
            <Button key="close" type="primary" onClick={() => setSettingsOpen(false)}>
              完成
            </Button>
          ]}
        >
          <Checkbox.Group
            className="managed-column-settings-grid"
            value={columnKeys.filter((key) => !hiddenKeys.includes(key))}
            options={columnKeys.map((key) => ({ label: columnSettings.labels?.[key] ?? getTableColumnLabel(columns as ManagedColumnLike[], key), value: key }))}
            onChange={(checkedValues) => {
              const checkedKeys = checkedValues.map(String);
              setHiddenKeys(columnKeys.filter((key) => !checkedKeys.includes(key)));
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
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

export function MetricCard(props: { icon: ReactNode; title: string; value: string | number; extra: ReactNode }) {
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
