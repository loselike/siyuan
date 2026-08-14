import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from '../../test-support/e2e-harness.js';

describe('problem ticket command routes', () => {
  const app = setupE2eApp();
  const missingShipmentId = 'missing-problem-ticket-shipment';
  const missingTicketId = 'missing-problem-ticket';

  it('keeps all six routes protected by authentication', async () => {
    const statuses = [];
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/problem-tickets`).send({ reason: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/business/shipments/${missingShipmentId}/problem-tickets`).send({ reason: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/operations/line-shipments/${missingShipmentId}/problem-tickets`).send({ reason: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/problem-tickets/${missingTicketId}/replies`).send({ message: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/problem-tickets/${missingTicketId}/close`).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/problem-tickets/${missingTicketId}/assist`).send({})).status);

    expect(statuses).toEqual(Array.from({ length: 6 }, () => 401));
  });

  it('keeps a role without problem command permissions on the 403 path', async () => {
    const warehouseToken = await app.loginAs('warehouse');
    const authorization = app.auth(warehouseToken);

    await request(app.getHttpServer())
      .post(`/api/shipments/${missingShipmentId}/problem-tickets`)
      .set('Authorization', authorization)
      .send({ reason: 'permission boundary' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/operations/line-shipments/${missingShipmentId}/problem-tickets`)
      .set('Authorization', authorization)
      .send({ reason: 'permission boundary' })
      .expect(403);
  });

  it('keeps allowed requests delegated to the existing repository without business writes', async () => {
    const adminToken = await app.loginAs('admin');
    const authorization = app.auth(adminToken);
    const statuses = [];
    statuses.push((await request(app.getHttpServer()).post(`/api/shipments/${missingShipmentId}/problem-tickets`).set('Authorization', authorization).send({ reason: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/business/shipments/${missingShipmentId}/problem-tickets`).set('Authorization', authorization).send({ reason: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/operations/line-shipments/${missingShipmentId}/problem-tickets`).set('Authorization', authorization).send({ reason: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/problem-tickets/${missingTicketId}/replies`).set('Authorization', authorization).send({ message: 'missing' })).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/problem-tickets/${missingTicketId}/close`).set('Authorization', authorization).send({})).status);
    statuses.push((await request(app.getHttpServer()).post(`/api/problem-tickets/${missingTicketId}/assist`).set('Authorization', authorization).send({})).status);

    expect(statuses).toEqual(Array.from({ length: 6 }, () => 404));
  });
});
