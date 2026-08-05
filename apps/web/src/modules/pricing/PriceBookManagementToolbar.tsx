import type { ChangeEvent, ReactNode, RefObject } from 'react';
import { Button, Popconfirm, Select, Space, Tag } from 'antd';
import { Download, FileInput, RefreshCw, Settings } from 'lucide-react';
import type { PriceBookImportTargetModule } from '@siyuan/shared';
import type { PermissionKey } from '../../apiClient';
import { filterPriceBookImportAgentOption, priceBookImportModules } from './pricingPageModel';

type PriceBookManagementModule = PriceBookImportTargetModule | 'unclassified';

export interface PriceBookManagementToolbarProps {
  module: PriceBookManagementModule;
  can: (permission: PermissionKey) => boolean;
  canViewRows: boolean;
  importAgentId?: string;
  importAgentOptions: Array<{ value: string; label: ReactNode; searchText?: string }>;
  importing: boolean;
  importHistoryLoading: boolean;
  syncHealthLoading: boolean;
  selectedCount: number;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImportAgentChange: (value: string) => void;
  onLoadImportHistory: () => void;
  onOpenSyncHealth: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDownload: () => void;
  onEditRemark: () => void;
  onDelete: () => void | Promise<void>;
}

export function PriceBookManagementToolbar({
  module,
  can,
  canViewRows,
  importAgentId,
  importAgentOptions,
  importing,
  importHistoryLoading,
  syncHealthLoading,
  selectedCount,
  fileInputRef,
  onImportAgentChange,
  onLoadImportHistory,
  onOpenSyncHealth,
  onFileChange,
  onDownload,
  onEditRemark,
  onDelete
}: PriceBookManagementToolbarProps) {
  const classified = module !== 'unclassified';
  return (
    <Space>
      {classified && can('pricing:price-books:upload') ? <Select
        aria-label="选择代理简称"
        showSearch
        placeholder="选择代理简称"
        value={importAgentId}
        style={{ width: 180 }}
        disabled={importing}
        optionFilterProp="searchText"
        filterOption={(input, option) => filterPriceBookImportAgentOption(input, option as { searchText?: string; label?: unknown })}
        options={importAgentOptions}
        onChange={onImportAgentChange}
      /> : null}
      <Tag color={classified ? 'blue' : 'orange'}>{classified ? priceBookImportModules.find((item) => item.key === module)?.label : '未归类数据'}</Tag>
      {can('pricing:price-books:import-job-view') ? <Button htmlType="button" size="small" icon={<RefreshCw size={14} />} loading={importHistoryLoading} onClick={onLoadImportHistory}>导入记录</Button> : null}
      {can('pricing:price-books:sync-health-view') ? <Button htmlType="button" size="small" icon={<Settings size={14} />} loading={syncHealthLoading} onClick={onOpenSyncHealth}>同步体检</Button> : null}
      {classified && can('pricing:price-books:upload') ? <Button
        htmlType="button"
        size="small"
        icon={<FileInput size={14} />}
        loading={importing}
        disabled={importing || (module !== 'dubaiAirSea' && !importAgentId)}
        title={module !== 'dubaiAirSea' && !importAgentId ? '请先选择代理简称' : '上传并导入当前查价模块价格表'}
        onClick={() => fileInputRef.current?.click()}
      >
        增加价格表
      </Button> : null}
      {classified && can('pricing:price-books:upload') ? <input
        ref={fileInputRef}
        className="visually-hidden-file-input"
        aria-label="增加价格表"
        type="file"
        accept=".xls,.xlsx"
        onChange={onFileChange}
      /> : null}
      {canViewRows ? <Button htmlType="button" size="small" icon={<Download size={14} />} disabled={selectedCount !== 1} title="下载导入时保留的原始 xls/xlsx 价格表" onClick={onDownload}>下载价格表</Button> : null}
      {classified && can('pricing:price-books:remark-update') ? <Button htmlType="button" size="small" disabled={selectedCount !== 1} onClick={onEditRemark}>编辑自定义备注</Button> : null}
      {classified && can('pricing:price-books:delete') ? <Popconfirm
        title={selectedCount > 1 ? `确认删除 ${selectedCount} 张价格表？` : '确认删除该价格表？'}
        description="删除后该价格表导入的报价行会从当前报价库移除。"
        okText="删除价格表"
        cancelText="取消"
        okButtonProps={{ danger: true }}
        disabled={selectedCount === 0}
        onConfirm={onDelete}
      >
        <Button htmlType="button" size="small" disabled={selectedCount === 0}>删除价格表</Button>
      </Popconfirm> : null}
    </Space>
  );
}
