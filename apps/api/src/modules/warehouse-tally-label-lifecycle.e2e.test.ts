import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse tally label lifecycle contract', () => {
  const app = setupE2eApp();

  it('preserves label permissions, state guards, output marks, scan behavior and audits', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const operatorToken = await app.loginAs('operator');
    const trackingNo = 'KY-PHASE12-TALLY-LABEL';

    const receipt = await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        combinedOrderNo: `9409-${trackingNo}`,
        cartonSpecs: [{ weightKg: 6, lengthCm: 30, widthCm: 20, heightCm: 15, packageCount: 1 }]
      })
      .expect(201);
    const sourceId = receipt.body.packages[0].id as string;

    const task = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageIds: [sourceId], tallyChannel: '空运', tallyRequirement: 'phase12 标签保护样本' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请先完成理货再生成标签'));

    const completed = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageCount: 1,
        results: [{ sourcePackageIds: [sourceId], packageCount: 1 }]
      })
      .expect(201);
    expect(completed.body).toEqual(expect.objectContaining({
      id: task.body.id,
      status: 'COMPLETED',
      labelStatus: 'GENERATED',
      labelNo: task.body.taskNo,
      labelGeneratedBy: 'warehouse'
    }));

    const outputs = await request(app.getHttpServer())
      .get(`/api/warehouse/tally-tasks/${task.body.id}/output-packages`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(200);
    expect(outputs.body).toEqual([
      expect.objectContaining({
        tallyTaskId: task.body.id,
        labelNo: task.body.taskNo,
        measurementStatus: 'PENDING_REMEASURE'
      })
    ]);
    const outputId = outputs.body[0].id as string;

    const regenerated = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(regenerated.body).toEqual(expect.objectContaining({
      id: task.body.id,
      labelStatus: 'GENERATED',
      labelNo: task.body.taskNo,
      labelGeneratedBy: 'warehouse'
    }));
    expect(regenerated.body.labelQrContent).toContain('"type":"WAREHOUSE_TALLY_LABEL"');

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label/print`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    const printed = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label/print`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(printed.body).toEqual(expect.objectContaining({
      labelNo: task.body.taskNo,
      labelPrintedBy: 'warehouse'
    }));
    expect(printed.body.labelPrintedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label/download`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    const downloaded = await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/label/download`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201);
    expect(downloaded.body).toEqual(expect.objectContaining({
      labelNo: task.body.taskNo,
      labelDownloadedBy: 'warehouse'
    }));
    expect(downloaded.body.labelDownloadedAt).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(operatorToken))
      .send({ labelNo: task.body.taskNo })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: '   ' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('请扫描或填写理货标签号'));
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: 'PHASE12-NOT-FOUND' })
      .expect(404)
      .expect((response) => expect(response.body.message).toBe('理货标签不存在'));
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: task.body.taskNo })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('该理货标签待重新过机，请通过设备回传或人工录入测量数据'));

    await request(app.getHttpServer())
      .patch(`/api/warehouse/packages/${outputId}`)
      .set('Authorization', app.auth(adminToken))
      .send({ weightKg: 6, lengthCm: 30, widthCm: 20, heightCm: 15 })
      .expect(200)
      .expect((response) => expect(response.body).toEqual(expect.objectContaining({
        id: outputId,
        measurementStatus: 'MEASURED',
        measurementMatchedBy: 'admin'
      })));

    const scanned = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: `  ${task.body.taskNo}  ` })
      .expect(201);
    expect(scanned.body).toEqual(expect.objectContaining({
      alreadyApplied: true,
      task: expect.objectContaining({ id: task.body.id, labelStatus: 'GENERATED' }),
      package: expect.objectContaining({ id: outputId, labelNo: task.body.taskNo, measurementStatus: 'MEASURED' })
    }));
    await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks/label-scan')
      .set('Authorization', app.auth(warehouseToken))
      .send({ labelNo: task.body.taskNo })
      .expect(201)
      .expect((response) => expect(response.body).toEqual(expect.objectContaining({
        alreadyApplied: true,
        package: expect.objectContaining({ id: outputId })
      })));

    for (const [action, field] of [
      ['warehouse.tally.label.reprint', 'labelGeneratedBy'],
      ['warehouse.tally.label.print', 'labelPrintedBy'],
      ['warehouse.tally.label.download', 'labelDownloadedBy']
    ] as const) {
      await request(app.getHttpServer())
        .get(`/api/system/audit-logs?action=${action}`)
        .set('Authorization', app.auth(adminToken))
        .expect(200)
        .expect((response) => {
          const matching = response.body.rows.filter((row: { action: string; target: string }) =>
            row.action === action && row.target === task.body.taskNo
          );
          expect(matching).toHaveLength(1);
          expect(matching[0].after).toEqual(expect.objectContaining({ [field]: 'warehouse' }));
        });
    }
  });
});
