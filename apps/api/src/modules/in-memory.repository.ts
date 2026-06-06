import { Injectable } from '@nestjs/common';
import type { Shipment } from '@siyuan/shared';
import type { Principal, RoleKey } from './rbac.js';

interface Account extends Principal {
  password: string;
}

@Injectable()
export class InMemoryRepository {
  private readonly shipments: Shipment[] = [
    {
      id: 'SYGJ06059409051',
      createdAt: '2026-06-05 15:37',
      customerName: '9409-Daloday',
      customerOrderNo: 'DAL-0605-AU',
      systemOrderNo: 'SYGJ06059409051',
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry: '澳大利亚',
      carrier: 'FEDEX',
      packageCount: 4,
      receivableWeightKg: 56,
      agentWeightKg: 56,
      latestTracking: '收货扫描',
      trackingStaleDays: 1,
      isRemoteArea: false,
      status: 'WAITING_SORT',
      channelName: 'FEDEX AU 促销',
      agentName: '远东',
      hasProblemTicket: false
    },
    {
      id: 'SYGJ05291344165',
      createdAt: '2026-05-27 16:58',
      customerName: '1344-TILL',
      customerOrderNo: 'TILL-0529',
      systemOrderNo: 'SYGJ05291344165',
      transferNo: '9064656160',
      businessType: 'EXPRESS',
      packageType: 'WPX',
      destinationCountry: '未知',
      carrier: 'DHL',
      packageCount: 5,
      receivableWeightKg: 77,
      agentWeightKg: 76,
      latestTracking: '离开扫描',
      trackingStaleDays: 9,
      isRemoteArea: false,
      status: 'WAITING_ONLINE',
      channelName: 'HKD01 代理价',
      agentName: '宇环',
      hasProblemTicket: true
    }
  ];

  private readonly accounts: Account[] = [
    { id: 'u-admin', username: 'admin', password: 'admin123', role: 'ADMIN' },
    { id: 'u-cs', username: 'service', password: 'service123', role: 'CUSTOMER_SERVICE' },
    { id: 'u-op', username: 'operator', password: 'operator123', role: 'OPERATOR' },
    { id: 'u-finance', username: 'finance', password: 'finance123', role: 'FINANCE' },
    { id: 'u-customer', username: 'customer', password: 'customer123', role: 'CUSTOMER', customerId: 'c-9409' }
  ];

  readonly customers = [
    { id: 'c-9409', code: '9409', name: 'Daloday', enabled: true },
    { id: 'c-1344', code: '1344', name: 'TILL', enabled: true },
    { id: 'c-9509', code: '9509', name: 'Cam&Clae', enabled: true }
  ];

  readonly channels = [
    { id: 'ch-dhl-hk', name: 'HKD01 代理价', carrier: 'DHL', enabled: true },
    { id: 'ch-fedex-au', name: 'FEDEX AU 促销', carrier: 'FEDEX', enabled: true },
    { id: 'ch-ups-ca', name: 'UPS 加美线', carrier: 'UPS', enabled: true }
  ];

  readonly receivables = [
    { id: 'r-1', shipmentId: 'SYGJ06059409051', customerName: '9409-Daloday', amount: 1864.2, settled: false },
    { id: 'r-2', shipmentId: 'SYGJ05291344165', customerName: '1344-TILL', amount: 2410.5, settled: false }
  ];

  findAccount(username: string, password: string): Account | undefined {
    return this.accounts.find((account) => account.username === username && account.password === password);
  }

  getShipments(principal: Principal): Shipment[] {
    if (principal.role !== 'CUSTOMER') {
      return this.shipments;
    }

    return this.shipments.filter((shipment) => shipment.customerName.includes('9409'));
  }

  getRoles(): RoleKey[] {
    return ['ADMIN', 'CUSTOMER_SERVICE', 'OPERATOR', 'FINANCE', 'CUSTOMER'];
  }
}
