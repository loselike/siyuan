import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StaffSidebar, type StaffSidebarProps } from './StaffSidebar';

function createProps(overrides: Partial<StaffSidebarProps> = {}): StaffSidebarProps {
  return {
    activeSectionKey: 'priceBooks',
    currentMenuKey: 'pricing',
    expandedMenuKey: 'pricing',
    items: [
      { key: 'workspace', icon: <span>W</span>, label: '运营工作台' },
      { key: 'pricing', icon: <span>P</span>, label: '报价查价' }
    ],
    navigationUnreadBadges: [
      { moduleKey: 'pricing', unreadCount: 3 },
      { moduleKey: 'pricing', sectionKey: 'priceBooks', unreadCount: 1_200 }
    ],
    sidebarSubNav: {
      parentKey: 'pricing',
      items: [
        { key: 'quote', label: '查价' },
        { key: 'priceBooks', label: '价格表管理' }
      ],
      activeKey: 'priceBooks',
      onChange: vi.fn(),
      signature: 'quote:查价:|priceBooks:价格表管理:'
    },
    onBrandClick: vi.fn(),
    onPrimaryMenuClick: vi.fn((event) => event.preventDefault()),
    onSecondaryMenuClick: vi.fn((event) => event.preventDefault()),
    ...overrides
  };
}

describe('StaffSidebar', () => {
  it('preserves brand, stable links, active state, unread formatting, and click delegation', () => {
    const props = createProps();
    const { rerender } = render(<StaffSidebar {...props} />);

    const brandButton = screen.getByRole('button', { name: '返回运营工作台' });
    expect(within(brandButton).getByAltText('Green Cargo 思远物流标识')).toHaveAttribute('src', '/green-cargo-logo.png');
    expect(screen.getByText('AI 助手在线')).toBeInTheDocument();

    const pricingMenu = screen.getByRole('menuitem', { name: '报价查价' });
    expect(pricingMenu).toHaveAttribute('href', '/app/pricing');
    expect(pricingMenu).toHaveClass('is-active');
    expect(pricingMenu).toHaveAttribute('aria-expanded', 'true');
    expect(pricingMenu.querySelector('.side-nav-unread-dot')).toBeNull();

    const priceBooksLink = screen.getByRole('button', { name: '价格表管理' });
    expect(priceBooksLink).toHaveAttribute('href', '/app/pricing/price-books');
    expect(priceBooksLink).toHaveClass('is-active');
    expect(priceBooksLink).toHaveAttribute('aria-current', 'page');
    expect(within(priceBooksLink).getByText('999+')).toHaveAttribute('title', '999+ 条未读变化');

    fireEvent.click(pricingMenu);
    expect(props.onPrimaryMenuClick).toHaveBeenCalledWith(expect.any(Object), 'pricing');
    fireEvent.click(priceBooksLink);
    expect(props.onSecondaryMenuClick).toHaveBeenCalledWith(expect.any(Object), 'pricing', 'priceBooks');
    fireEvent.click(brandButton);
    expect(props.onBrandClick).toHaveBeenCalledOnce();

    rerender(<StaffSidebar {...props} expandedMenuKey={null} />);
    expect(screen.getByRole('menuitem', { name: '报价查价' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('menuitem', { name: '报价查价' }).querySelector('.side-nav-unread-dot')).toHaveAttribute('title', '3 条未读变化');
    expect(screen.queryByRole('group', { name: '报价查价二级功能' })).not.toBeInTheDocument();
  });
});
