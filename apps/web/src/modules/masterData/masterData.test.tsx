import { useState } from 'react';
import { Form } from 'antd';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FinanceCatalogItemInput, FinanceCatalogItemSummary } from '@siyuan/shared';
import { renderAndLogin } from '../testSupport/appTestHarness';
import { createFinanceCatalogFilters } from '../finance/catalog';
import { FinanceCatalogPage, type FinanceCatalogFilters } from '../finance/FinanceCatalogPage';

afterEach(() => {
  cleanup();
});

describe('Master data agent bank accounts', () => {
  it('客户资料管理员通过启用业务员下拉选择归属', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    const customerSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '客户资料');
    expect(customerSectionButton).toBeTruthy();
    await user.click(customerSectionButton!);
    await user.click(await screen.findByRole('button', { name: '增加客户' }));

    const dialog = await screen.findByRole('dialog', { name: '新建客户' });
    const salespersonSelect = within(dialog).getByRole('combobox', { name: '业务员归属' });
    await user.click(salespersonSelect);
    expect(await screen.findByText(/operator.*启用/)).toBeInTheDocument();
    expect(screen.queryByText(/客户.*启用/)).not.toBeInTheDocument();
  });

  it('新建客户的结算方式只从财务资料库的启用结算方式中选择', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    const customerSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '客户资料');
    expect(customerSectionButton).toBeTruthy();
    await user.click(customerSectionButton!);
    await user.click(await screen.findByRole('button', { name: '增加客户' }));

    const dialog = await screen.findByRole('dialog', { name: '新建客户' });
    const settlementSelect = within(dialog).getByRole('combobox', { name: '结算方式' });
    await user.click(settlementSelect);
    expect(await screen.findByText('月结 · RMB')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('例如 RMB月结')).not.toBeInTheDocument();
  });

  it('新建客户时可在同一弹窗内新增和删除收货人资料', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    const customerSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '客户资料');
    expect(customerSectionButton).toBeTruthy();
    await user.click(customerSectionButton!);
    await user.click(await screen.findByRole('button', { name: '增加客户' }));

    const dialog = await screen.findByRole('dialog', { name: '新建客户' });
    expect(within(dialog).getByText('客户基础信息')).toBeInTheDocument();
    expect(within(dialog).getByText('收货信息')).toBeInTheDocument();
    expect(within(dialog).getByText('点击右侧 + 添加收货信息')).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '新增收货人' }));
    expect(within(dialog).getByLabelText('收货人名称')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('FBA仓库代码')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '删除收货人 1' })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: '删除收货人 1' }));
    expect(within(dialog).getByText('点击右侧 + 添加收货信息')).toBeInTheDocument();
  });

  it('财务汇率请求失败时仍加载代理资料', async () => {
    const baseFetch = vi.mocked(fetch).getMockImplementation();
    expect(baseFetch).toBeTruthy();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes('/api/finance/receivable-audits') && (!init?.method || init.method === 'GET')) {
        return Promise.resolve(new Response(JSON.stringify({ message: '缺少 USD 到 RMB 的系统汇率' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return baseFetch!(input, init);
    });

    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    expect(await screen.findByRole('heading', { name: '基础资料库' })).toBeInTheDocument();
    const agentSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '代理资料');
    expect(agentSectionButton).toBeTruthy();
    await user.click(agentSectionButton!);
    expect((await screen.findAllByText('亿阳国际')).length).toBeGreaterThan(0);
  });

  it('代理简称重复时保留弹窗并显示后端原因', async () => {
    const baseFetch = vi.mocked(fetch).getMockImplementation();
    expect(baseFetch).toBeTruthy();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith('/api/master-data/agents') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ message: '代理简称“驰汉”已存在，不允许重复录入' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return baseFetch!(input, init);
    });

    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    const agentSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '代理资料');
    expect(agentSectionButton).toBeTruthy();
    await user.click(agentSectionButton!);
    await user.click(screen.getByRole('button', { name: '增加代理' }));
    const dialog = await screen.findByRole('dialog', { name: '新建代理' });
    await user.type(within(dialog).getByLabelText('代理简称'), '驰汉');
    await user.type(within(dialog).getByLabelText('代理全称'), '重复代理测试');
    await user.click(screen.getByRole('button', { name: '创建代理' }));

    expect(await screen.findByText('代理简称“驰汉”已存在，不允许重复录入')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: '新建代理' })).toBeInTheDocument();
  });

  it('代理资料 创建时间 新建第一行 已选数量 与物理删除不可恢复确认', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    expect(await screen.findByRole('heading', { name: '基础资料库' })).toBeInTheDocument();
    const agentSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '代理资料');
    expect(agentSectionButton).toBeTruthy();
    await user.click(agentSectionButton!);
    expect(await screen.findByLabelText('代理全称筛选')).toBeInTheDocument();
    expect((await screen.findAllByText('创建时间')).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '增加代理' }));
    const dialog = await screen.findByRole('dialog', { name: '新建代理' });
    await user.type(within(dialog).getByLabelText('代理简称'), '置顶代理');
    await user.type(within(dialog).getByLabelText('代理全称'), '深圳置顶代理');
    await user.click(screen.getByRole('button', { name: '创建代理' }));

    expect(await screen.findByText('置顶代理')).toBeInTheDocument();
    await waitFor(() => {
      const firstRow = document.querySelector('.ant-table-tbody tr.ant-table-row') as HTMLElement | null;
      expect(firstRow).not.toBeNull();
      expect(firstRow).toHaveTextContent('深圳置顶代理');
    });
    expect(screen.getByRole('button', { name: '修改代理' })).toBeEnabled();
    expect(screen.getAllByText('已选 1 条').length).toBeGreaterThan(0);

    const agentTable = screen.getAllByText('创建时间')[0].closest('.ant-table-wrapper') as HTMLElement;
    expect(within(agentTable).getAllByRole('checkbox').length).toBeGreaterThan(1);
    expect(screen.getByRole('button', { name: '删除代理' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: '删除代理' }));
    expect(await screen.findByText('是否确认删除？')).toBeInTheDocument();
    expect(screen.queryByText(/确认停用|已停用/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认删除' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('已物理删除 1 条代理资料')).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText('已选 0 条').length).toBeGreaterThan(0));
    expect(screen.queryByText('深圳置顶代理')).not.toBeInTheDocument();
  }, 10000);

  it('代理资料删除失败时使用红色错误提示', async () => {
    const baseFetch = vi.mocked(fetch).getMockImplementation();
    expect(baseFetch).toBeTruthy();
    vi.mocked(fetch).mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith('/api/master-data/agents/batch-delete') && init?.method === 'POST') {
        return Promise.resolve(new Response(JSON.stringify({ message: '代理资料存在业务引用，不能删除：亿阳国际（运单引用）' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }));
      }
      return baseFetch!(input, init);
    });

    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');
    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    const agentSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '代理资料');
    expect(agentSectionButton).toBeTruthy();
    await user.click(agentSectionButton!);
    const agentCell = (await screen.findAllByText('亿阳国际'))[0];
    const agentRow = agentCell.closest('tr');
    expect(agentRow).not.toBeNull();
    await user.click(within(agentRow as HTMLElement).getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: '删除代理' }));
    await user.click(await screen.findByRole('button', { name: '确认删除' }));

    expect(await screen.findByText(/代理资料删除失败：代理资料存在业务引用，不能删除/)).toBeInTheDocument();
    await waitFor(() => expect(document.querySelector('.ant-message-error')).not.toBeNull());
  });

  it('代理资料 收款银行 账户一 账户二 账户三 可展示并保存三组账户', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    expect(await screen.findByRole('heading', { name: '基础资料库' })).toBeInTheDocument();
    const agentSectionButton = screen.getAllByRole('button').find((button) => button.textContent?.trim() === '代理资料');
    expect(agentSectionButton).toBeTruthy();
    await user.click(agentSectionButton!);
    expect(await screen.findByLabelText('代理全称筛选')).toBeInTheDocument();
    expect((await screen.findAllByText('收款银行账户一')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('收款银行账户二').length).toBeGreaterThan(0);
    expect(screen.getAllByText('收款银行账户三').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: '增加代理' }));
    const dialog = await screen.findByRole('dialog', { name: '新建代理' });
    await user.type(within(dialog).getByLabelText('代理简称'), '三账代理');
    await user.type(within(dialog).getByLabelText('代理全称'), '深圳三账代理');
    await user.type(within(dialog).getAllByLabelText('收款方')[0], '三账代理 RMB 户');
    await user.type(within(dialog).getAllByLabelText('开户银行')[0], '招商银行深圳分行');
    await user.type(within(dialog).getAllByLabelText('银行账号')[0], 'RMB-333-001');
    await user.type(within(dialog).getAllByLabelText('收款方')[1], '三账代理 USD 户');
    await user.type(within(dialog).getAllByLabelText('开户银行')[1], 'HSBC HK');
    await user.type(within(dialog).getAllByLabelText('银行账号')[1], 'USD-333-002');
    await user.selectOptions(within(dialog).getByLabelText('收款银行账户2币种'), 'USD');
    await user.type(within(dialog).getAllByLabelText('收款方')[2], '三账代理备用户');
    await user.type(within(dialog).getAllByLabelText('开户银行')[2], '中国银行深圳分行');
    await user.type(within(dialog).getAllByLabelText('银行账号')[2], 'RMB-333-003');
    await user.click(screen.getByRole('button', { name: '创建代理' }));

    expect(await screen.findByText('三账代理 RMB 户 / 招商银行深圳分行')).toBeInTheDocument();
    expect(await screen.findByText('三账代理 USD 户 / HSBC HK')).toBeInTheDocument();
    expect(await screen.findByText('三账代理备用户 / 中国银行深圳分行')).toBeInTheDocument();
  }, 10000);
});

