import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Badge,
  Button,
  Checkbox,
  DatePicker,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Typography,
  message
} from 'antd';
import type { Dayjs } from 'dayjs';
import {
  Archive,
  Bell,
  Check,
  CheckCheck,
  CircleAlert,
  FileCheck2,
  Megaphone,
  PackageCheck,
  RefreshCw,
  Send,
  Settings2,
  Undo2
} from 'lucide-react';
import type {
  AnnouncementAudienceOptions,
  AnnouncementAudienceType,
  AnnouncementCreateInput,
  AnnouncementSummary,
  NotificationActionTaskListResponse,
  NotificationActionTaskSummary,
  NotificationCategory,
  NotificationListResponse,
  NotificationOperationsResponse,
  NotificationPreferenceSummary,
  NotificationSeverity,
  NotificationSummary
} from './notificationTypes';
import type { ApiClient, PermissionKey } from '../../apiClient';
import { formatBeijingDateTime } from '../shared/format';
import './notifications.css';

const { Text, Title, Paragraph } = Typography;

const categoryOptions: Array<{ label: string; value: 'ALL' | NotificationCategory }> = [
  { label: '全部', value: 'ALL' },
  { label: '公告', value: 'ANNOUNCEMENT' },
  { label: '订单', value: 'ORDER' },
  { label: '财务', value: 'FINANCE' },
  { label: '仓库', value: 'WAREHOUSE' },
  { label: '客服', value: 'CUSTOMER_SERVICE' },
  { label: '系统', value: 'SYSTEM' }
];

const audienceTypeOptions: Array<{ value: AnnouncementAudienceType; label: string }> = [
  { value: 'ALL', label: '全部启用用户' },
  { value: 'STAFF', label: '全部员工' },
  { value: 'CUSTOMER', label: '全部客户账号' },
  { value: 'ROLE', label: '指定用户组' },
  { value: 'DEPARTMENT', label: '指定部门' },
  { value: 'SITE', label: '指定站点' },
  { value: 'USERS', label: '指定用户' }
];

const severityOptions: Array<{ value: NotificationSeverity; label: string }> = [
  { value: 'INFO', label: '普通' },
  { value: 'SUCCESS', label: '成功' },
  { value: 'WARNING', label: '重要' },
  { value: 'CRITICAL', label: '紧急' }
];

const severityPresentation: Record<NotificationSeverity, { color: string; label: string; icon: ReactNode }> = {
  INFO: { color: 'blue', label: '普通', icon: <Bell size={16} /> },
  SUCCESS: { color: 'green', label: '成功', icon: <FileCheck2 size={16} /> },
  WARNING: { color: 'orange', label: '重要', icon: <CircleAlert size={16} /> },
  CRITICAL: { color: 'red', label: '紧急', icon: <CircleAlert size={16} /> }
};

const categoryLabels: Record<NotificationCategory, string> = {
  ANNOUNCEMENT: '公告',
  ORDER: '订单',
  FINANCE: '财务',
  WAREHOUSE: '仓库',
  CUSTOMER_SERVICE: '客服',
  SYSTEM: '系统'
};

type AnnouncementFormValues = Omit<AnnouncementCreateInput, 'expiresAt' | 'requestId'> & { expiresAt?: Dayjs };

