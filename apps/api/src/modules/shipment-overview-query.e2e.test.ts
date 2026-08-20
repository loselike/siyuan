import { summarizeStatusCounts } from '@siyuan/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Shipment overview query API', () => {
  const app = setupE2eApp();

  it('keeps shipment list scope, field trimming, and status counts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');
    const customerToken = await app.loginAs('customer');
    const marketToken = await app.loginAs('market');

    const adminShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(adminShipments.body.length).toBeGreaterThan(1);

    await request(app.getHttpServer())
      .get('/api/shipments/status-counts')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect(summarizeStatusCounts(adminShipments.body));

    const operatorShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(operatorToken))
      .expect(200);
    expect(operatorShipments.body.length).toBeGreaterThan(0);
    expect(operatorShipments.body.every((shipment: { salesperson?: string }) => shipment.salesperson === 'operator')).toBe(true);

    const customerShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(customerToken))
      .expect(200);
    expect(customerShipments.body.length).toBeGreaterThan(0);
    expect(customerShipments.body.every((shipment: { customerName?: string }) => shipment.customerName?.startsWith('9409-'))).toBe(true);
    customerShipments.body.forEach((shipment: Record<string, unknown>) => {
      expect(shipment).not.toHaveProperty('paymentAmountUsd');
      expect(shipment).not.toHaveProperty('paymentAmountCny');
      expect(shipment).not.toHaveProperty('paymentMethod');
      expect(shipment).not.toHaveProperty('routeCostTotal');
    });

    const marketShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(marketToken))
      .expect(200);
    expect(marketShipments.body.length).toBeGreaterThan(0);
    expect(marketShipments.body.every((shipment: { site?: string }) => shipment.site === '深圳思远')).toBe(true);

    const invalidCostScope = await request(app.getHttpServer())
      .get('/api/shipments')
      .query({ costScope: 'unexpected' })
      .set('Authorization', app.auth(marketToken))
      .expect(200);
    expect(invalidCostScope.body).toEqual(marketShipments.body);

    const routedMarketShipments = await request(app.getHttpServer())
      .get('/api/shipments')
      .query({ costScope: 'routed' })
      .set('Authorization', app.auth(marketToken))
      .expect(200);
    expect(routedMarketShipments.body.every((shipment: { site?: string }) => shipment.site === '深圳思远')).toBe(true);
    routedMarketShipments.body.forEach((shipment: Record<string, unknown>) => {
      expect(shipment).not.toHaveProperty('paymentAmountUsd');
      expect(shipment).not.toHaveProperty('paymentAmountCny');
      expect(shipment).not.toHaveProperty('paymentMethod');
      expect(shipment).not.toHaveProperty('grossProfit');
      expect(shipment).not.toHaveProperty('payables');
    });
  });

  it('keeps unread badge authentication, permission, and customer denial behavior unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');
    const warehouseToken = await app.loginAs('warehouse');

    await request(app.getHttpServer())
      .get('/api/navigation/unread-badges')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/navigation/unread-badges')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          items: expect.arrayContaining([
            expect.objectContaining({
              moduleKey: 'business',
              sectionKey: 'order-management',
              unreadCount: expect.any(Number),
              displayCount: expect.any(String)
            })
          ])
        });
      });

    await request(app.getHttpServer())
      .get('/api/navigation/unread-badges')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('客户不使用员工端导航角标');
      });

    await request(app.getHttpServer())
      .get('/api/shipments')
      .set('Authorization', app.auth(warehouseToken))
      .expect(403);
  });
});
