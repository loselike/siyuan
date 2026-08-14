import { StreamableFile } from '@nestjs/common';
import type { MarkupRouteListQuery, PriceBookRowsQuery } from '@siyuan/shared';
import { describe, expect, it, vi } from 'vitest';
import { PriceBookQueryController } from './price-book-query.controller.js';
import type { Principal } from '../../rbac.js';

const principal: Principal = { id: 'admin-1', username: 'admin', role: 'ADMIN' };

function createController() {
  const repository = {
    getPriceBookRuleRefreshProgress: vi.fn().mockResolvedValue({ running: false }),
    getPriceBookRows: vi.fn().mockResolvedValue({ rows: [], pagination: { page: 1, pageSize: 20, totalItems: 0 } }),
    getMarkupRoutes: vi.fn().mockResolvedValue({ rows: [], pagination: { page: 1, pageSize: 20, totalItems: 0 } }),
    downloadPriceBook: vi.fn().mockResolvedValue({ fileName: '报价表.xlsm', buffer: Buffer.from('xlsx') })
  };
  return {
    repository,
    controller: new PriceBookQueryController(repository as never, {} as never)
  };
}

describe('PriceBookQueryController', () => {
  it('preserves the rule-refresh and row query repository contracts', async () => {
    const { controller, repository } = createController();
    const query = { page: 2, pageSize: 50, agentName: '测试代理' } as PriceBookRowsQuery;
    const markupQuery = { page: 3, pageSize: 10, channelName: '空运' } as MarkupRouteListQuery;

    await controller.priceBookRuleRefreshProgress({ user: principal });
    await controller.priceBookRows({ user: principal }, query);
    await controller.priceBookRowsByBook({ user: principal }, 'book-1', query);
    await controller.markupRoutesByBook({ user: principal }, 'book-1', markupQuery);

    expect(repository.getPriceBookRuleRefreshProgress).toHaveBeenCalledWith(principal);
    expect(repository.getPriceBookRows).toHaveBeenNthCalledWith(1, principal, undefined, query);
    expect(repository.getPriceBookRows).toHaveBeenNthCalledWith(2, principal, 'book-1', query);
    expect(repository.getMarkupRoutes).toHaveBeenCalledWith(principal, 'book-1', markupQuery);
  });

  it('preserves price-book download headers and stream response', async () => {
    const { controller, repository } = createController();
    const response = { setHeader: vi.fn() };

    const result = await controller.downloadPriceBook({ user: principal }, 'book-1', response as never);

    expect(repository.downloadPriceBook).toHaveBeenCalledWith(principal, 'book-1');
    expect(response.setHeader).toHaveBeenNthCalledWith(1, 'Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.setHeader).toHaveBeenNthCalledWith(2, 'Content-Length', '4');
    expect(response.setHeader).toHaveBeenNthCalledWith(3, 'Content-Disposition', 'attachment; filename="price-book.xlsm"; filename*=UTF-8\'\'%E6%8A%A5%E4%BB%B7%E8%A1%A8.xlsm');
    expect(result).toBeInstanceOf(StreamableFile);
  });
});
