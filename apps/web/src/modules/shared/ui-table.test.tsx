import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ManagedTable } from './ui';

describe('ManagedTable', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('allows table columns to be resized from the header', () => {
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

  it('allows table columns to be hidden and reordered from settings', () => {
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

    fireEvent.click(screen.getByRole('button', { name: '列设置' }));
    expect(screen.getByRole('dialog', { name: '测试列设置' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /下\s*移/ })[0]);
    fireEvent.click(screen.getByLabelText('创建时间'));
    fireEvent.click(screen.getByRole('button', { name: /完\s*成/ }));

    expect(screen.getByRole('columnheader', { name: /创建时间/ })).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem('sunny.test.columns') ?? '{}') as { hiddenKeys?: string[]; columnOrder?: string[] };
    expect(saved.hiddenKeys).not.toContain('createdAt');
    expect(saved.columnOrder?.[1]).toBe('createdAt');
  });
});
