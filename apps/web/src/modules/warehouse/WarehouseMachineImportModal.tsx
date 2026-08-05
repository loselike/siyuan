import { useState } from 'react';
import { Alert, Button, Descriptions, Modal, Space, Statistic, Tag, Typography, Upload } from 'antd';
import type { UploadProps } from 'antd';
import { Download, FileSpreadsheet, UploadCloud } from 'lucide-react';
import type {
  WarehouseMachineImportIssue,
  WarehouseMachineImportResponse,
  WarehouseMachineImportSampleRow
} from '@siyuan/shared';
import { ApiClient } from '../../apiClient';
import { formatBeijingDateTime } from '../shared/format';
import { ManagedTable } from '../shared/ui';
import { downloadWarehouseMachineImportTemplate } from './warehouseMachineExport';

const { Text } = Typography;

const issueLabels: Record<WarehouseMachineImportIssue['type'], { text: string; color: string }> = {
  INVALID: { text: '格式错误', color: 'red' },
  DUPLICATE_FILE: { text: '文件内重复', color: 'orange' },
  CONFLICT_FILE: { text: '文件内冲突', color: 'volcano' },
  DUPLICATE_SYSTEM: { text: '系统已存在', color: 'default' },
  DUPLICATE_BATCH: { text: '文件已导入', color: 'default' }
};

