import { describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../prisma.service.js';
import { PrismaMasterDataReadRepository } from './master-data-read.repository.js';

function prismaStub() {
  const findMany = () => vi.fn().mockResolvedValue([]);
  return {
    customer: { findMany: findMany() },
    customerContact: { findMany: findMany() },
    user: { findMany: findMany() },
    carrier: { findMany: findMany() },
    channel: { findMany: findMany() },
    channelCategory: { findMany: findMany() },
    role: { findMany: findMany() },
    agent: { findMany: findMany() },
    agentChannel: { findMany: findMany() },
    surcharge: { findMany: findMany() },
    fuelRate: { findMany: findMany() },
    exchangeRate: { findMany: findMany() }
  };
}

describe('PrismaMasterDataReadRepository', () => {
  it('keeps the full legacy snapshot query plan by default', async () => {
    const prisma = prismaStub();
    const repository = new PrismaMasterDataReadRepository(prisma as unknown as PrismaService);

    await expect(repository.getSnapshot()).resolves.toEqual({
      customers: [], contacts: [], customerUsers: [], agents: [], agentChannels: [], carriers: [],
      channelCategories: [], channels: [], surcharges: [], fuelRates: [], exchangeRates: [], roles: []
    });

    expect(prisma.user.findMany).toHaveBeenCalledTimes(2);
    for (const [model, repository] of Object.entries(prisma)) {
      if (model !== 'user') expect(repository.findMany).toHaveBeenCalledTimes(1);
    }
  });

  it('skips unauthorized collections and pushes the existing salesperson scope into Prisma', async () => {
    const prisma = prismaStub();
    const repository = new PrismaMasterDataReadRepository(prisma as unknown as PrismaService);

    await expect(repository.getSnapshot({
      customers: true,
      customerSalespeople: ['R-sales', '业务员昵称'],
      financeCatalog: false,
      agents: false,
      agentChannels: false,
      channels: true,
      channelCategories: true,
      exchangeRates: true
    })).resolves.toEqual({
      customers: [], contacts: [], customerUsers: [], agents: [], agentChannels: [], carriers: [],
      channelCategories: [], channels: [], surcharges: [], fuelRates: [], exchangeRates: [], roles: []
    });

    const customerWhere = { salesperson: { in: ['R-sales', '业务员昵称'] } };
    expect(prisma.customer.findMany).toHaveBeenCalledWith({ where: customerWhere, orderBy: { code: 'asc' } });
    expect(prisma.customerContact.findMany).toHaveBeenCalledWith({
      where: { customer: customerWhere }, include: { customer: true }, orderBy: { name: 'asc' }
    });
    expect(prisma.user.findMany).toHaveBeenNthCalledWith(1, {
      where: { customerId: { not: null }, role: { name: 'CUSTOMER' }, customer: customerWhere },
      include: { customer: true }, orderBy: { username: 'asc' }
    });
    expect(prisma.agent.findMany).not.toHaveBeenCalled();
    expect(prisma.agentChannel.findMany).not.toHaveBeenCalled();
    expect(prisma.surcharge.findMany).not.toHaveBeenCalled();
    expect(prisma.fuelRate.findMany).not.toHaveBeenCalled();
    expect(prisma.channel.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.exchangeRate.findMany).toHaveBeenCalledTimes(1);
  });

  it('avoids channel reads when neither channels nor fuel rates can be returned', async () => {
    const prisma = prismaStub();
    const repository = new PrismaMasterDataReadRepository(prisma as unknown as PrismaService);

    await repository.getSnapshot({ channels: false, financeCatalog: false });

    expect(prisma.channel.findMany).not.toHaveBeenCalled();
    expect(prisma.surcharge.findMany).not.toHaveBeenCalled();
    expect(prisma.fuelRate.findMany).not.toHaveBeenCalled();
  });
});