function createAnnouncementRequestId() {
  return globalThis.crypto?.randomUUID?.() ?? `announcement-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface NotificationCenterProps {
  apiClient: ApiClient;
  permissions?: PermissionKey[];
  onNavigate?: (targetPath: string, item: NotificationSummary | NotificationActionTaskSummary) => void;
  compact?: boolean;
}

export function NotificationCenter({ apiClient, permissions = [], onNavigate, compact = false }: NotificationCenterProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('inbox');
  const [status, setStatus] = useState<'ALL' | 'UNREAD' | 'ARCHIVED'>('ALL');
  const [category, setCategory] = useState<'ALL' | NotificationCategory>('ALL');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState<NotificationListResponse>({ items: [], total: 0, unreadCount: 0, page: 1, pageSize: 20, hasMore: false });
  const [actionTasks, setActionTasks] = useState<NotificationActionTaskListResponse>({ items: [], total: 0 });
  const [summaryCount, setSummaryCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actionTasksLoading, setActionTasksLoading] = useState(false);
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementSummary[]>([]);
  const [audienceOptions, setAudienceOptions] = useState<AnnouncementAudienceOptions>({ roles: [], departments: [], sites: [], users: [] });
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishRequestId, setPublishRequestId] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [preferencesLoading, setPreferencesLoading] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferenceSummary[]>([]);
  const [operationsLoading, setOperationsLoading] = useState(false);
  const [operations, setOperations] = useState<NotificationOperationsResponse>({ items: [], total: 0, counts: { PENDING: 0, PROCESSING: 0, PROCESSED: 0, SKIPPED: 0, NO_RECIPIENT: 0, FAILED: 0, DEAD_LETTER: 0 } });
  const [form] = Form.useForm<AnnouncementFormValues>();
  const selectedAudienceType = Form.useWatch('audienceType', form);
  const canManageAnnouncements = permissions.includes('system:announcements:read');
  const canPublishAnnouncements = permissions.includes('system:announcements:publish');
  const canWithdrawAnnouncements = permissions.includes('system:announcements:withdraw');
  const canViewOperations = permissions.includes('system:notifications:operations-read');
  const canRetryOperations = permissions.includes('system:notifications:retry');

  const refreshSummary = useCallback(async () => {
    const [summaryResult, actionTasksResult] = await Promise.allSettled([
      apiClient.notificationSummary(),
      apiClient.notificationActionTasks()
    ]);
    if (summaryResult.status === 'fulfilled') {
      const summary = summaryResult.value;
      setSummaryCount(summary.unreadCount);
    } else {
      setSummaryCount(0);
    }
    if (actionTasksResult.status === 'fulfilled') setActionTasks(actionTasksResult.value);
  }, [apiClient]);

  const refreshInbox = useCallback(async () => {
    setLoading(true);
    try {
      const next = await apiClient.notifications({ status, category, keyword, page: 1, pageSize: 20 });
      setResponse(next);
      setSummaryCount(next.unreadCount);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '消息加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [apiClient, category, keyword, status]);

  const refreshActionTasks = useCallback(async () => {
    setActionTasksLoading(true);
    try {
      setActionTasks(await apiClient.notificationActionTasks());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '待办加载失败，请稍后重试');
    } finally {
      setActionTasksLoading(false);
    }
  }, [apiClient]);

  const loadMore = useCallback(async () => {
    if (loading || !response.hasMore) return;
    setLoading(true);
    try {
      const next = await apiClient.notifications({ status, category, keyword, page: response.page + 1, pageSize: response.pageSize });
      setResponse((current) => ({ ...next, items: [...current.items, ...next.items] }));
    } catch (error) {
      message.error(error instanceof Error ? error.message : '更多消息加载失败');
    } finally {
      setLoading(false);
    }
  }, [apiClient, category, keyword, loading, response.hasMore, response.page, response.pageSize, status]);

  const refreshAnnouncements = useCallback(async () => {
    if (!canManageAnnouncements) return;
    setAnnouncementLoading(true);
    try {
      const [rows, options] = await Promise.all([
        apiClient.announcements(),
        apiClient.announcementAudienceOptions()
      ]);
      setAnnouncements(rows);
      setAudienceOptions(options);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '公告管理数据加载失败');
    } finally {
      setAnnouncementLoading(false);
    }
  }, [apiClient, canManageAnnouncements]);

  const refreshOperations = useCallback(async () => {
    if (!canViewOperations) return;
    setOperationsLoading(true);
    try {
      setOperations(await apiClient.notificationOperations());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '通知运行状态加载失败');
    } finally {
      setOperationsLoading(false);
    }
  }, [apiClient, canViewOperations]);

  useEffect(() => {
    void refreshSummary();
    const timer = window.setInterval(() => void refreshSummary(), 60_000);
    const handleFocus = () => void refreshSummary();
    window.addEventListener('focus', handleFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshSummary]);

  useEffect(() => {
    if (drawerOpen && activeTab === 'inbox') void refreshInbox();
  }, [activeTab, drawerOpen, refreshInbox]);

  useEffect(() => {
    if (drawerOpen && activeTab === 'tasks') void refreshActionTasks();
  }, [activeTab, drawerOpen, refreshActionTasks]);

  useEffect(() => {
    if (drawerOpen && activeTab === 'announcements') void refreshAnnouncements();
  }, [activeTab, drawerOpen, refreshAnnouncements]);

  useEffect(() => {
    if (drawerOpen && activeTab === 'operations') void refreshOperations();
  }, [activeTab, drawerOpen, refreshOperations]);

  const audienceValueOptions = useMemo(() => {
    if (selectedAudienceType === 'ROLE') return audienceOptions.roles;
    if (selectedAudienceType === 'DEPARTMENT') return audienceOptions.departments;
    if (selectedAudienceType === 'SITE') return audienceOptions.sites;
    if (selectedAudienceType === 'USERS') return audienceOptions.users;
    return [];
  }, [audienceOptions, selectedAudienceType]);

  async function markRead(item: NotificationSummary) {
    if (!item.readAt) await apiClient.markNotificationRead(item.id);
    await refreshInbox();
  }

  async function openNotification(item: NotificationSummary) {
    try {
      await markRead(item);
      if (item.targetPath && onNavigate) {
        onNavigate(item.targetPath, item);
        setDrawerOpen(false);
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : '消息处理失败');
    }
  }

  function openActionTask(item: NotificationActionTaskSummary) {
    if (!item.targetPath || !onNavigate) return;
    onNavigate(item.targetPath, item);
    setDrawerOpen(false);
  }

  async function openNotificationCenter() {
    try {
      const tasks = await apiClient.notificationActionTasks();
      setActionTasks(tasks);
      setActiveTab(tasks.total ? 'tasks' : 'inbox');
    } catch {
      setActiveTab('inbox');
    }
    setDrawerOpen(true);
  }

  async function markAllRead() {
    try {
      await apiClient.markAllNotificationsRead();
      await refreshInbox();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '全部已读失败');
    }
  }

  async function archive(item: NotificationSummary) {
    try {
      await apiClient.archiveNotification(item.id);
      await refreshInbox();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '归档消息失败');
    }
  }

  async function restore(item: NotificationSummary) {
    try {
      await apiClient.restoreNotification(item.id);
      await refreshInbox();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '恢复消息失败');
    }
  }

  async function acknowledge(item: NotificationSummary) {
    try {
      await apiClient.acknowledgeNotification(item.id);
      await refreshInbox();
      message.success('已确认知晓');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认失败');
    }
  }

  async function openPreferences() {
    setPreferencesOpen(true);
    setPreferencesLoading(true);
    try {
      setPreferences(await apiClient.notificationPreferences());
    } catch (error) {
      message.error(error instanceof Error ? error.message : '通知偏好加载失败');
    } finally {
      setPreferencesLoading(false);
    }
  }

  async function updatePreference(category: NotificationCategory, enabled: boolean) {
    const previous = preferences;
    const next = preferences.map((item) => item.category === category ? { ...item, enabled } : item);
    setPreferences(next);
    try {
      setPreferences(await apiClient.updateNotificationPreferences(next.map((item) => ({ category: item.category, enabled: item.enabled }))));
    } catch (error) {
      setPreferences(previous);
      message.error(error instanceof Error ? error.message : '通知偏好保存失败');
    }
  }

  async function retryOperation(id: string) {
    try {
      await apiClient.retryNotificationOperation(id);
      message.success('已加入重试队列');
      await refreshOperations();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '通知重试失败');
    }
  }

  async function publish(values: AnnouncementFormValues) {
    setPublishing(true);
    try {
      await apiClient.publishAnnouncement({
        ...values,
        requestId: publishRequestId,
        audienceValues: values.audienceValues ?? [],
        expiresAt: values.expiresAt?.toISOString()
      });
      message.success('公告已发布');
      setPublishOpen(false);
      setPublishRequestId('');
      form.resetFields();
      await Promise.all([refreshAnnouncements(), refreshSummary()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '公告发布失败');
    } finally {
      setPublishing(false);
    }
  }

  async function withdraw(row: AnnouncementSummary) {
    try {
      await apiClient.withdrawAnnouncement(row.id);
      message.success('公告已撤回');
      await Promise.all([refreshAnnouncements(), refreshInbox()]);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '公告撤回失败');
    }
  }

  const inbox = (
    <div className="notification-inbox">
      <div className="notification-toolbar">
        <Space wrap size={8} className="notification-toolbar-filters">
          <Segmented
            size="small"
            value={status}
            options={[{ label: `全部 ${status === 'ALL' ? response.total : ''}`, value: 'ALL' }, { label: `未读 ${response.unreadCount}`, value: 'UNREAD' }, { label: '已归档', value: 'ARCHIVED' }]}
            onChange={(value) => setStatus(value as 'ALL' | 'UNREAD' | 'ARCHIVED')}
          />
          <Select
            size="small"
            className="notification-category-select"
            value={category}
            options={categoryOptions}
            onChange={(value) => setCategory(value)}
          />
          <Input.Search
            size="small"
            className="notification-search"
            value={keywordInput}
            placeholder="搜索标题或正文"
            allowClear
            onChange={(event) => setKeywordInput(event.target.value)}
            onSearch={(value) => setKeyword(value.trim())}
          />
        </Space>
        <Space size={4}>
          <Button size="small" icon={<Settings2 size={15} />} onClick={() => void openPreferences()}>偏好</Button>
          {status !== 'ARCHIVED' ? <Button size="small" icon={<CheckCheck size={15} />} disabled={!response.unreadCount} onClick={() => void markAllRead()}>
            全部已读
          </Button> : null}
        </Space>
      </div>

      <Spin spinning={loading}>
        <List
          className="notification-list"
          dataSource={response.items}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={status === 'UNREAD' ? '没有未读消息' : '暂无消息'} /> }}
          renderItem={(item) => {
            const severity = severityPresentation[item.severity];
            return (
              <List.Item className={`notification-row${item.readAt ? '' : ' is-unread'}`}>
                <div className={`notification-severity notification-severity-${item.severity.toLowerCase()}`} aria-hidden="true">
                  {item.category === 'ANNOUNCEMENT' ? <Megaphone size={16} /> : item.category === 'ORDER' ? <PackageCheck size={16} /> : severity.icon}
                </div>
                <div className="notification-row-main">
                  <div className="notification-row-heading">
                    <Space size={6} wrap>
                      {!item.readAt ? <span className="notification-unread-dot" aria-label="未读" /> : null}
                      <Text strong>{item.title}</Text>
                      <Tag color={severity.color}>{categoryLabels[item.category]}</Tag>
                    </Space>
                    <Text type="secondary" className="notification-time">{formatBeijingDateTime(item.deliveredAt)}</Text>
                  </div>
                  <Paragraph className="notification-body">{item.body}</Paragraph>
                  <Space size={6} wrap>
                    {item.targetPath ? <Button size="small" type="link" onClick={() => void openNotification(item)}>查看业务</Button> : null}
                    {status !== 'ARCHIVED' && !item.readAt ? <Button size="small" type="link" icon={<Check size={14} />} onClick={() => void markRead(item)}>标为已读</Button> : null}
                    {item.requiresAcknowledgement && !item.acknowledgedAt ? <Button size="small" type="primary" onClick={() => void acknowledge(item)}>我已知晓</Button> : null}
                    {status === 'ARCHIVED' ? (
                      <Button size="small" type="text" icon={<Undo2 size={14} />} onClick={() => void restore(item)}>恢复</Button>
                    ) : !item.requiresAcknowledgement || item.acknowledgedAt ? (
                      <Button size="small" type="text" icon={<Archive size={14} />} onClick={() => void archive(item)}>归档</Button>
                    ) : null}
                  </Space>
                </div>
              </List.Item>
            );
          }}
        />
        {response.hasMore ? <div className="notification-load-more"><Button size="small" loading={loading} onClick={() => void loadMore()}>加载更多</Button></div> : null}
      </Spin>
    </div>
  );

  const actionTaskList = (
    <Spin spinning={actionTasksLoading}>
      <List
        className="notification-list notification-task-list"
        dataSource={actionTasks.items}
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无待处理事项" /> }}
        renderItem={(item) => (
          <List.Item className="notification-row notification-task-row">
            <div className="notification-severity notification-severity-warning" aria-hidden="true"><CircleAlert size={16} /></div>
            <div className="notification-row-main">
              <div className="notification-row-heading">
                <Space size={6} wrap>
                  <Text strong>{item.title}</Text>
                  <Tag color="orange">待处理</Tag>
                </Space>
                <Text type="secondary" className="notification-time">{formatBeijingDateTime(item.openedAt)}</Text>
              </div>
              <Paragraph className="notification-body">{item.body}</Paragraph>
              {item.targetPath ? <Button size="small" type="primary" onClick={() => openActionTask(item)}>去处理</Button> : null}
            </div>
          </List.Item>
        )}
      />
    </Spin>
  );

  const announcementManagement = (
    <div className="announcement-management">
      <div className="notification-toolbar">
        <div>
          <Text strong>公告发布记录</Text>
          <Text type="secondary" className="notification-toolbar-note">受众在发布时固化，撤回不会删除历史审计。</Text>
        </div>
        {canPublishAnnouncements ? <Button type="primary" icon={<Send size={15} />} onClick={() => {
          form.setFieldsValue({ severity: 'INFO', audienceType: 'STAFF', requiresAcknowledgement: false });
          setPublishRequestId(createAnnouncementRequestId());
          setPublishOpen(true);
        }}>发布公告</Button> : null}
      </div>
      <Spin spinning={announcementLoading}>
        <List
          className="announcement-list"
          dataSource={announcements}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无公告" /> }}
          renderItem={(row) => (
            <List.Item className="announcement-row">
              <div className="announcement-row-main">
                <div className="notification-row-heading">
                  <Space size={6} wrap>
                    <Text strong>{row.title}</Text>
                    <Tag color={row.status === 'PUBLISHED' ? 'green' : 'default'}>{row.status === 'PUBLISHED' ? '已发布' : '已撤回'}</Tag>
                    {row.requiresAcknowledgement ? <Tag color="blue">要求确认</Tag> : null}
                  </Space>
                  <Text type="secondary" className="notification-time">{formatBeijingDateTime(row.publishedAt)}</Text>
                </div>
                <Paragraph className="notification-body">{row.body}</Paragraph>
                <Space size={12} wrap className="announcement-stat-line">
                  <Text type="secondary">接收 {row.recipientCount}</Text>
                  <Text type="secondary">已读 {row.readCount}</Text>
                  {row.requiresAcknowledgement ? <Text type="secondary">已知晓 {row.acknowledgedCount}</Text> : null}
                  {row.status === 'PUBLISHED' && canWithdrawAnnouncements ? <Button size="small" danger onClick={() => void withdraw(row)}>撤回</Button> : null}
                </Space>
              </div>
            </List.Item>
          )}
        />
      </Spin>
    </div>
  );

  const processingStatusPresentation: Record<string, { label: string; color: string }> = {
    PENDING: { label: '待处理', color: 'blue' },
    PROCESSING: { label: '处理中', color: 'processing' },
    PROCESSED: { label: '已投递', color: 'green' },
    SKIPPED: { label: '已跳过', color: 'default' },
    NO_RECIPIENT: { label: '无收件人', color: 'orange' },
    FAILED: { label: '待重试', color: 'red' },
    DEAD_LETTER: { label: '需人工处理', color: 'volcano' }
  };

  const operationsManagement = (
    <div className="notification-operations">
      <div className="notification-toolbar">
        <Space size={8} wrap>
          <Text strong>通知运行状态</Text>
          <Tag color="red">失败 {operations.counts.FAILED + operations.counts.DEAD_LETTER}</Tag>
          <Tag color="orange">无收件人 {operations.counts.NO_RECIPIENT}</Tag>
          <Tag color="green">已投递 {operations.counts.PROCESSED}</Tag>
        </Space>
        <Button size="small" icon={<RefreshCw size={14} />} loading={operationsLoading} onClick={() => void refreshOperations()}>刷新</Button>
      </div>
      <Spin spinning={operationsLoading}>
        <List
          className="notification-operation-list"
          dataSource={operations.items}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无通知运行记录" /> }}
          renderItem={(row) => {
            const presentation = processingStatusPresentation[row.status] ?? { label: row.status, color: 'default' };
            return (
              <List.Item className="notification-operation-row">
                <div className="notification-row-main">
                  <div className="notification-row-heading">
                    <Space size={6} wrap>
                      <Text code>{row.action}</Text>
                      <Tag color={presentation.color}>{presentation.label}</Tag>
                      <Text type="secondary">收件 {row.recipientCount}</Text>
                      <Text type="secondary">尝试 {row.attempts}</Text>
                    </Space>
                    <Text type="secondary" className="notification-time">{formatBeijingDateTime(row.updatedAt)}</Text>
                  </div>
                  {row.error ? <Text type="danger" className="notification-operation-error">{row.error}</Text> : null}
                </div>
                {canRetryOperations && ['FAILED', 'DEAD_LETTER'].includes(row.status) ? (
                  <Button size="small" danger onClick={() => void retryOperation(row.id)}>重试</Button>
                ) : null}
              </List.Item>
            );
          }}
        />
      </Spin>
    </div>
  );

  return (
    <>
      <Badge dot={actionTasks.total > 0} color="#fa8c16" offset={[-2, 3]}>
        <Badge count={summaryCount} overflowCount={99} size="small">
          <Button
            className={`notification-bell-button${compact ? ' is-compact' : ''}`}
            icon={<Bell size={17} />}
            aria-label={`消息中心，${summaryCount} 条未读${actionTasks.total ? `，${actionTasks.total} 条待办` : ''}`}
            onClick={() => void openNotificationCenter()}
          >
            {compact ? null : '消息'}
          </Button>
        </Badge>
      </Badge>

      <Drawer
        className="notification-drawer"
        title={(
          <Space size={8}>
            <Bell size={18} />
            <span>消息中心</span>
            {summaryCount ? <Tag color="blue">{summaryCount > 99 ? '99+' : summaryCount} 条未读</Tag> : null}
            {actionTasks.total ? <Tag color="orange">{actionTasks.total > 99 ? '99+' : actionTasks.total} 条待办</Tag> : null}
          </Space>
        )}
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden={false}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'inbox', label: '我的消息', children: inbox },
            { key: 'tasks', label: actionTasks.total ? `我的待办 ${actionTasks.total}` : '我的待办', children: actionTaskList },
            ...(canManageAnnouncements ? [{ key: 'announcements', label: <Space size={5}><Settings2 size={14} />公告管理</Space>, children: announcementManagement }] : []),
            ...(canViewOperations ? [{ key: 'operations', label: <Space size={5}><RefreshCw size={14} />运行状态</Space>, children: operationsManagement }] : [])
          ]}
        />
      </Drawer>

      <Modal
        title="发布公告"
        width={680}
        open={publishOpen}
        okText="发布公告"
        cancelText="取消"
        confirmLoading={publishing}
        onOk={() => form.submit()}
        onCancel={() => setPublishOpen(false)}
        destroyOnHidden
      >
        <div className="announcement-publish-intro">
          <Megaphone size={18} />
          <div>
            <Text strong>公告将立即进入目标用户的消息中心</Text>
            <Text type="secondary">发布后内容不可编辑；如有错误，请撤回后重新发布。</Text>
          </div>
        </div>
        <Form form={form} layout="vertical" onFinish={(values) => void publish(values)} preserve={false}>
          <div className="announcement-form-grid">
            <Form.Item name="title" label="公告标题" rules={[{ required: true, message: '请填写公告标题' }, { max: 100, message: '最多 100 个字符' }]}>
              <Input placeholder="例如：系统维护时间调整" maxLength={100} showCount />
            </Form.Item>
            <Form.Item name="severity" label="公告级别" initialValue="INFO" rules={[{ required: true }]}>
              <Select options={severityOptions} />
            </Form.Item>
            <Form.Item name="audienceType" label="接收范围" initialValue="STAFF" rules={[{ required: true }]}>
              <Select options={audienceTypeOptions} onChange={() => form.setFieldValue('audienceValues', [])} />
            </Form.Item>
            <Form.Item name="expiresAt" label="自动过期时间">
              <DatePicker showTime className="announcement-expire-picker" placeholder="不填写则长期有效" />
            </Form.Item>
          </div>
          {['ROLE', 'DEPARTMENT', 'SITE', 'USERS'].includes(selectedAudienceType ?? '') ? (
            <Form.Item name="audienceValues" label="具体受众" rules={[{ required: true, message: '请选择公告受众' }]}>
              <Select mode="multiple" showSearch optionFilterProp="label" options={audienceValueOptions} placeholder="选择一个或多个受众" />
            </Form.Item>
          ) : null}
          <Form.Item name="body" label="公告正文" rules={[{ required: true, message: '请填写公告正文' }, { max: 2000, message: '最多 2000 个字符' }]}>
            <Input.TextArea rows={6} maxLength={2000} showCount placeholder="说明发生了什么、影响范围和用户需要采取的动作。" />
          </Form.Item>
          <Form.Item name="requiresAcknowledgement" valuePropName="checked" initialValue={false}>
            <Checkbox>要求接收人点击“我已知晓”</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="通知偏好"
        width={480}
        open={preferencesOpen}
        footer={<Button onClick={() => setPreferencesOpen(false)}>完成</Button>}
        onCancel={() => setPreferencesOpen(false)}
        destroyOnHidden={false}
      >
        <Text type="secondary">偏好在后续实际投递时生效；紧急公告、驳回和反审核仍会发送。</Text>
        <Spin spinning={preferencesLoading}>
          <List
            className="notification-preference-list"
            dataSource={preferences}
            locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无可配置通知" /> }}
            renderItem={(item) => (
              <List.Item
                actions={[<Switch key={item.category} checked={item.enabled} disabled={item.locked || preferencesLoading} onChange={(checked) => void updatePreference(item.category, checked)} />]}
              >
                <List.Item.Meta title={item.label} description={item.locked ? '系统要求接收' : item.enabled ? '接收此类通知' : '已关闭可选通知'} />
              </List.Item>
            )}
          />
        </Spin>
      </Modal>
    </>
  );
}