export function WarehouseMachineImportModal({
  open,
  apiClient,
  onClose,
  onImported
}: {
  open: boolean;
  apiClient: ApiClient;
  onClose: () => void;
  onImported: (result: WarehouseMachineImportResponse) => void | Promise<void>;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<WarehouseMachineImportResponse | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [templateDownloading, setTemplateDownloading] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setSelectedFile(null);
    setPreview(null);
    setError('');
    setPreviewing(false);
    setImporting(false);
    setTemplateDownloading(false);
  }

  function close() {
    if (previewing || importing) return;
    reset();
    onClose();
  }

  async function loadPreview(file: File) {
    setSelectedFile(file);
    setPreview(null);
    setError('');
    if (!/\.(xls|xlsx)$/i.test(file.name)) {
      setError('仅支持 .xls 或 .xlsx 文件');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setError('文件不能超过 20 MB');
      return;
    }
    setPreviewing(true);
    try {
      setPreview(await apiClient.warehouseMachineImport(file, false));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '预览失败，请检查文件格式');
    } finally {
      setPreviewing(false);
    }
  }

  async function commitImport() {
    if (!selectedFile || !preview?.importableRows || importing) return;
    setImporting(true);
    setError('');
    try {
      const result = await apiClient.warehouseMachineImport(selectedFile, true);
      await onImported(result);
      reset();
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '导入失败，请稍后重试');
    } finally {
      setImporting(false);
    }
  }

  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    void loadPreview(file as File);
    return false;
  };

  async function downloadTemplate() {
    setTemplateDownloading(true);
    setError('');
    try {
      await downloadWarehouseMachineImportTemplate();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : '模板下载失败，请稍后重试');
    } finally {
      setTemplateDownloading(false);
    }
  }

  return (
    <Modal
      title="批量导入机器过机数据"
      open={open}
      width={980}
      onCancel={close}
      footer={(
        <Space>
          <Button onClick={close} disabled={previewing || importing}>取消</Button>
          <Button
            type="primary"
            loading={importing}
            disabled={!preview?.importableRows || previewing}
            onClick={() => void commitImport()}
          >确认导入 {preview?.importableRows ?? 0} 条</Button>
        </Space>
      )}
      destroyOnHidden
      maskClosable={false}
    >
      <Space direction="vertical" size={14} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="先预览、再确认导入；不会覆盖系统已有数据"
          description="请保留第 1 行列名；A-F 依次为条码、单件实重、长、宽、高、件数。件数为正整数，留空默认 1 件；总实重和总体积由系统计算。历史五列及机器原始 XLS/XLSX 仍可兼容导入。"
          action={(
            <Button
              icon={<Download size={15} />}
              loading={templateDownloading}
              onClick={() => void downloadTemplate()}
            >下载导入模板</Button>
          )}
        />
        <Upload.Dragger
          accept=".xls,.xlsx"
          maxCount={1}
          showUploadList={false}
          beforeUpload={beforeUpload}
          disabled={previewing || importing}
        >
          <UploadCloud size={30} />
          <div style={{ marginTop: 8 }}>{previewing ? '正在解析并核对数据…' : '点击或拖拽机器过机 Excel 到这里'}</div>
          <Text type="secondary">单次最多 20 MB、20,000 行</Text>
        </Upload.Dragger>
        {selectedFile ? (
          <Space><FileSpreadsheet size={16} /><Text>{selectedFile.name}</Text><Text type="secondary">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Text></Space>
        ) : null}
        {error ? <Alert type="error" showIcon message={error} /> : null}
        {preview ? (
          <>
            <Descriptions size="small" bordered column={4}>
              <Descriptions.Item label="文件总行数"><Statistic value={preview.totalRows} valueStyle={{ fontSize: 18 }} /></Descriptions.Item>
              <Descriptions.Item label="可导入"><Statistic value={preview.importableRows} valueStyle={{ fontSize: 18, color: '#1677ff' }} /></Descriptions.Item>
              <Descriptions.Item label="系统已存在"><Statistic value={preview.duplicateSystemRows} valueStyle={{ fontSize: 18 }} /></Descriptions.Item>
              <Descriptions.Item label="无效/文件重复"><Statistic value={preview.invalidRows + preview.duplicateFileRows} valueStyle={{ fontSize: 18, color: preview.invalidRows ? '#cf1322' : undefined }} /></Descriptions.Item>
              <Descriptions.Item label="过机时间范围" span={4}>
                {preview.dateFrom && preview.dateTo
                  ? `${formatBeijingDateTime(preview.dateFrom)} 至 ${formatBeijingDateTime(preview.dateTo)}`
                  : '-'}
              </Descriptions.Item>
            </Descriptions>
            {preview.samples.length ? (
              <ManagedTable<WarehouseMachineImportSampleRow>
                rowKey={(row) => `${row.sheetName}-${row.rowNumber}`}
                size="small"
                pagination={false}
                title={() => <Text strong>可导入样例（前 {preview.samples.length} 条）</Text>}
                dataSource={preview.samples}
                scroll={{ x: 900 }}
                columns={[
                  { title: '工作表/行', width: 110, render: (_, row) => `${row.sheetName} / ${row.rowNumber}` },
                  { title: '条码', dataIndex: 'barcode', width: 210 },
                  { title: '件数', dataIndex: 'packageCount', width: 70, render: (value: number) => `${value} 件` },
                  { title: '单件实重', dataIndex: 'weightKg', width: 100, render: (value: number) => `${value} kg` },
                  { title: '尺寸', width: 150, render: (_, row) => `${row.lengthCm}×${row.widthCm}×${row.heightCm} cm` },
                  { title: '过机时间', dataIndex: 'scanTime', width: 170, render: (value: string) => formatBeijingDateTime(value) },
                  { title: '备注', dataIndex: 'remark', width: 180, render: (value?: string) => value || '-' }
                ]}
                columnSettings={false}
              />
            ) : null}
            {preview.issueCount ? (
              <ManagedTable<WarehouseMachineImportIssue>
                rowKey={(row) => `${row.type}-${row.sheetName}-${row.rowNumber}`}
                size="small"
                pagination={preview.issues.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
                title={() => <Text strong>跳过明细（共 {preview.issueCount} 条，最多展示 200 条）</Text>}
                dataSource={preview.issues}
                columns={[
                  { title: '类型', dataIndex: 'type', width: 120, render: (value: WarehouseMachineImportIssue['type']) => <Tag color={issueLabels[value].color}>{issueLabels[value].text}</Tag> },
                  { title: '工作表', dataIndex: 'sheetName', width: 100 },
                  { title: '行号', dataIndex: 'rowNumber', width: 70 },
                  { title: '条码', dataIndex: 'barcode', width: 210, render: (value?: string) => value || '-' },
                  { title: '原因', dataIndex: 'reason' }
                ]}
                columnSettings={false}
              />
            ) : <Alert type="success" showIcon message="文件数据校验通过，没有需要跳过的行" />}
          </>
        ) : null}
      </Space>
    </Modal>
  );
}