function FinanceCatalogHarness({ canWrite = true }: { canWrite?: boolean }) {
  const [form] = Form.useForm<FinanceCatalogItemInput>();
  const [filters, setFilters] = useState<FinanceCatalogFilters>(createFinanceCatalogFilters());
  const [items, setItems] = useState<FinanceCatalogItemSummary[]>([
    {
      id: 'fee-1',
      category: 'FEE_NAME',
      name: '基础运费',
      currency: 'RMB',
      sortOrder: 1,
      enabled: true,
      remark: '用于普通运单应收应付维护的长备注说明',
      createdAt: '',
      updatedAt: ''
    },
    { id: 'fee-2', category: 'FEE_NAME', name: '燃油费', currency: 'USD', sortOrder: 2, enabled: true, createdAt: '', updatedAt: '' },
    { id: 'settlement-1', category: 'SETTLEMENT_METHOD', name: '月结', currency: 'RMB', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' },
    { id: 'cargo-1', category: 'CARGO_TYPE', name: '普货', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' },
    { id: 'product-1', category: 'PRODUCT_NAME', name: '桌子', currency: 'USD', sortOrder: 1, enabled: true, createdAt: '', updatedAt: '' }
  ]);
  return (
    <FinanceCatalogPage
      items={items}
      loading={false}
      filters={filters}
      editingItem={null}
      editingCategory="FEE_NAME"
      editorOpen={false}
      submitting={false}
      form={form}
      pagination={false}
      canWrite={canWrite}
      onFilterChange={(category, patch) => setFilters((current) => ({ ...current, [category]: { ...current[category], ...patch } }))}
      onRefresh={vi.fn()}
      onCreate={vi.fn()}
      onEdit={vi.fn()}
      onToggle={vi.fn()}
      onMove={vi.fn()}
      onDelete={(item) => setItems((current) => current.filter((row) => row.id !== item.id))}
      onCloseEditor={vi.fn()}
      onSubmit={vi.fn()}
    />
  );
}

describe('Master data finance catalog layout', () => {
  it('财务资料 费用名称 结算方式 货物类型 品名 表格紧凑展示并保留停用 删除 排序操作', async () => {
    const user = userEvent.setup();
    render(<FinanceCatalogHarness />);

    const table = document.querySelector('.finance-catalog-table table') as HTMLTableElement | null;
    expect(table).toBeTruthy();
    expect(table?.style.tableLayout).toBe('fixed');
    expect(document.querySelector('.finance-catalog-table .ant-table-container')).toBeTruthy();
    expect(document.querySelector('.finance-catalog-table col[style*="width: 338px"]')).toBeTruthy();
    expect(document.querySelector('.finance-catalog-table col[style*="width: 84px"]')).toBeTruthy();
    expect(document.querySelector('.finance-catalog-table col[style*="width: 178px"]')).toBeTruthy();

    expect(screen.getByPlaceholderText('搜索费用名称')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '只看启用' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /刷\s*新/ })).toBeInTheDocument();
    const feeRow = screen.getByRole('row', { name: /基础运费/ });
    expect(within(feeRow).getByRole('button', { name: /编\s*辑/ })).toBeInTheDocument();
    expect(within(feeRow).getByRole('button', { name: /停\s*用/ })).toBeInTheDocument();
    expect(within(feeRow).getByRole('button', { name: /删\s*除/ })).toBeInTheDocument();
    expect(within(feeRow).getByRole('button', { name: /上\s*移/ })).toBeInTheDocument();
    await user.click(within(feeRow).getByRole('button', { name: /删\s*除/ }));
    expect(await screen.findByText('确认删除该资料？')).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: '确认删除' }));
    await waitFor(() => expect(screen.queryByText('基础运费')).not.toBeInTheDocument());
    const fuelRow = screen.getByRole('row', { name: /燃油费/ });
    await user.click(within(fuelRow).getByRole('button', { name: /停\s*用/ }));
    expect(await screen.findByText('确认停用该资料？')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '结算方式' }));
    expect(await screen.findByText('月结')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '默认币种' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '货物类型' }));
    expect(await screen.findByText('普货')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: '默认币种' })).not.toBeInTheDocument();
    expect(document.querySelector('.finance-catalog-table col[style*="width: 344px"]')).toBeTruthy();

    await user.click(screen.getByRole('radio', { name: '品名' }));
    expect(await screen.findByText('桌子')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '默认币种' })).toBeInTheDocument();
  });

  it('财务资料无权限用户不显示编辑 停用 删除 按钮', () => {
    render(<FinanceCatalogHarness canWrite={false} />);

    expect(screen.queryByRole('button', { name: /编\s*辑/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /停\s*用/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /删\s*除/ })).not.toBeInTheDocument();
    expect(screen.getAllByText('只读').length).toBeGreaterThan(0);
    expect(document.querySelector('.finance-catalog-table col[style*="width: 82px"]')).toBeTruthy();
  });
});
