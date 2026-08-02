import { Button } from 'antd';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  ModuleSubNavContext,
  ModuleSubWorkspace,
  type ModuleSubNavContextValue,
  type SidebarSubNavState
} from './ModuleSubWorkspace';

function DynamicCallbackHarness({ children }: { children: ReactNode }) {
  const [activeKey, setActiveKey] = useState('overview');
  const [registeredState, setRegisteredState] = useState<Omit<SidebarSubNavState, 'parentKey' | 'signature'> | null>(null);
  const register = useCallback((state: Omit<SidebarSubNavState, 'parentKey' | 'signature'>) => {
    setRegisteredState(state);
  }, []);
  const context = useMemo<ModuleSubNavContextValue>(() => ({
    parentKey: 'workspace',
    routeKey: 'workspace:',
    resolveSectionKey: () => undefined,
    navigateToSection: () => undefined,
    register,
    clear: () => setRegisteredState(null)
  }), [register]);

  return (
    <ModuleSubNavContext.Provider value={context}>
      <span data-testid="registration-count">{registeredState ? 'registered' : 'empty'}</span>
      <span data-testid="active-key">{activeKey}</span>
      {registeredState ? <Button onClick={() => registeredState.onChange('productMap')}>打开产品地图</Button> : null}
      <ModuleSubWorkspace
        items={[
          { key: 'overview', label: '概览' },
          { key: 'productMap', label: '产品地图' }
        ]}
        activeKey={activeKey}
        onChange={(key) => setActiveKey(key)}
      >
        {children}
      </ModuleSubWorkspace>
    </ModuleSubNavContext.Provider>
  );
}

describe('ModuleSubWorkspace', () => {
  it('does not repeatedly register when the parent passes a new onChange callback each render', async () => {
    const user = userEvent.setup();
    render(<DynamicCallbackHarness><div>工作区内容</div></DynamicCallbackHarness>);

    await waitFor(() => expect(screen.getByTestId('registration-count')).toHaveTextContent('registered'));
    expect(screen.getByTestId('active-key')).toHaveTextContent('overview');

    await user.click(screen.getByRole('button', { name: '打开产品地图' }));
    await waitFor(() => expect(screen.getByTestId('active-key')).toHaveTextContent('productMap'));
  });
});
