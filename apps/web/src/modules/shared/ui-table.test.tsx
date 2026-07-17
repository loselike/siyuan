import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState, type Key } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ManagedTable } from './ui';

describe('ManagedTable', () => {
  beforeEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('列宽 allows table columns to be resized from the header', () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 },
          { key: 'orderNo', title: '客户单号-快递单号', dataIndex: 'orderNo', width: 220 }
        ]}
        dataSource={[{ id: 'row-1', customerCode: '9409', orderNo: '9409-KY123456789' }]}
        pagination={false}
      />
    );

    const header = screen.getByRole('columnheader', { name: /客户编号/ });
    const resizeHandle = screen.getByTestId('column-resize-handle-customerCode');

    expect(header).toHaveClass('managed-table-resizable-cell');
    fireEvent.mouseDown(resizeHandle, { clientX: 120 });
    expect(document.body).toHaveClass('is-resizing-table-column');
    fireEvent.mouseMove(window, { clientX: 180 });
    fireEvent.mouseUp(window);
    expect(document.body).not.toHaveClass('is-resizing-table-column');
  });

  it('默认让有 dataIndex 的业务列按原始值排序，同时保留明确的排序配置', async () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 },
          { key: 'weight', title: '计费重', dataIndex: 'weight', width: 100 },
          { key: 'status', title: '状态', dataIndex: 'status', width: 100, sorter: false },
          { key: 'action', title: '操作', width: 90, render: () => '查看' }
        ]}
        dataSource={[
          { id: 'row-1', customerCode: 'Y558', weight: 100, status: '已完成' },
          { id: 'row-2', customerCode: 'A378', weight: 9, status: '待处理' }
        ]}
        pagination={false}
      />
    );

    const rowsBeforeSort = screen.getAllByRole('row');
    expect(rowsBeforeSort[1]).toHaveTextContent('Y558');

    fireEvent.click(screen.getByRole('columnheader', { name: /客户编号/ }));
    await waitFor(() => {
      expect(screen.getAllByRole('row')[1]).toHaveTextContent('A378');
    });

    const statusHeader = screen.getByRole('columnheader', { name: '状态' });
    expect(statusHeader.querySelector('.ant-table-column-sorter')).toBeNull();
  });

  it('已有 ManagedTable 的列 key 直接对应数据字段时，即使未写 dataIndex 也可排序', async () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'customerCode', title: '客户编号', width: 120, render: (_, row) => row.customerCode },
          { key: 'action', title: '操作', width: 90, render: () => '查看' }
        ]}
        dataSource={[
          { id: 'row-1', customerCode: 'Y558' },
          { id: 'row-2', customerCode: 'A378' }
        ]}
        pagination={false}
      />
    );

    const customerHeader = screen.getByRole('columnheader', { name: /客户编号/ });
    expect(customerHeader.querySelector('.ant-table-column-sorter')).not.toBeNull();
    fireEvent.click(customerHeader);
    await waitFor(() => {
      expect(screen.getAllByRole('row')[1]).toHaveTextContent('A378');
    });
    expect(screen.getByRole('columnheader', { name: '操作' }).querySelector('.ant-table-column-sorter')).toBeNull();
  });

  it('可关闭列设置和列宽调整，以无交互副作用地承接只读 AntD Table', () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[{ key: 'createdAt', title: '操作时间', dataIndex: 'createdAt', width: 160 }]}
        dataSource={[{ id: 'row-1', createdAt: '2026-07-16 10:00:00' }]}
        pagination={false}
        minimumScrollX={0}
        sticky={false}
        resizableColumns={false}
        columnSettings={false}
      />
    );

    expect(screen.queryByRole('button', { name: '列设置' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '操作时间' })).not.toHaveClass('managed-table-resizable-cell');
    expect(screen.getAllByText('操作时间')).toHaveLength(1);
  });

  it('计算列使用与列设置相同的 key 提供排序值', async () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'customer', title: '客户编号/名称', sortValue: (row) => `${row.customerCode}|${row.customerName}`, render: (_, row) => `${row.customerCode} / ${row.customerName}` },
          { key: 'action', title: '操作', sortable: false, render: () => '查看' }
        ]}
        dataSource={[
          { id: 'row-1', customerCode: '9409', customerName: 'Daloday' },
          { id: 'row-2', customerCode: '1431', customerName: '深圳欧总' }
        ]}
        pagination={false}
        columnSettings={{ storageKey: 'sunny.test.computed-columns', title: '计算列设置' }}
      />
    );

    const customerHeader = screen.getByRole('columnheader', { name: /客户编号\/名称/ });
    expect(customerHeader.querySelector('.ant-table-column-sorter')).not.toBeNull();
    expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();

    fireEvent.click(customerHeader);
    await waitFor(() => {
      expect(screen.getAllByRole('row')[1]).toHaveTextContent('1431 / 深圳欧总');
    });

    expect(screen.getByRole('columnheader', { name: '操作' }).querySelector('.ant-table-column-sorter')).toBeNull();
  });

  it('列设置 allows table columns to be hidden and reordered from settings', () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'createdAt', title: '创建时间', dataIndex: 'createdAt', width: 140 },
          { key: 'customerName', title: '客户名称', dataIndex: 'customerName', width: 160 },
          { key: 'systemOrderNo', title: '运单号', dataIndex: 'systemOrderNo', width: 160 }
        ]}
        dataSource={[{ id: 'row-1', createdAt: '2026-07-06', customerName: '9409-Daloday', systemOrderNo: 'SY001' }]}
        pagination={false}
        columnSettings={{
          storageKey: 'sunny.test.columns',
          title: '测试列设置',
          defaultHiddenKeys: ['createdAt']
        }}
      />
    );

    expect(screen.queryByRole('columnheader', { name: /创建时间/ })).not.toBeInTheDocument();
    const settingsButton = screen.getByRole('button', { name: '列设置' });
    expect(settingsButton.closest('.managed-table-toolbar')).toBeNull();
    expect(settingsButton.closest('.managed-table-settings-column')).toBeInTheDocument();

    fireEvent.click(settingsButton);
    expect(screen.getByRole('dialog', { name: '测试列设置' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: '移到首行' })[1]);
    fireEvent.click(screen.getByLabelText('创建时间'));
    fireEvent.click(screen.getByRole('button', { name: /完\s*成/ }));

    expect(screen.getByRole('columnheader', { name: /创建时间/ })).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem('sunny.test.columns') ?? '{}') as { hiddenKeys?: string[]; columnOrder?: string[] };
    expect(saved.hiddenKeys).not.toContain('createdAt');
    expect(saved.columnOrder?.[0]).toBe('customerName');
    expect(saved.columnOrder).toEqual(expect.arrayContaining(['createdAt']));
  });

  it('falls back to default columns when stored column settings are invalid', () => {
    window.localStorage.setItem('sunny.test.invalid-columns', '{not valid json');

    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 },
          { key: 'orderNo', title: '运单号', dataIndex: 'orderNo', width: 160 }
        ]}
        dataSource={[{ id: 'row-1', customerCode: '9409', orderNo: 'SY001' }]}
        pagination={false}
        columnSettings={{ storageKey: 'sunny.test.invalid-columns', title: '容错列设置' }}
      />
    );

    expect(screen.getByRole('columnheader', { name: /客户编号/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /运单号/ })).toBeInTheDocument();
  });

  it('keeps legacy finance column preferences when moving to ManagedTable settings', () => {
    window.localStorage.setItem('siyuan.finance.receivableAudit.columns', JSON.stringify({
      order: ['orderNo', 'customerCode'],
      hidden: ['customerCode']
    }));

    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 },
          { key: 'orderNo', title: '出货单号', dataIndex: 'orderNo', width: 160 },
          { key: 'action', title: '操作', width: 96, render: () => '查看' }
        ]}
        dataSource={[{ id: 'row-1', customerCode: '9409', orderNo: 'SY001' }]}
        pagination={false}
        columnSettings={{
          storageKey: 'siyuan.finance.receivableAudit.columns',
          title: '应收审核列设置',
          defaultColumnOrder: ['customerCode', 'orderNo', 'action'],
          lockedKeys: ['action']
        }}
      />
    );

    expect(screen.queryByRole('columnheader', { name: /客户编号/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('出货单号');
    expect(screen.getByRole('button', { name: '列设置' }).closest('.managed-table-settings-column')).toBeInTheDocument();
  });

  it('列设置 keeps selectable batch-operation columns as the first column', () => {
    window.localStorage.setItem('sunny.test.selection-columns', JSON.stringify({
      hiddenKeys: [],
      columnOrder: ['customerCode', 'select']
    }));

    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'select', title: '选择', width: 56, render: () => <input aria-label="选择行" type="checkbox" /> },
          { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 }
        ]}
        dataSource={[{ id: 'row-1', customerCode: '9409' }]}
        pagination={false}
        columnSettings={{ storageKey: 'sunny.test.selection-columns', title: '选择列设置' }}
      />
    );

    expect(screen.getAllByRole('columnheader')[0]).toHaveTextContent('选择');
    expect(screen.getByRole('button', { name: '列设置' }).closest('.managed-table-settings-column')).toBeInTheDocument();
  });

  it('selection keeps rowSelection tables selectable from the first header column', () => {
    function SelectableTable() {
      const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
      return (
        <ManagedTable
          rowKey="id"
          columns={[
            { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 },
            { key: 'orderNo', title: '运单号', dataIndex: 'orderNo', width: 160 }
          ]}
          dataSource={[
            { id: 'row-1', customerCode: '9409', orderNo: 'SY001' },
            { id: 'row-2', customerCode: 'SHB056', orderNo: 'SY002' }
          ]}
          pagination={false}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        />
      );
    }

    render(<SelectableTable />);

    const firstHeader = screen.getAllByRole('columnheader')[0];
    const selectAll = firstHeader.querySelector('input[type="checkbox"]');
    expect(selectAll).not.toBeNull();

    fireEvent.click(selectAll as HTMLInputElement);
    expect(screen.getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked)).toHaveLength(3);
  });

  it('does not write controlled selection back when the current records no longer contain it', async () => {
    const onSelectionChange = vi.fn();
    render(
      <ManagedTable
        rowKey="id"
        columns={[{ key: 'customerCode', title: '客户编号', dataIndex: 'customerCode' }]}
        dataSource={[{ id: 'row-visible', customerCode: '9409' }]}
        pagination={false}
        rowSelection={{ selectedRowKeys: ['row-removed'], onChange: onSelectionChange }}
      />
    );

    await waitFor(() => expect(onSelectionChange).not.toHaveBeenCalled());
  });

  it('selection 全选 with pagination only selects current page rows', () => {
    function SelectablePagedTable() {
      const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
      return (
        <ManagedTable
          rowKey="id"
          columns={[
            { key: 'customerCode', title: '客户编号', dataIndex: 'customerCode', width: 120 },
            { key: 'orderNo', title: '运单号', dataIndex: 'orderNo', width: 160 }
          ]}
          dataSource={Array.from({ length: 12 }, (_, index) => ({
            id: `row-${index + 1}`,
            customerCode: `C${index + 1}`,
            orderNo: `SY${index + 1}`
          }))}
          rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        />
      );
    }

    render(<SelectablePagedTable />);

    expect(screen.getByText('已选 0 条')).toBeInTheDocument();

    const firstHeader = screen.getAllByRole('columnheader')[0];
    const selectAll = firstHeader.querySelector('input[type="checkbox"]');
    expect(selectAll).not.toBeNull();

    fireEvent.click(selectAll as HTMLInputElement);
    expect(screen.getByText('已选 10 条')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked)).toHaveLength(11);

    const nextPageButton = document.querySelector('.ant-pagination-next button');
    expect(nextPageButton).not.toBeNull();
    fireEvent.click(nextPageButton as HTMLButtonElement);
    return waitFor(() => {
      expect(screen.getByText('已选 0 条')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox').filter((checkbox) => (checkbox as HTMLInputElement).checked)).toHaveLength(0);
    });
  });

  it('列设置 keeps grouped child columns individually configurable with persisted 列宽', () => {
    render(
      <ManagedTable
        rowKey="id"
        columns={[
          { key: 'createdAt', title: '运单创建时间', dataIndex: 'createdAt', width: 150 },
          {
            key: 'businessData',
            title: '业务数据',
            children: [
              { key: 'packageCount', title: '件数', dataIndex: 'packageCount', width: 90 },
              { key: 'chargeableWeight', title: '计费重', dataIndex: 'chargeableWeight', width: 110 }
            ]
          },
          { key: 'shippingMark', title: '唛头', dataIndex: 'shippingMark', width: 100 }
        ]}
        dataSource={[{ id: 'row-1', createdAt: '2026-07-08', packageCount: 3, chargeableWeight: 42, shippingMark: '需贴' }]}
        pagination={false}
        columnSettings={{
          storageKey: 'sunny.test.grouped-columns',
          title: '分组列设置',
          labels: { packageCount: '业务数据：件数', chargeableWeight: '业务数据：计费重' },
          defaultColumnOrder: ['createdAt', 'packageCount', 'chargeableWeight', 'shippingMark']
        }}
      />
    );

    fireEvent.mouseDown(screen.getByTestId('column-resize-handle-packageCount'), { clientX: 90 });
    fireEvent.mouseMove(window, { clientX: 150 });
    fireEvent.mouseUp(window);
    expect(JSON.parse(window.localStorage.getItem('sunny.test.grouped-columns:widths') ?? '{}')).toEqual(expect.objectContaining({ packageCount: 150 }));

    fireEvent.click(screen.getByRole('button', { name: '列设置' }));
    expect(screen.getByLabelText('业务数据：件数')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('业务数据：件数'));
    expect(screen.queryByRole('columnheader', { name: '件数' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '业务数据' })).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem('sunny.test.grouped-columns') ?? '{}')).toEqual(expect.objectContaining({ hiddenKeys: ['packageCount'] }));
  });
});
