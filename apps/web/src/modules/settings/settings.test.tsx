import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { addRowsWorksheet, createWorkbook, writeWorkbookBuffer } from '../shared/excel';
import { App, cleanup, jsonResponse, renderAndLogin } from '../testSupport/appTestHarness';

describe('Settings and admin flows', () => {
  it('代理资料维护查询网站字段', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    await user.click(await screen.findByRole('button', { name: /代理资料/ }));
    await user.click(screen.getByRole('button', { name: '增加代理' }));

    const dialog = await screen.findByRole('dialog', { name: '新建代理' });
    await user.type(within(dialog).getByLabelText('代理简称'), '轨迹代理');
    await user.type(within(dialog).getByLabelText('代理详细公司名'), '深圳轨迹代理');
    fireEvent.change(within(dialog).getByLabelText('查询网站'), { target: { value: 'https://agent.example/track/{transferNo}' } });
    await user.click(screen.getByRole('button', { name: '创建代理' }));

    expect(await screen.findByText('深圳轨迹代理')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '修改代理' }));
    const editDialog = await screen.findByRole('dialog', { name: '编辑代理' });
    expect(within(editDialog).getByLabelText('查询网站')).toHaveValue('https://agent.example/track/{transferNo}');
    expect(screen.queryByText('代理成本')).not.toBeInTheDocument();
  }, 10000);

  it('基础资料库 财务资料以费用名称结算方式货物类型品名横向切换并提供删除入口', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    await user.click(await screen.findByRole('button', { name: /财务资料/ }));

    expect(await screen.findByText('基础运费')).toBeInTheDocument();
    expect(screen.getByText('燃油费')).toBeInTheDocument();
    expect(screen.queryByText('月结')).not.toBeInTheDocument();
    expect(screen.queryByText('普货')).not.toBeInTheDocument();
    expect(screen.queryByText('桌子')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /删\s*除/ }).length).toBeGreaterThan(0);

    await user.click(screen.getByText('结算方式'));
    expect(await screen.findByText('月结')).toBeInTheDocument();
    expect(screen.queryByText('普货')).not.toBeInTheDocument();

    await user.click(screen.getByText('货物类型'));
    expect(await screen.findByText('普货')).toBeInTheDocument();
    expect(screen.queryByText('桌子')).not.toBeInTheDocument();

    await user.click(screen.getByText('品名'));
    expect(await screen.findByText('桌子')).toBeInTheDocument();
    expect(screen.queryByText('基础运费')).not.toBeInTheDocument();
  });

  it('clears login state and returns to login on API 401', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async () => jsonResponse({ accessToken: 'bad-token', user: { id: 'u-admin', username: 'admin', role: 'ADMIN' } }));
    fetchMock.mockImplementationOnce(async () => new Response('Unauthorized', { status: 401 }));

    render(<App />);
    await userEvent.type(screen.getByLabelText('账号'), 'admin');
    await userEvent.type(screen.getByLabelText('密码'), 'admin123');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('heading', { name: '登录工作台' })).toBeInTheDocument();
  });


  it('shows a username or password error when login credentials are wrong', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async () => jsonResponse({
      captchaId: 'captcha-test',
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
    }));
    fetchMock.mockImplementationOnce(async () => jsonResponse({ message: '用户名或密码错误', statusCode: 401 }, 401));
    fetchMock.mockImplementationOnce(async () => jsonResponse({
      captchaId: 'captcha-refresh',
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
    }));

    render(<App />);
    await userEvent.type(await screen.findByLabelText('账号'), 'operator');
    await userEvent.type(screen.getByLabelText('密码'), 'wrong-password');
    await userEvent.type(screen.getByLabelText('图片验证码'), 'ABCD');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('用户名或密码错误')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized')).not.toBeInTheDocument();
  });


  it('shows a captcha error when the captcha code is wrong', async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockImplementationOnce(async () => jsonResponse({
      captchaId: 'captcha-test',
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
    }));
    fetchMock.mockImplementationOnce(async () => jsonResponse({ message: '验证码不正确，请重新输入', statusCode: 400 }, 400));
    fetchMock.mockImplementationOnce(async () => jsonResponse({
      captchaId: 'captcha-refresh',
      image: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4='
    }));

    render(<App />);
    await userEvent.type(await screen.findByLabelText('账号'), 'operator');
    await userEvent.type(screen.getByLabelText('密码'), 'siyuan@opp1');
    await userEvent.type(screen.getByLabelText('图片验证码'), 'WRONG');
    await userEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('验证码不正确，请重新输入')).toBeInTheDocument();
    expect(screen.queryByText('用户名或密码错误')).not.toBeInTheDocument();
  });


  it('角色权限只展示新功能权限目录并将报价查价作为独立模块', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '系统管理' }));

    expect((await screen.findAllByText('admin')).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: '客户资料' })).not.toBeInTheDocument();
    expect(screen.getAllByText('service').length).toBeGreaterThan(0);
    expect(screen.getAllByText('warehouse').length).toBeGreaterThan(0);
    expect(screen.queryByText('admin123')).not.toBeInTheDocument();
    expect(screen.queryByText('service123')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /角色权限分配/ }));
    expect(screen.getByText('业务部')).toBeInTheDocument();
    expect(screen.getAllByText('仓库收货').length).toBeGreaterThan(0);
    expect(screen.queryByText('客户')).not.toBeInTheDocument();
    expect(screen.queryByText('其他功能权限（保持原有配置）')).not.toBeInTheDocument();
    expect(screen.queryByText('权限项')).not.toBeInTheDocument();
    expect(screen.queryByText('pricing:lookup:view')).not.toBeInTheDocument();
    expect(screen.queryByText('工作台')).not.toBeInTheDocument();
    expect(screen.getByTestId('role-permission-option-grid')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '列设置' })).not.toBeInTheDocument();
    for (const workspace of ['运营工作台', '报价查价', '业务管理', '仓库管理', '市场管理', '客服管理', '物流轨迹管理', '财务管理', '基础资料库', '系统管理']) {
      await user.click(screen.getByRole('tab', { name: workspace }));
      expect(screen.getByTestId('role-permission-option-grid')).toBeInTheDocument();
    }
    await user.click(screen.getByRole('tab', { name: '报价查价' }));
    expect(screen.getAllByText('查价').length).toBeGreaterThan(0);
    expect(screen.getAllByText('价格表管理').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: '业务管理' }));
    expect(screen.getAllByText('业务看板').length).toBeGreaterThan(0);
    expect(screen.getAllByText('录单').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待审核运单').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('tab', { name: '仓库管理' }));
    expect(screen.getAllByText('今日收货').length).toBeGreaterThan(0);
    expect(screen.getAllByText('在仓数据').length).toBeGreaterThan(0);
    expect(screen.getAllByText('待出库').length).toBeGreaterThan(0);
    expect(screen.getAllByText('已出库').length).toBeGreaterThan(0);

    await user.click(screen.getByText('客服'));
    await user.click(screen.getByRole('button', { name: '保存权限' }));

    expect(await screen.findByText('客服权限已保存，RBAC 即时生效')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/system/roles/UG_CUSTOMER_SERVICE/permissions'),
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('shows the site workspace with metrics filters and enable controls', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '系统管理' }));
    await user.click(await screen.findByRole('button', { name: /站点/ }));

    expect(await screen.findByText('站点资料')).toBeInTheDocument();
    expect(screen.getByText('启用站点')).toBeInTheDocument();
    expect(screen.getByText('停用站点')).toBeInTheDocument();
    expect(screen.getAllByText('绑定员工').length).toBeGreaterThan(0);
    expect(screen.getAllByText('站点名称').length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('站点名称筛选'), '武汉');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    expect(await screen.findByText('武汉九域联')).toBeInTheDocument();
    expect(screen.queryByText('漳州思华')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /重\s*置/ }));
    expect(await screen.findByText('漳州思华')).toBeInTheDocument();

    const row = screen.getByText('深圳思远').closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: /停\s*用/ }));
    await user.click(await screen.findByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('深圳思远 已停用')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/sites/site-shenzhen-siyuan/enabled'), expect.objectContaining({ method: 'PUT' }));
  });

  it('maintains role groups and offers enabled groups when creating staff accounts', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '系统管理' }));
    await user.click(await screen.findByRole('button', { name: /用户组/ }));

    expect(await screen.findByText('仓库收货')).toBeInTheDocument();
    expect(screen.getAllByText('市场部').length).toBeGreaterThan(0);
    expect(screen.queryByText('功能后续设计')).not.toBeInTheDocument();
    expect(screen.getByText('启用用户组')).toBeInTheDocument();
    expect(screen.getByText('停用用户组')).toBeInTheDocument();
    expect(screen.getByText('绑定员工数')).toBeInTheDocument();
    expect(screen.getByText('用户组详情')).toBeInTheDocument();
    expect(screen.getByText('基础信息')).toBeInTheDocument();
    expect(screen.getByText('菜单权限')).toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('用户组名称 / 说明'));
    await user.type(screen.getByPlaceholderText('用户组名称 / 说明'), '市场');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    expect(screen.getAllByText('市场部').length).toBeGreaterThan(0);
    expect(screen.queryByText('仓库出货')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /重\s*置/ }));
    expect(await screen.findByText('仓库出货')).toBeInTheDocument();

    await user.click(screen.getAllByText('市场部')[0]);
    expect(screen.getAllByText('处理排货').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /增\s*加/ }));
    let dialog = await screen.findByRole('dialog', { name: '新建用户组' });
    await user.clear(within(dialog).getByLabelText('排序'));
    await user.type(within(dialog).getByLabelText('排序'), '0');
    await user.clear(within(dialog).getByLabelText('用户组名称'));
    await user.type(within(dialog).getByLabelText('用户组名称'), '测试用户组');
    await user.clear(within(dialog).getByLabelText('用户组说明'));
    await user.type(within(dialog).getByLabelText('用户组说明'), '测试说明');
    await user.click(within(dialog).getByRole('button', { name: '创建用户组' }));

    expect(await screen.findByText('测试用户组 已创建')).toBeInTheDocument();
    expect(screen.getAllByText('测试说明').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /用户名/ }));
    expect(await screen.findByText('员工账号管理')).toBeInTheDocument();
    expect(screen.getByText('在职账号')).toBeInTheDocument();
    expect(screen.getByText('停用账号')).toBeInTheDocument();
    expect(screen.getByText('需改密')).toBeInTheDocument();
    expect(screen.getByText('资料未完善')).toBeInTheDocument();
    expect(screen.queryByText('停用保留历史记录；删除需二次确认')).not.toBeInTheDocument();
    expect(screen.getAllByText('最近登录').length).toBeGreaterThan(0);
    expect(screen.getAllByText('姓名 / 部门').length).toBeGreaterThan(0);

    await user.clear(screen.getByLabelText('员工账号关键字'));
    await user.type(screen.getByLabelText('员工账号关键字'), 'finance');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    expect(await screen.findByText('finance')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/staff-accounts?status=ALL&keyword=finance'), expect.anything());
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ }).find((button) => button.textContent === '重置') as HTMLElement);

    await user.click(screen.getByRole('button', { name: /新\s*增/ }));
    dialog = await screen.findByRole('dialog', { name: '新建用户' });
    await user.type(within(dialog).getByLabelText('账户'), 'teststaff');
    await user.click(within(dialog).getByLabelText('部门'));
    await user.click(await screen.findByRole('option', { name: '业务部' }));
    await user.type(within(dialog).getByLabelText('中文名'), '测试员工');
    await user.click(within(dialog).getByLabelText('所属用户组'));
    expect(await screen.findByText('测试用户组')).toBeInTheDocument();
    await user.click(await screen.findByText('测试用户组'));
    await user.click(within(dialog).getByRole('button', { name: '创建用户' }));
    expect(await screen.findByText(/已新建用户 teststaff/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '批量导入' }));
    const staffImportInput = document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement;
    fireEvent.change(staffImportInput, { target: { files: [new File(['bad'], 'bad.xls', { type: 'application/vnd.ms-excel' })] } });
    expect(await screen.findByText('仅支持导入 .xlsx 模板文件')).toBeInTheDocument();

    const workbook = createWorkbook();
    addRowsWorksheet(
      workbook,
      '用户名导入模板',
      [
        ['账户', '密码', '部门', '中文名', '性别', '所属站点', '状态', '所属用户组'],
        ['import001', 'Import@123', '业务部', '导入员工', '女', '', '在职', '测试用户组']
      ]
    );
    const importFile = new File([await writeWorkbookBuffer(workbook)], 'staff-import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    fireEvent.change(staffImportInput, { target: { files: [importFile] } });
    expect(await screen.findByText('导入成功 1 条')).toBeInTheDocument();
    expect(await screen.findByText('import001')).toBeInTheDocument();

    await user.click(screen.getByText('teststaff'));
    await user.click(screen.getByRole('button', { name: /修\s*改/ }));
    dialog = await screen.findByRole('dialog', { name: '修改用户' });
    await user.clear(within(dialog).getByLabelText('中文名'));
    await user.type(within(dialog).getByLabelText('中文名'), '测试员工改');
    await user.click(within(dialog).getByRole('button', { name: '保存用户' }));
    expect(await screen.findByText('teststaff 已更新')).toBeInTheDocument();

    let staffRow = screen.getByText('teststaff').closest('tr') as HTMLElement;
    await user.click(within(staffRow).getByRole('button', { name: /停\s*用/ }));
    await user.click(await screen.findByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('已停用 1 个员工账号')).toBeInTheDocument();

    staffRow = screen.getByText('teststaff').closest('tr') as HTMLElement;
    await user.click(within(staffRow).getByRole('button', { name: /启\s*用/ }));
    await user.click(await screen.findByRole('button', { name: '确认启用' }));
    expect(await screen.findByText('已启用 1 个员工账号')).toBeInTheDocument();

    staffRow = screen.getByText('teststaff').closest('tr') as HTMLElement;
    await user.click(within(staffRow).getByRole('button', { name: /删\s*除/ }));
    await user.click(await screen.findByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('teststaff 已删除')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /用户组/ }));
    await user.click(screen.getAllByText('测试用户组')[0]);
    await user.click(screen.getByRole('button', { name: /修\s*改/ }));
    dialog = await screen.findByRole('dialog', { name: '编辑用户组' });
    await user.clear(within(dialog).getByLabelText('用户组名称'));
    await user.type(within(dialog).getByLabelText('用户组名称'), '测试用户组改');
    await user.click(within(dialog).getByRole('button', { name: '保存用户组' }));
    expect(await screen.findByText('测试用户组改 已更新')).toBeInTheDocument();

    await user.click(screen.getAllByText('测试用户组改')[0]);
    await user.click(screen.getAllByRole('button', { name: /停\s*用/ })[0]);
    await user.click(await screen.findByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('测试用户组改 已停用')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/roles'), expect.objectContaining({ method: 'POST' }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/roles/UG_TEST_'), expect.objectContaining({ method: 'PUT' }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/staff-accounts'), expect.objectContaining({ method: 'POST' }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/staff-accounts/u-teststaff'), expect.objectContaining({ method: 'PUT' }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/staff-accounts/u-teststaff/enabled'), expect.objectContaining({ method: 'PUT' }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/staff-accounts/u-teststaff'), expect.objectContaining({ method: 'DELETE' }));
  });

  it('opens the selected user group in role permissions through the settings route', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '系统管理' }));
    await user.click(await screen.findByRole('button', { name: /用户组/ }));
    const roleRow = screen.getAllByText('市场部')[0].closest('tr') as HTMLElement;
    await user.click(within(roleRow).getByRole('button', { name: '查看权限' }));

    expect(await screen.findByText('角色权限分配')).toBeInTheDocument();
    expect(screen.getByLabelText('市场部权限')).toBeInTheDocument();
    await waitFor(() => expect(window.location.pathname).toBe('/app/settings/role-permissions'));
  });

  it('loads the existing audit log entry and shows before after raw evidence', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '系统管理' }));
    await user.click(await screen.findByRole('button', { name: /操作日志/ }));

    expect(await screen.findByText('今日操作')).toBeInTheDocument();
    expect(screen.getAllByText('基础资料').length).toBeGreaterThan(0);
    expect(screen.getAllByText('修改').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ch-dhl-hk').length).toBeGreaterThan(0);
    expect(screen.getByText('查看财务资料库：结算方式')).toBeInTheDocument();
    expect(screen.getByText('GET /api/finance/catalog?category=SETTLEMENT_METHOD')).toBeInTheDocument();
    expect(screen.getAllByText('成功').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/已记录操作前数据/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/已记录操作后数据/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('IP 地址').length).toBeGreaterThan(0);
    expect(screen.getByText('203.0.113.10')).toBeInTheDocument();
    expect(screen.queryByText('审计详情')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /查看详情/ })[0]);
    const detailDialog = await screen.findByRole('dialog', { name: '审计详情' });
    expect(within(detailDialog).getByText('变更前')).toBeInTheDocument();
    expect(within(detailDialog).getByText('变更后')).toBeInTheDocument();
    expect(within(detailDialog).getByText('原始请求')).toBeInTheDocument();
    expect(within(detailDialog).getAllByText('IP 地址').length).toBeGreaterThan(0);
    expect(within(detailDialog).getAllByText('203.0.113.10').length).toBeGreaterThan(0);
    expect(within(detailDialog).getByText(/"before"/)).toBeInTheDocument();
    expect(within(detailDialog).getByText(/"after"/)).toBeInTheDocument();
    expect(within(detailDialog).getByText(/"actor"/)).toBeInTheDocument();
    await user.click(within(detailDialog).getByRole('button', { name: /关\s*闭/ }));
    expect(screen.getByRole('button', { name: '更多筛选' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '更多筛选' }));
    await user.type(screen.getByPlaceholderText('例如 审核 / 删除'), 'system.');
    await user.click(screen.getByRole('button', { name: /查\s*询/ }));
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/system/audit-logs'), expect.anything());
  });


  it('isolates staff menus by role and keeps operator out of system management', async () => {
    await renderAndLogin('operator', 'operator123');

    expect(screen.getByRole('menuitem', { name: '运营工作台' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '业务管理' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '市场管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '仓库管理' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '物流轨迹管理' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '报价查价' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '基础资料库' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    expect(await screen.findByRole('heading', { name: '基础资料库' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /代理资料/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /代理渠道/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /公司渠道/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '客服管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '财务管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统管理' })).not.toBeInTheDocument();
    expect(screen.queryByText('员工账号管理')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /公司渠道/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /渠道类别/ })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith(expect.stringContaining('/api/system/roles'), expect.anything());

    cleanup();
    localStorage.clear();
    await renderAndLogin('finance', 'finance123');

    expect(screen.getByRole('menuitem', { name: '财务管理' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '仓库管理' })).not.toBeInTheDocument();

    cleanup();
    localStorage.clear();
    await renderAndLogin('warehouse', 'warehouse123');

    expect(screen.getByRole('menuitem', { name: '仓库管理' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '物流轨迹管理' })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '报价查价' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '财务管理' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: '系统管理' })).not.toBeInTheDocument();
  });

  it('defaults new customer ownership to the current salesperson', async () => {
    const user = userEvent.setup();
    await renderAndLogin('operator', 'operator123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));
    await user.click(screen.getByRole('button', { name: '客户资料' }));
    const customerWorkspace = await screen.findByRole('region', { name: '客户资料' });
    await user.click(within(customerWorkspace).getByRole('button', { name: '增加客户' }));
    const dialog = await screen.findByRole('dialog', { name: '新建客户' });

    const salespersonInput = within(dialog).getByLabelText('业务员归属');
    expect(salespersonInput).toHaveValue('operator');
    expect(salespersonInput).toBeDisabled();
    expect(within(dialog).queryByPlaceholderText('例如 mira')).not.toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('客户编号'), '8899');
    await user.type(within(dialog).getByLabelText('客户名称'), 'Operator Customer');
    await user.click(screen.getByRole('button', { name: '创建客户' }));

    expect(await screen.findByText('8899')).toBeInTheDocument();
    expect(await screen.findByText('Operator Customer')).toBeInTheDocument();
    expect(await screen.findByText('已创建客户 8899-Operator Customer，业务员 operator')).toBeInTheDocument();
  });


  it('loads real master data and maintains customers channels fees fuel rates and exchange rates', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(screen.getByRole('menuitem', { name: '基础资料库' }));

    expect(await screen.findByRole('heading', { name: '基础资料库' })).toBeInTheDocument();
    await user.click(await screen.findByRole('button', { name: /财务资料/ }));
    expect(await screen.findByText('基础运费')).toBeInTheDocument();
    expect(screen.getByText('燃油费')).toBeInTheDocument();
    expect(screen.queryByText('月结')).not.toBeInTheDocument();
    await user.click(screen.getByText('结算方式'));
    expect(await screen.findByText('月结')).toBeInTheDocument();
    expect(screen.queryByText('普货')).not.toBeInTheDocument();
    await user.click(screen.getByText('货物类型'));
    expect(await screen.findByText('普货')).toBeInTheDocument();
    expect(screen.queryByText('桌子')).not.toBeInTheDocument();
    await user.click(screen.getByText('品名'));
    expect(await screen.findByText('桌子')).toBeInTheDocument();
    expect(screen.queryByText('功能后续设计')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /客户资料/ }));
    expect(screen.getAllByText('客户资料').length).toBeGreaterThan(0);
    expect(screen.getByText('启用客户')).toBeInTheDocument();
    expect(screen.getByText('缺结算信息')).toBeInTheDocument();
    expect(screen.getAllByText('客户编号').length).toBeGreaterThan(0);
    expect(screen.getAllByText('客户名称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('结算方式').length).toBeGreaterThan(0);
    expect(screen.getAllByText('收货人').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务员归属').length).toBeGreaterThan(0);
    expect(screen.getByText('客户详情')).toBeInTheDocument();
    expect(screen.getAllByText('代理资料').length).toBeGreaterThan(0);
    expect(screen.queryByText('客户、联系人与账号')).not.toBeInTheDocument();
    expect(screen.queryByText('代理、承运商与渠道')).not.toBeInTheDocument();
    expect(screen.queryByText('承运商与渠道')).not.toBeInTheDocument();
    expect(screen.queryByText('费用、燃油与汇率')).not.toBeInTheDocument();
    expect(screen.getAllByText('9409').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Daloday').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /代理资料/ }));
    expect(screen.queryByRole('columnheader', { name: '代理编码' })).not.toBeInTheDocument();
    expect(screen.getAllByText('代理简称').length).toBeGreaterThan(0);
    expect(screen.getAllByText('代理详细公司名').length).toBeGreaterThan(0);
    expect(screen.getAllByText('仓库地址一').length).toBeGreaterThan(0);
    expect(screen.getAllByText('仓库联系人').length).toBeGreaterThan(0);
    expect(screen.getAllByText('发票模板').length).toBeGreaterThan(0);
    expect(screen.getByText('宇环')).toBeInTheDocument();
    expect(screen.getByText('深圳宇环')).toBeInTheDocument();
    expect(screen.getByText('深圳市宝安区宇环仓一')).toBeInTheDocument();
    expect(screen.getByText('宇环仓库')).toBeInTheDocument();
    expect(screen.getByText('宇环发票模板.xlsx')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '增加代理' }));
    const createBankAgentDialog = await screen.findByRole('dialog', { name: '新建代理' });
    expect(within(createBankAgentDialog).getByText('收款方银行信息')).toBeInTheDocument();
    expect(within(createBankAgentDialog).getByRole('button', { name: '上传模板' })).toBeInTheDocument();
    await user.click(within(createBankAgentDialog).getByText('兼容信息'));
    await user.type(within(createBankAgentDialog).getByLabelText('代理编码'), 'JL');
    await user.type(within(createBankAgentDialog).getByLabelText('代理简称'), '鲸链');
    await user.type(within(createBankAgentDialog).getByLabelText('代理详细公司名'), '深圳市鲸链国际物流有限公司');
    await user.type(within(createBankAgentDialog).getByLabelText('收款方'), '深圳市鲸链国际物流有限公司');
    await user.type(within(createBankAgentDialog).getByLabelText('银行账号'), '755972950810001');
    await user.type(within(createBankAgentDialog).getByLabelText('开户银行'), '招商银行深圳福永支行');
    await user.click(screen.getByRole('button', { name: '创建代理' }));
    expect(await screen.findByText('深圳市鲸链国际物流有限公司')).toBeInTheDocument();
    expect(screen.queryByText('代理银行账号')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '修改代理' }));
    const editBankAgentDialog = await screen.findByRole('dialog', { name: '编辑代理' });
    expect(within(editBankAgentDialog).getByLabelText('收款方')).toHaveValue('深圳市鲸链国际物流有限公司');
    expect(within(editBankAgentDialog).getByLabelText('银行账号')).toHaveValue('755972950810001');
    expect(within(editBankAgentDialog).getByLabelText('开户银行')).toHaveValue('招商银行深圳福永支行');
    await user.click(screen.getByRole('button', { name: /取\s*消/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '编辑代理' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /代理渠道/ }));
    expect(screen.getAllByText('代理').length).toBeGreaterThan(0);
    expect(screen.getAllByText('渠道名称').length).toBeGreaterThan(0);
    expect(screen.getByText('宇环 DHL')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /公司渠道/ }));
    expect(screen.getAllByText('业务类型').length).toBeGreaterThan(0);
    expect(screen.getAllByText('渠道类别').length).toBeGreaterThan(0);
    expect(screen.getAllByText('除材积').length).toBeGreaterThan(0);
    expect(screen.getAllByText('多件重量计算方式').length).toBeGreaterThan(0);
    expect(screen.getAllByText('结算重量计算规则').length).toBeGreaterThan(0);
    expect(screen.getByText('DHL HK')).toBeInTheDocument();
    expect(screen.getByText('先累加再比较')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /渠道类别/ }));
    expect(screen.getAllByText('类别名称').length).toBeGreaterThan(0);
    expect(screen.getByText('UPS')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '新增渠道类别' }));
    const createChannelCategoryDialog = await screen.findByRole('dialog', { name: '新建渠道类别' });
    await user.type(within(createChannelCategoryDialog).getByLabelText('类别名称'), '美西卡车');
    await user.click(screen.getByRole('button', { name: '创建渠道类别' }));
    expect(await screen.findByText('美西卡车')).toBeInTheDocument();
    await user.click(screen.getByText('美西卡车'));
    await user.click(screen.getByRole('button', { name: '修改渠道类别' }));
    const editChannelCategoryDialog = await screen.findByRole('dialog', { name: '编辑渠道类别' });
    await user.clear(within(editChannelCategoryDialog).getByLabelText('类别名称'));
    await user.type(within(editChannelCategoryDialog).getByLabelText('类别名称'), '美西卡车改');
    await user.click(screen.getByRole('button', { name: '保存渠道类别' }));
    expect(await screen.findByText('美西卡车改')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /公司渠道/ }));
    await user.click(screen.getByRole('button', { name: '增加公司渠道' }));
    const createCompanyChannelDialog = await screen.findByRole('dialog', { name: '新建公司渠道' });
    await user.type(within(createCompanyChannelDialog).getByLabelText('渠道名称'), '美西海派');
    await user.selectOptions(within(createCompanyChannelDialog).getByLabelText('公司渠道业务类型'), 'DEDICATED_LINE');
    await user.selectOptions(within(createCompanyChannelDialog).getByLabelText('公司渠道类别'), '美西卡车改');
    await user.clear(within(createCompanyChannelDialog).getByLabelText('除材积'));
    await user.type(within(createCompanyChannelDialog).getByLabelText('除材积'), '6000');
    await user.selectOptions(within(createCompanyChannelDialog).getByLabelText('多件重量计算方式'), 'COMPARE_ROUND_THEN_SUM');
    await user.selectOptions(within(createCompanyChannelDialog).getByLabelText('单件重量进位规则'), 'HALF_BELOW_HALF_UP');
    await user.selectOptions(within(createCompanyChannelDialog).getByLabelText('结算重量计算规则'), 'MAX_ACTUAL_VOLUME');
    await user.selectOptions(within(createCompanyChannelDialog).getByLabelText('结算重量进位规则'), 'LARGE_1_SMALL_0_5');
    await user.type(within(createCompanyChannelDialog).getByLabelText('大货起始重量'), '21');
    await user.clear(within(createCompanyChannelDialog).getByLabelText('偏远规则'));
    await user.type(within(createCompanyChannelDialog).getByLabelText('偏远规则'), 'UPS偏远');
    await user.click(screen.getByRole('button', { name: '创建公司渠道' }));
    expect(await screen.findByText('美西海派')).toBeInTheDocument();
    expect((await screen.findAllByText('美西卡车改')).length).toBeGreaterThan(0);
    expect(await screen.findByText('6000')).toBeInTheDocument();
    expect(await screen.findByText('UPS偏远')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /偏远/ }));
    expect((await screen.findAllByText('文件上传')).length).toBeGreaterThan(0);
    const remoteRow = screen.getByText('UPS偏远').closest('tr')!;
    const remoteFileInput = remoteRow.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(remoteFileInput, new File(['remote'], 'ups-remote.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    expect(await screen.findByText('ups-remote.xlsx')).toBeInTheDocument();
    fireEvent.paste(within(remoteRow).getByText('ups-remote.xlsx').closest('.ant-space')!, { clipboardData: { files: [new File(['png'], 'ups-remote.png', { type: 'image/png' })] } });
    expect(await screen.findByText('ups-remote.png')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /汇率/ }));
    expect(screen.getByText('历史汇率:新增')).toBeInTheDocument();
    expect(screen.getByText('历史汇率:列表')).toBeInTheDocument();
    expect(screen.getAllByText('币别').length).toBeGreaterThan(0);
    expect(screen.getAllByText('开始日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('结束日期').length).toBeGreaterThan(0);
    expect(screen.getAllByText('当前汇率').length).toBeGreaterThan(0);
    expect(screen.getAllByText('USD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('美金').length).toBeGreaterThan(0);
    await user.selectOptions(screen.getByLabelText('汇率币别'), 'EUR');
    await user.clear(screen.getByLabelText('开始日期'));
    await user.type(screen.getByLabelText('开始日期'), '2026-03-01');
    await user.clear(screen.getByLabelText('结束日期'));
    await user.type(screen.getByLabelText('结束日期'), '2026-06-30');
    await user.clear(screen.getByLabelText('历史汇率值'));
    await user.type(screen.getByLabelText('历史汇率值'), '7.8');
    await user.click(screen.getByRole('button', { name: '新增历史汇率' }));
    expect((await screen.findAllByText('EUR')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('欧元').length).toBeGreaterThan(0);
    expect(screen.getAllByText('7.8').length).toBeGreaterThan(0);
    const eurRow = screen.getAllByText('欧元')
      .map((node) => node.closest('tr'))
      .find((row): row is HTMLTableRowElement => Boolean(row && within(row).queryByRole('button', { name: '修改' })))!;
    await user.click(within(eurRow).getByRole('button', { name: '修改' }));
    await user.clear(screen.getByLabelText('历史汇率值'));
    await user.type(screen.getByLabelText('历史汇率值'), '7.9');
    await user.click(screen.getByRole('button', { name: '保存修改历史汇率' }));
    expect((await screen.findAllByText('7.9')).length).toBeGreaterThan(0);
    const updatedEurRow = screen.getAllByText('欧元')
      .map((node) => node.closest('tr'))
      .find((row): row is HTMLTableRowElement => Boolean(row && within(row).queryByRole('button', { name: '停用' })))!;
    await user.click(within(updatedEurRow).getByRole('button', { name: '停用' }));
    expect(await screen.findByText('确认停用该汇率？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('EUR 汇率已停用')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /公司渠道/ }));
    await user.click(screen.getByText('美西海派'));
    await user.click(screen.getByRole('button', { name: '修改公司渠道' }));
    const editCompanyChannelDialog = await screen.findByRole('dialog', { name: '编辑公司渠道' });
    await user.clear(within(editCompanyChannelDialog).getByLabelText('渠道名称'));
    await user.type(within(editCompanyChannelDialog).getByLabelText('渠道名称'), '美西海派改');
    await user.selectOptions(within(editCompanyChannelDialog).getByLabelText('结算重量计算规则'), 'ACTUAL_ONLY');
    await user.clear(within(editCompanyChannelDialog).getByLabelText('偏远规则'));
    await user.type(within(editCompanyChannelDialog).getByLabelText('偏远规则'), '无偏远');
    await user.click(screen.getByRole('button', { name: '保存公司渠道' }));
    expect(await screen.findByText('美西海派改')).toBeInTheDocument();
    expect(await screen.findByText('取实重不计材积')).toBeInTheDocument();
    await user.click(screen.getByText('美西海派改'));
    await user.click(screen.getByRole('button', { name: '删除公司渠道' }));
    expect(await screen.findByText('确认删除该公司渠道？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('美西海派改 已删除')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /渠道类别/ }));
    await user.click(screen.getByText('美西卡车改'));
    await user.click(screen.getByRole('button', { name: '删除渠道类别' }));
    expect(await screen.findByText('确认删除该渠道类别？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('美西卡车改 已删除')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /公司渠道/ }));
    expect(screen.queryByText('美西卡车改')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '增加公司渠道' }));
    const createCompanyChannelAfterDisableDialog = await screen.findByRole('dialog', { name: '新建公司渠道' });
    const disabledCategoryOptions = Array.from(within(createCompanyChannelAfterDisableDialog).getByLabelText('公司渠道类别').querySelectorAll('option')).map((option) => option.value);
    expect(disabledCategoryOptions).not.toContain('美西卡车改');
    await user.click(screen.getByRole('button', { name: /取\s*消/ }));

    await user.click(screen.getByRole('button', { name: /客户资料/ }));
    await user.click(screen.getByRole('button', { name: '增加客户' }));
    let createCustomerDialog = await screen.findByRole('dialog', { name: '新建客户' });
    await user.type(within(createCustomerDialog).getByLabelText('客户编号'), '1399');
    await user.type(within(createCustomerDialog).getByLabelText('客户名称'), '小慧子');
    await user.click(screen.getByRole('button', { name: /取\s*消/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '新建客户' })).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '增加客户' }));
    createCustomerDialog = await screen.findByRole('dialog', { name: '新建客户' });
    expect(within(createCustomerDialog).getByLabelText('客户编号')).toHaveValue('');
    expect(within(createCustomerDialog).getByLabelText('客户名称')).toHaveValue('');
    expect(within(createCustomerDialog).getByLabelText('结算方式')).toHaveValue('RMB月结');
    expect(within(createCustomerDialog).getByLabelText('业务员归属')).toHaveValue('admin');
    expect(within(createCustomerDialog).getByLabelText('业务员归属')).toBeEnabled();
    await user.type(within(createCustomerDialog).getByLabelText('客户编号'), '8888');
    await user.type(within(createCustomerDialog).getByLabelText('客户名称'), 'Mira Logistics');
    await user.type(within(createCustomerDialog).getByLabelText('客户来源'), '展会');
    await user.click(screen.getByRole('button', { name: '创建客户' }));
    expect((await screen.findAllByText('8888')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Mira Logistics')).toBeInTheDocument();
    expect(await screen.findByText('展会')).toBeInTheDocument();
    expect(screen.getAllByText('RMB月结').length).toBeGreaterThan(0);
    expect((await screen.findAllByText('admin')).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '新建客户' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: '编辑客户' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '删除客户' })).toBeEnabled();

    await user.type(screen.getByLabelText('客户编号筛选'), '8888');
    expect(screen.getAllByText('9409').length).toBeGreaterThan(0);
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ })[0]);
    expect(screen.getAllByText('8888').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('9409')).toHaveLength(0);
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ })[0]);
    expect((await screen.findAllByText('9409')).length).toBeGreaterThan(0);

    await user.click(screen.getAllByText('8888')[0]);
    await user.click(screen.getByRole('button', { name: '新增收货人' }));
    const createContactDialog = await screen.findByRole('dialog', { name: '8888-Mira Logistics 新增收货人' });
    await user.type(within(createContactDialog).getByLabelText('收货人名称'), 'Mira Receiver');
    await user.type(within(createContactDialog).getByLabelText('收货人公司名称'), 'Mira Receiver LLC');
    await user.type(within(createContactDialog).getByLabelText('收货人电话'), '13900008888');
    await user.type(within(createContactDialog).getByLabelText('FBA仓库代码'), 'ONT8');
    await user.type(within(createContactDialog).getByLabelText('收货人地址'), '8888 Receiver Street');
    await user.type(within(createContactDialog).getByLabelText('国家'), 'US');
    await user.click(screen.getByRole('button', { name: '保存收货人' }));
    expect(await screen.findByText('Mira Receiver')).toBeInTheDocument();
    expect(await screen.findByText('8888 Receiver Street')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '8888-Mira Logistics 新增收货人' })).not.toBeInTheDocument());
    const contactRow = screen.getByText('Mira Receiver').closest('tr');
    expect(contactRow).not.toBeNull();
    await user.click(within(contactRow as HTMLElement).getByRole('button', { name: '修改' }));
    const editContactDialog = await screen.findByRole('dialog', { name: '编辑收货人' });
    await user.clear(within(editContactDialog).getByLabelText('收货人电话'));
    await user.type(within(editContactDialog).getByLabelText('收货人电话'), '13900009999');
    await user.click(screen.getByRole('button', { name: '保存收货人' }));
    expect(await screen.findByText('13900009999')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '编辑收货人' })).not.toBeInTheDocument());
    const updatedContactRow = screen.getByText('Mira Receiver').closest('tr');
    expect(updatedContactRow).not.toBeNull();
    await user.click(within(updatedContactRow as HTMLElement).getByRole('button', { name: '停用' }));
    expect(await screen.findByText('确认停用该收货人？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('Mira Receiver 已停用')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('Mira Receiver')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '编辑客户' }));
    const editCustomerDialog = await screen.findByRole('dialog', { name: '编辑客户' });
    await user.clear(within(editCustomerDialog).getByLabelText('客户名称'));
    await user.type(within(editCustomerDialog).getByLabelText('客户名称'), 'Mira CN');
    await user.click(screen.getByRole('button', { name: '保存客户' }));
    expect((await screen.findAllByText('Mira CN')).length).toBeGreaterThan(0);
    await user.click(screen.getAllByText('8888')[0]);
    const customerBatchBar = screen.getByText(/已选择\s+1\s+项/).closest('div');
    expect(customerBatchBar).not.toBeNull();
    await user.click(within(customerBatchBar as HTMLElement).getByRole('button', { name: /停\s*用/ }));
    expect(await screen.findByText('确认停用该客户？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认停用' }));
    expect(await screen.findByText('8888-Mira CN 已停用')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('确认停用该客户？')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: '删除客户' }));
    expect(await screen.findByText('删除客户资料')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('8888-Mira CN 已删除')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '客户列表设置' }));
    expect(await screen.findByRole('dialog', { name: '客户列表设置' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确\s*定/ }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '客户列表设置' })).not.toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /代理资料/ }));
    await user.click(screen.getByText('宇环'));
    expect(screen.queryByText('宇环 银行账号')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '增加代理' }));
    const createAgentDialog = await screen.findByRole('dialog', { name: '新建代理' });
    await user.click(within(createAgentDialog).getByText('兼容信息'));
    await user.type(within(createAgentDialog).getByLabelText('代理编码'), 'SZJST');
    await user.type(within(createAgentDialog).getByLabelText('代理简称'), '加时特');
    await user.type(within(createAgentDialog).getByLabelText('代理详细公司名'), '深圳加时特');
    await user.type(within(createAgentDialog).getByLabelText('仓库地址一'), '深圳市龙岗区一号仓');
    await user.type(within(createAgentDialog).getByLabelText('仓库地址二'), '深圳市龙岗区二号仓');
    await user.type(within(createAgentDialog).getByLabelText('仓库地址三'), '深圳市龙岗区三号仓');
    await user.type(within(createAgentDialog).getByLabelText('仓库联系人'), '加时特仓库');
    fireEvent.change(within(createAgentDialog).getByLabelText('查询网站'), { target: { value: 'https://track.jst.example?no={transferNo}' } });
    await user.type(within(createAgentDialog).getByLabelText('发票模板名称'), '加时特发票模板.xlsx');
    await user.type(within(createAgentDialog).getByLabelText('上传点'), '/templates/jst-invoice.xlsx');
    await user.click(screen.getByRole('button', { name: '创建代理' }));
    expect(await screen.findByText('加时特')).toBeInTheDocument();
    expect(await screen.findByText('深圳加时特')).toBeInTheDocument();
    expect(await screen.findByText('深圳市龙岗区一号仓')).toBeInTheDocument();
    expect(await screen.findByText('加时特仓库')).toBeInTheDocument();
    expect(await screen.findByText('https://track.jst.example?no={transferNo}')).toBeInTheDocument();
    expect(await screen.findByText('加时特发票模板.xlsx')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '增加代理' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '修改代理' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '删除代理' })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /代理渠道/ }));
    await user.click(screen.getByRole('button', { name: '增加代理渠道' }));
    const createAgentChannelDialog = await screen.findByRole('dialog', { name: '新建代理渠道' });
    await user.selectOptions(within(createAgentChannelDialog).getByLabelText('代理渠道所属代理'), 'a-SZJST');
    await user.type(within(createAgentChannelDialog).getByLabelText('渠道名称'), '加时特 DHL');
    await user.click(screen.getByRole('button', { name: '创建代理渠道' }));
    expect(await screen.findByText('加时特 DHL')).toBeInTheDocument();
    expect((await screen.findAllByText('加时特')).length).toBeGreaterThan(0);

    await user.type(screen.getByLabelText('代理渠道名称筛选'), '加时特 DHL');
    expect(screen.getByText('宇环 DHL')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    expect(screen.getByText('加时特 DHL')).toBeInTheDocument();
    expect(screen.queryByText('宇环 DHL')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ }).at(-1)!);
    expect(await screen.findByText('宇环 DHL')).toBeInTheDocument();

    await user.click(screen.getByText('加时特 DHL'));
    await user.click(screen.getByRole('button', { name: '修改代理渠道' }));
    const editAgentChannelDialog = await screen.findByRole('dialog', { name: '编辑代理渠道' });
    await user.clear(within(editAgentChannelDialog).getByLabelText('渠道名称'));
    await user.type(within(editAgentChannelDialog).getByLabelText('渠道名称'), '加时特 UPS');
    await user.click(screen.getByRole('button', { name: '保存代理渠道' }));
    expect(await screen.findByText('加时特 UPS')).toBeInTheDocument();
    await user.click(screen.getByText('加时特 UPS'));
    await user.click(screen.getByRole('button', { name: '删除代理渠道' }));
    expect(await screen.findByText('确认删除该代理渠道？')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认删除' }));
    expect(await screen.findByText('加时特 UPS 已删除')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /代理资料/ }));
    await user.type(screen.getByLabelText('代理详细公司名筛选'), '深圳加时特');
    expect(screen.getByText('深圳宇环')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /查\s*询/ }).at(-1)!);
    expect(screen.getByText('深圳加时特')).toBeInTheDocument();
    expect(screen.queryByText('深圳宇环')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: /重\s*置/ }).at(-1)!);
    expect(await screen.findByText('深圳宇环')).toBeInTheDocument();

    await user.click(screen.getByText('深圳加时特'));
    await user.click(screen.getByRole('button', { name: '修改代理' }));
    const editAgentDialog = await screen.findByRole('dialog', { name: '编辑代理' });
    await user.clear(within(editAgentDialog).getByLabelText('代理简称'));
    await user.type(within(editAgentDialog).getByLabelText('代理简称'), '加时特华南');
    await user.clear(within(editAgentDialog).getByLabelText('查询网站'));
    fireEvent.change(within(editAgentDialog).getByLabelText('查询网站'), { target: { value: 'https://track.jst.example/detail/{transferNo}' } });
    await user.click(screen.getByRole('button', { name: '保存代理' }));
    expect(await screen.findByText('加时特华南')).toBeInTheDocument();
    expect(await screen.findByText('https://track.jst.example/detail/{transferNo}')).toBeInTheDocument();
    await user.click(screen.getByText('加时特华南'));
    await user.click(screen.getByRole('button', { name: '删除代理' }));
    expect(await screen.findByText('确认物理删除选中的 1 条代理资料？删除后不可恢复。')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '确认物理删除 1 条' }));
    expect(await screen.findByText('已物理删除 1 条代理资料')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '代理列表设置' }));
    expect(await screen.findByRole('dialog', { name: '代理列表设置' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /确\s*定/ }));
  }, 10000);


  it('个人中心不展示登录日志和账号事件，保留个人资料修改和修改密码', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    await renderAndLogin('admin', 'admin123');

    await user.click(await screen.findByRole('button', { name: '个人中心' }));

    const dialog = await screen.findByRole('dialog', { name: '个人中心' });
    expect(within(dialog).getByText('员工账号')).toBeInTheDocument();
    expect(within(dialog).getByText('管理员组')).toBeInTheDocument();
    expect(within(dialog).queryByText('账号事件')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('登录日志')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('127.0.0.1')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/auth/login-logs'))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/auth/account-events'))).toBe(false);
    expect(await within(dialog).findByText('账号资料')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: '保存个人资料' })).toBeInTheDocument();
    expect(within(dialog).getByText('修改密码')).toBeInTheDocument();
    expect(within(dialog).queryByText('service')).not.toBeInTheDocument();

    await user.clear(within(dialog).getByLabelText('姓名'));
    await user.type(within(dialog).getByLabelText('姓名'), '系统管理员新名');
    await user.click(within(dialog).getByRole('button', { name: '保存个人资料' }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/profile'),
      expect.objectContaining({ method: 'PUT' })
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('/api/auth/account-events'))).toBe(false);

    await user.type(within(dialog).getByLabelText('当前密码'), 'admin123');
    await user.type(within(dialog).getByLabelText('新密码'), 'Newpass@123');
    await user.type(within(dialog).getByLabelText('确认新密码'), 'Newpass@123');
    await user.click(within(dialog).getByRole('button', { name: '保存新密码' }));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/change-password'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(await screen.findByRole('heading', { name: '登录工作台' })).toBeInTheDocument();
  });

  it('blocks first-login users until they save a new password', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.mocked(fetch);
    await renderAndLogin('firstlogin', 'firstlogin@123');

    const dialog = await screen.findByRole('dialog', { name: '首次登录需要修改密码' });
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/master-data'))).toBe(false);

    await user.type(within(dialog).getByLabelText('当前密码'), 'firstlogin@123');
    await user.type(within(dialog).getByLabelText('新密码'), '1qaz@WSX#');
    await user.type(within(dialog).getByLabelText('确认新密码'), '1qaz@WSX#');
    await user.click(within(dialog).getByRole('button', { name: '保存新密码并进入系统' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '首次登录需要修改密码' })).not.toBeInTheDocument();
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/change-password'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/api/master-data'))).toBe(true);
  });


  it('confirms employee logout before returning to login', async () => {
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    await user.click(await screen.findByRole('button', { name: '退出登录' }));

    expect(screen.getByRole('dialog', { name: '确认退出登录' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '登录工作台' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '确认退出' }));

    expect(await screen.findByRole('heading', { name: '登录工作台' })).toBeInTheDocument();
  });

});
