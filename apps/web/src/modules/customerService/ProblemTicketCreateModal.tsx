import { useEffect, useState } from 'react';
import { Button, Checkbox, Form, Input, Modal, Popconfirm, Space, Spin, Typography, message } from 'antd';
import type { CommonTagSummary, ProblemTicketCreateInput, Shipment } from '@siyuan/shared';
import type { ApiClient } from '../../apiClient';
import { mergeProblemReasonTags, normalizeProblemReasonInput } from './problemReasonTags';

const { Text } = Typography;

type ProblemFormValues = {
  tags?: string[];
  customerVisible?: boolean;
  pushToSales?: boolean;
};

const fallbackProblemTags: CommonTagSummary[] = [
  '数据不对',
  '起运港查验',
  '目的港运港查验',
  '集装箱被甩在XX码头',
  '联系不上收货人',
  '收货人地址错误',
  '货物丢失',
  '货物破损'
].map((name, index) => ({
  id: `problem-tag-${index + 1}`,
  name,
  scene: 'PROBLEM_TICKET',
  enabled: true,
  customerVisibleAllowed: true,
  sortOrder: (index + 1) * 10
}));

export function ProblemTicketCreateModal({
  shipment,
  apiClient,
  title = '创建问题件',
  role,
  permissions = [],
  defaultCustomerVisible = true,
  showCustomerVisible = true,
  showPushToSales = false,
  onCancel,
  onSubmit
}: {
  shipment: Shipment | null;
  apiClient: ApiClient;
  title?: string;
  role: string;
  permissions?: readonly string[];
  defaultCustomerVisible?: boolean;
  showCustomerVisible?: boolean;
  showPushToSales?: boolean;
  onCancel: () => void;
  onSubmit: (input: ProblemTicketCreateInput) => Promise<void>;
}) {
  const [form] = Form.useForm<ProblemFormValues>();
  const [commonTags, setCommonTags] = useState<CommonTagSummary[]>(fallbackProblemTags);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsLoadError, setTagsLoadError] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [tagSaving, setTagSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canManage = role === 'ADMIN' || permissions.includes('customer-service:problem:tag-manage');

  useEffect(() => {
    if (!shipment) return;
    let cancelled = false;
    setTagsLoading(true);
    apiClient.problemTicketCommonTags()
      .then((tags) => {
        if (cancelled) return;
        setCommonTags(tags);
        setTagsLoadError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setTagsLoadError(error instanceof Error ? error.message : '常用标签加载失败');
      })
      .finally(() => {
        if (!cancelled) setTagsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiClient, shipment]);

  useEffect(() => {
    if (!shipment) return;
    setSelectedTags([]);
    setReason('');
    setReasonError(null);
    setManagerOpen(false);
    setEditingTagId(null);
    setEditingTagName('');
    setNewTagName('');
    form.setFieldsValue({ tags: [], customerVisible: defaultCustomerVisible, pushToSales: false });
  }, [defaultCustomerVisible, form, shipment]);

  function applySelection(nextTags: string[], previousTags = selectedTags) {
    const uniqueTags = [...new Set(nextTags)];
    setReason((current) => mergeProblemReasonTags(current, previousTags, uniqueTags));
    setSelectedTags(uniqueTags);
    setReasonError(null);
    form.setFieldValue('tags', uniqueTags);
  }

  async function createTag() {
    if (!canManage) return;
    if (commonTags.length >= 10) {
      message.warning('常用标签最多维护 10 个');
      return;
    }
    const name = newTagName.trim();
    if (!name) {
      message.warning('请填写标签名称');
      return;
    }
    setTagSaving(true);
    try {
      const created = await apiClient.createProblemTicketCommonTag({ name });
      setCommonTags((current) => [...current, created].sort((left, right) => left.sortOrder - right.sortOrder));
      setNewTagName('');
      message.success('常用标签已添加');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '添加常用标签失败');
    } finally {
      setTagSaving(false);
    }
  }

  async function updateTag(tag: CommonTagSummary) {
    if (!canManage) return;
    const name = editingTagName.trim();
    if (!name) {
      message.warning('请填写标签名称');
      return;
    }
    setTagSaving(true);
    try {
      const updated = await apiClient.updateProblemTicketCommonTag(tag.id, { name });
      setCommonTags((current) => current.map((item) => item.id === updated.id ? updated : item));
      if (selectedTags.includes(tag.name)) {
        applySelection(selectedTags.map((item) => item === tag.name ? updated.name : item), selectedTags);
      }
      setEditingTagId(null);
      setEditingTagName('');
      message.success('常用标签已修改');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '修改常用标签失败');
    } finally {
      setTagSaving(false);
    }
  }

  async function deleteTag(tag: CommonTagSummary) {
    if (!canManage) return;
    setTagSaving(true);
    try {
      await apiClient.deleteProblemTicketCommonTag(tag.id);
      setCommonTags((current) => current.filter((item) => item.id !== tag.id));
      if (selectedTags.includes(tag.name)) applySelection(selectedTags.filter((item) => item !== tag.name), selectedTags);
      if (editingTagId === tag.id) {
        setEditingTagId(null);
        setEditingTagName('');
      }
      message.success('常用标签已删除');
    } catch (error) {
      message.error(error instanceof Error ? error.message : '删除常用标签失败');
    } finally {
      setTagSaving(false);
    }
  }

  function close() {
    if (submitting) return;
    form.resetFields();
    onCancel();
  }

  async function submit() {
    const values = await form.validateFields();
    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setReasonError('请选择标签或填写问题原因');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        reason: normalizedReason,
        tags: selectedTags,
        customerVisible: showCustomerVisible ? (values.customerVisible ?? defaultCustomerVisible) : defaultCustomerVisible,
        pushToSales: showPushToSales ? values.pushToSales : undefined
      });
      form.resetFields();
      onCancel();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '创建问题件失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} open={Boolean(shipment)} onCancel={close} onOk={() => void submit()} confirmLoading={submitting} okText="确定" cancelText="取消" destroyOnHidden>
      <Form form={form} layout="vertical">
        <Space direction="vertical" size={2} className="full-width">
          <Text strong>{shipment?.systemOrderNo}</Text>
          <Text type="secondary">客户：{shipment?.customerCode || '-'} / 转单号：{shipment?.transferNo || '-'}</Text>
        </Space>
        <div style={{ marginTop: 16, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <Text strong>常用标签</Text>
          {canManage ? <Button type="link" size="small" onClick={() => setManagerOpen((open) => !open)}>{managerOpen ? '收起管理' : '管理标签'}</Button> : null}
        </div>
        <Spin spinning={tagsLoading} size="small">
          <Form.Item name="tags" noStyle>
            <Checkbox.Group options={commonTags.map((tag) => ({ label: tag.name, value: tag.name }))} onChange={(values) => applySelection(values.map(String))} />
          </Form.Item>
        </Spin>
        {tagsLoadError ? <Text type="danger" style={{ display: 'block', marginTop: 6 }}>{tagsLoadError}，当前显示默认标签</Text> : null}
        {managerOpen && canManage ? (
          <div style={{ marginTop: 10, padding: 12, border: '1px solid #d9e2f1', borderRadius: 8, background: '#fafcff' }}>
            <Space.Compact block>
              <Input value={newTagName} maxLength={20} placeholder="新增常用标签" disabled={tagSaving || commonTags.length >= 10} onChange={(event) => setNewTagName(event.target.value)} onPressEnter={() => void createTag()} />
              <Button type="primary" loading={tagSaving} disabled={commonTags.length >= 10} onClick={() => void createTag()}>添加</Button>
            </Space.Compact>
            <Text type="secondary" style={{ display: 'block', marginTop: 6 }}>已维护 {commonTags.length}/10 个标签，所有客服账号共享</Text>
            <Space direction="vertical" size={6} className="full-width" style={{ marginTop: 10 }}>
              {commonTags.map((tag) => (
                <Space key={tag.id} className="full-width" style={{ justifyContent: 'space-between' }}>
                  {editingTagId === tag.id ? (
                    <Input size="small" value={editingTagName} maxLength={20} disabled={tagSaving} onChange={(event) => setEditingTagName(event.target.value)} onPressEnter={() => void updateTag(tag)} />
                  ) : <Text>{tag.name}</Text>}
                  <Space size={4}>
                    {editingTagId === tag.id ? (
                      <>
                        <Button size="small" type="primary" loading={tagSaving} onClick={() => void updateTag(tag)}>保存</Button>
                        <Button size="small" disabled={tagSaving} onClick={() => { setEditingTagId(null); setEditingTagName(''); }}>取消</Button>
                      </>
                    ) : <Button size="small" disabled={tagSaving} onClick={() => { setEditingTagId(tag.id); setEditingTagName(tag.name); }}>修改</Button>}
                    <Popconfirm title={`确认删除“${tag.name}”？`} description="历史问题原因不会改变。" onConfirm={() => void deleteTag(tag)}>
                      <Button size="small" danger disabled={tagSaving}>删除</Button>
                    </Popconfirm>
                  </Space>
                </Space>
              ))}
            </Space>
          </div>
        ) : null}
        <Form.Item label="问题原因" validateStatus={reasonError ? 'error' : undefined} help={reasonError} style={{ marginTop: 16 }}>
          <Input.TextArea id="problem-reason" rows={5} value={reason} placeholder="勾选标签后自动填入，也可以继续手写补充" onChange={(event) => {
            const normalized = normalizeProblemReasonInput(reason, selectedTags, event.target.value);
            setReason(normalized);
            if (normalized.trim()) setReasonError(null);
          }} />
        </Form.Item>
        {showCustomerVisible ? <Form.Item name="customerVisible" valuePropName="checked"><Checkbox>客户可见</Checkbox></Form.Item> : null}
        {showPushToSales ? <Form.Item name="pushToSales" valuePropName="checked"><Checkbox>是否推送业务</Checkbox></Form.Item> : null}
      </Form>
    </Modal>
  );
}
