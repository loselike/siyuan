import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderAndLogin } from '../testSupport/appTestHarness';

describe('staff route navigation characterization', () => {
  it('keeps primary navigation and popstate synchronized with the active menu and URL', async () => {
    globalThis.history.replaceState(null, '', '/app/workspace/shipment-pool');
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    const pricingMenu = await screen.findByRole('menuitem', { name: '报价查价' });
    await user.click(pricingMenu);
    await waitFor(() => {
      expect(globalThis.location.pathname).toBe('/app/pricing');
      expect(pricingMenu).toHaveClass('is-active');
    });

    globalThis.history.replaceState(null, '', '/app/workspace/shipment-pool');
    fireEvent.popState(globalThis.window);
    await waitFor(() => {
      expect(screen.getByRole('menuitem', { name: '运营工作台' })).toHaveClass('is-active');
    });
  });

  it('keeps an unauthorized direct URL on the existing replace fallback and notice', async () => {
    globalThis.history.replaceState(null, '', '/app/finance/pending-payment');

    await renderAndLogin('service', 'service123');

    await waitFor(() => expect(globalThis.location.pathname).toBe('/app/customer-service'));
    expect(screen.queryByRole('menuitem', { name: '财务管理' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: '客服管理' })).toHaveClass('is-active');
  });
});
