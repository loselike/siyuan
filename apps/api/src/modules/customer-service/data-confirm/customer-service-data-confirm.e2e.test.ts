import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from '../../test-support/e2e-harness.js';

describe('customer service data confirm routes', () => {
  const app = setupE2eApp();
  const missingShipmentId = 'missing-data-confirm-shipment';

  it('keeps all eleven routes protected by authentication', async () => {
    const statuses = [];
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/business-data/approve`).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/agent-data/approve`).send({})).status);
    statuses.push((await request(app.getHttpServer()).patch(`/api/shipments/${missingShipmentId}/business-data`).send({})).status);
    statuses.push((await request(app.getHttpServer()).get(`/api/shipments/${missingShipmentId}/customer-service/cost-preview`).query({ kind: 'business' })).status);
    statuses.push((await request(app.getHttpServer()).put(`/api/shipments/${missingShipmentId}/customer-service/finance-items/fee-1`).query({ kind: 'business' }).send({})).status);
    statuses.push((await request(app.getHttpServer()).patch(`/api/shipments/${missingShipmentId}/agent-data`).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/business-data/reverse`).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/agent-data/reverse`).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/data-confirmation/approve-all`).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/data-confirmation/reverse-all`).send({})).status);
    statuses.push((await request(app.getHttpServer()).get('/api/customer-service/data-confirm-shipments')).status);

    expect(statuses).toEqual(Array.from({ length: 11 }, () => 401));
  });

  it('keeps a real role without data-confirm permission on the 403 path', async () => {
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .get('/api/customer-service/data-confirm-shipments')
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
  });

  it('keeps the allowed command routes delegated to the existing repository without business writes', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const statuses = [];
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/business-data/approve`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/agent-data/approve`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).patch(`/api/shipments/${missingShipmentId}/business-data`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).get(`/api/shipments/${missingShipmentId}/customer-service/cost-preview`).query({ kind: 'business' }).set('Authorization', authorization)).status);
    statuses.push((await request(app.getHttpServer()).put(`/api/shipments/${missingShipmentId}/customer-service/finance-items/fee-1`).query({ kind: 'business' }).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).patch(`/api/shipments/${missingShipmentId}/agent-data`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/business-data/reverse`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/agent-data/reverse`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/data-confirmation/approve-all`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/data-confirmation/reverse-all`).set('Authorization', authorization).send({})).status);

    expect(statuses).toEqual(Array.from({ length: 10 }, () => 404));
  });
});
