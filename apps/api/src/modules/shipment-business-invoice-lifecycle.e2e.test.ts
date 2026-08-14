import request from 'supertest';
import type { Response as SuperAgentResponse } from 'superagent';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

function parseBinary(response: SuperAgentResponse, callback: (error: Error | null, body?: Buffer) => void) {
  const chunks: Buffer[] = [];
  response.on('data', (chunk: Buffer) => chunks.push(chunk));
  response.on('end', () => callback(null, Buffer.concat(chunks)));
  response.on('error', (error: Error) => callback(error));
}

describe('Shipment business invoice lifecycle API', () => {
  const app = setupE2eApp();

  it('keeps upload, template download, invoice download, file, permission, and audit contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const customerToken = await app.loginAs('customer');

    for (const path of [
      '/api/shipments/s-seed-1/invoice-template/download',
      '/api/shipments/s-seed-1/invoice/download'
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .expect(401)
        .expect((response) => expect(response.body.message).toBe('缺少登录凭证'));
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', app.auth(customerToken))
        .expect(403)
        .expect((response) => expect(response.body.message).toBe('没有访问权限'));
    }

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/invoice/upload')
      .expect(401)
      .expect((response) => expect(response.body.message).toBe('缺少登录凭证'));
    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/invoice/upload')
      .set('Authorization', app.auth(customerToken))
      .expect(403)
      .expect((response) => expect(response.body.message).toBe('没有访问权限'));

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/invoice-template/download?templateSlot=4')
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('发票模板序号必须为 1、2 或 3'));

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/invoice/upload')
      .set('Authorization', app.auth(adminToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请上传业务发票'));

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/invoice/upload')
      .set('Authorization', app.auth(adminToken))
      .attach('file', Buffer.from('%PDF-1.4'), { filename: 'phase22.pdf', contentType: 'application/pdf' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('仅支持 .xls/.xlsx Excel 文件'));

    const templateBytes = Buffer.from('PK\x03\x04phase22-template');
    const uploadedTemplate = await request(app.getHttpServer())
      .post('/api/master-data/agent-invoice-template/upload')
      .set('Authorization', app.auth(adminToken))
      .attach('file', templateBytes, {
        filename: 'phase22-template.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      .expect(201);

    const agent = await request(app.getHttpServer())
      .post('/api/master-data/agents')
      .set('Authorization', app.auth(adminToken))
      .send({
        code: 'P22A',
        shortName: 'P22代理',
        name: 'Phase22 Agent',
        invoiceTemplates: [{ id: 'phase22-primary', name: 'Phase22 模板', url: uploadedTemplate.body.url }]
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/route')
      .set('Authorization', app.auth(adminToken))
      .send({
        channelId: 'ch-dhl-hk',
        agentId: agent.body.id,
        agentChannelName: 'Phase22 Agent Channel',
        chargeWeightKg: 18,
        unitPrice: 8,
        currency: 'RMB'
      })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/invoice-template/download?templateId=phase22-primary')
      .set('Authorization', app.auth(adminToken))
      .buffer(true)
      .parse(parseBinary)
      .expect(200)
      .expect('Content-Type', /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/)
      .expect('Cache-Control', 'private, no-store')
      .expect((response) => expect(response.body).toEqual(templateBytes));

    const invoiceBytes = Buffer.from('PK\x03\x04phase22-business-invoice');
    const uploaded = await request(app.getHttpServer())
      .post('/api/shipments/s-seed-1/invoice/upload')
      .set('Authorization', app.auth(adminToken))
      .attach('file', invoiceBytes, {
        filename: 'phase22-business-invoice.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      .expect(201);
    expect(uploaded.body).toEqual(expect.objectContaining({
      shipment: expect.objectContaining({
        id: 's-seed-1',
        businessInvoiceName: 'phase22-business-invoice.xlsx',
        businessInvoiceUrl: expect.stringContaining('/api/uploads/business-invoices/')
      }),
      fileName: 'phase22-business-invoice.xlsx',
      url: expect.stringContaining('/api/uploads/business-invoices/')
    }));

    await request(app.getHttpServer())
      .get('/api/shipments/s-seed-1/invoice/download')
      .set('Authorization', app.auth(adminToken))
      .buffer(true)
      .parse(parseBinary)
      .expect(200)
      .expect('Content-Type', /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/)
      .expect('Cache-Control', 'private, no-store')
      .expect((response) => expect(response.body).toEqual(invoiceBytes));

    for (const action of ['shipment.invoice_template.download', 'shipment.business_invoice.upload', 'shipment.business_invoice.download']) {
      await request(app.getHttpServer())
        .get('/api/system/audit-logs')
        .query({ action })
        .set('Authorization', app.auth(adminToken))
        .expect(200)
        .expect((response) => {
          expect(response.body.rows).toEqual(expect.arrayContaining([
            expect.objectContaining({ action, target: 's-seed-1', actorUsername: 'admin' })
          ]));
        });
    }
  });
});
