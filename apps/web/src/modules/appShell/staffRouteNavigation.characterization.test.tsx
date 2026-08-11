import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

  it('preserves sidebar directory, secondary link, modifier click, and brand navigation behavior', async () => {
    globalThis.history.replaceState(null, '', '/app/workspace/shipment-pool');
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    const pricingMenu = await screen.findByRole('menuitem', { name: '报价查价' });
    await user.click(pricingMenu);
    const pricingSubNav = await screen.findByRole('group', { name: '报价查价二级功能' });
    const priceBooksLink = within(pricingSubNav).getByRole('button', { name: '价格表管理' });
    expect(priceBooksLink).toHaveAttribute('href', '/app/pricing/price-books');

    await user.click(pricingMenu);
    expect(screen.queryByRole('group', { name: '报价查价二级功能' })).not.toBeInTheDocument();
    expect(globalThis.location.pathname).toBe('/app/pricing');
    await user.click(pricingMenu);
    const reopenedSubNav = await screen.findByRole('group', { name: '报价查价二级功能' });
    const reopenedPriceBooksLink = within(reopenedSubNav).getByRole('button', { name: '价格表管理' });

    let applicationPreventedModifierClick: boolean | undefined;
    const observeModifierClick = (event: globalThis.MouseEvent) => {
      applicationPreventedModifierClick = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener('click', observeModifierClick);
    fireEvent.click(reopenedPriceBooksLink, { ctrlKey: true });
    document.removeEventListener('click', observeModifierClick);
    expect(applicationPreventedModifierClick).toBe(false);
    expect(globalThis.location.pathname).toBe('/app/pricing');

    await user.click(reopenedPriceBooksLink);
    await waitFor(() => expect(globalThis.location.pathname).toBe('/app/pricing/price-books'));

    await user.click(screen.getByRole('button', { name: '返回运营工作台' }));
    await waitFor(() => expect(globalThis.location.pathname).toBe('/app/workspace/shipment-pool'));
    expect(screen.getByRole('menuitem', { name: '运营工作台' })).toHaveClass('is-active');
  });

  it('preserves the sidebar brand, information hierarchy, and unread presentation', async () => {
    globalThis.history.replaceState(null, '', '/app/workspace/shipment-pool');
    const user = userEvent.setup();
    await renderAndLogin('admin', 'admin123');

    const brandButton = screen.getByRole('button', { name: '返回运营工作台' });
    expect(within(brandButton).getByAltText('Green Cargo 思远物流标识')).toHaveAttribute('src', '/green-cargo-logo.png');
    expect(within(brandButton).getByText('思远物流')).toBeInTheDocument();
    expect(within(brandButton).getByText('AI TMS / OMS')).toBeInTheDocument();
    expect(screen.getByText('AI 助手在线')).toBeInTheDocument();

    const customerServiceMenu = screen.getByRole('menuitem', { name: '客服管理' });
    const collapsedUnreadDot = customerServiceMenu.querySelector('.side-nav-unread-dot');
    expect(collapsedUnreadDot).toHaveAttribute('title', '3 条未读变化');
    expect(customerServiceMenu).not.toHaveAttribute('aria-expanded');

    await user.click(customerServiceMenu);
    const customerServiceSubNav = await screen.findByRole('group', { name: '客服管理二级功能' });
    expect(customerServiceMenu).toHaveAttribute('aria-expanded', 'true');
    expect(customerServiceMenu.querySelector('.side-nav-unread-dot')).toBeNull();
    const pendingRoutingLink = within(customerServiceSubNav).getByRole('button', { name: '待排货' });
    expect(within(pendingRoutingLink).getByText('1')).toHaveAttribute('title', '1 条未读变化');
  });
});
