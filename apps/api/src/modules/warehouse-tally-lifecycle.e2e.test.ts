import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse tally lifecycle contract', () => {
  const app = setupE2eApp();

  it('preserves start and completed-cancellation permissions, states, package effects and audits', async () => {
    const adminToken = await app.loginAs('admin');
    const warehouseToken = await app.loginAs('warehouse');
    const operatorToken = await app.loginAs('operator');
    const trackingNo = 'KY-PHASE8-TALLY-LIFECYCLE';
    const combinedOrderNo = `9409-${trackingNo}`;

    const receipt = await request(app.getHttpServer())
      .post('/api/warehouse/packages/manual-receipt')
      .set('Authorization', app.auth(adminToken))
      .send({
        customerCode: '9409',
        customerOrderNo: '9409',
        domesticTrackingNo: trackingNo,
        combinedOrderNo,
        cartonSpecs: [{ weightKg: 10, lengthCm: 40, widthCm: 30, heightCm: 20, packageCount: 1 }]
      })
      .expect(201);
    const sourceId = receipt.body.packages[0].id as string;

    const task = await request(app.getHttpServer())
      .post('/api/warehouse/tally-tasks')
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageIds: [sourceId], tallyChannel: '海运', tallyRequirement: 'phase8 理货状态流保护样本' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/start`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/start`)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/start`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: task.body.id,
          status: 'PENDING',
          tallyProgressStatus: 'IN_PROGRESS',
          tallyStartedBy: 'warehouse'
        }));
        expect(response.body.tallyStartedAt).toBeTruthy();
      });
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/start`)
      .set('Authorization', app.auth(warehouseToken))
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('理货任务已处于理货中'));

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .send({
        packageCount: 1,
        results: [{ sourcePackageIds: [sourceId], packageCount: 1 }]
      })
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .set('Authorization', app.auth(operatorToken))
      .send({
        packageCount: 1,
        results: [{ sourcePackageIds: [sourceId], packageCount: 1 }]
      })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageCount: 1 })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('必须提交理货后的实体件结果'));

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({
        packageCount: 1,
        results: [{ sourcePackageIds: [sourceId], packageCount: 1 }]
      })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: task.body.id,
          status: 'COMPLETED',
          tallyProgressStatus: 'COMPLETED',
          completedPackageCount: 1,
          completedBy: 'warehouse',
          labelStatus: 'GENERATED',
          labelNo: task.body.taskNo
        }));
        expect(response.body.completedAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/complete`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ packageCount: 999 })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: task.body.id,
          status: 'COMPLETED',
          completedPackageCount: 1
        }));
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const source = response.body.find((row: { id: string }) => row.id === sourceId);
        const outputs = response.body.filter((row: { sourcePackageId?: string; tallyTaskId?: string }) =>
          row.sourcePackageId === sourceId && row.tallyTaskId === task.body.id
        );
        expect(source).toEqual(expect.objectContaining({
          status: 'TALLIED_ARCHIVED',
          archivedReason: '理货完成',
          tallyTaskId: task.body.id
        }));
        expect(outputs).toHaveLength(1);
        expect(outputs[0]).toEqual(expect.objectContaining({
          status: 'RECEIVED',
          measurementStatus: 'PENDING_REMEASURE',
          packageCount: 1,
          weightKg: 0
        }));
      });

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/cancel-completed`)
      .set('Authorization', app.auth(operatorToken))
      .send({ reason: '越权取消' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/cancel-completed`)
      .set('Authorization', app.auth(warehouseToken))
      .send({})
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('取消理货必须填写原因'));

    const reason = '理货选择错误，退回重新处理';
    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/cancel-completed`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ reason })
      .expect(201)
      .expect((response) => {
        expect(response.body).toEqual(expect.objectContaining({
          id: task.body.id,
          status: 'COMPLETED',
          tallyProgressStatus: 'CANCELLED',
          cancelReason: reason,
          cancelledBy: 'warehouse'
        }));
        expect(response.body.cancelledAt).toBeTruthy();
      });

    await request(app.getHttpServer())
      .get('/api/warehouse/in-stock')
      .query({ combinedOrderNo })
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        const restored = response.body.rows.find((row: { id: string }) => row.id === sourceId);
        expect(restored).toEqual(expect.objectContaining({
          id: sourceId,
          status: 'RECEIVED',
          tallyTaskId: task.body.id
        }));
      });
    await request(app.getHttpServer())
      .get('/api/warehouse/packages')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            sourcePackageId: sourceId,
            tallyTaskId: task.body.id,
            status: 'TALLIED_ARCHIVED',
            archivedReason: '理货取消'
          })
        ]));
      });

    await request(app.getHttpServer())
      .post(`/api/warehouse/tally-tasks/${task.body.id}/cancel-completed`)
      .set('Authorization', app.auth(warehouseToken))
      .send({ reason: '重复取消' })
      .expect(400)
      .expect((response) => expect(response.body.message).toBe('只有未取消的已完成理货任务可以取消'));

    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.start')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.start',
            target: task.body.id,
            after: expect.objectContaining({ tallyProgressStatus: 'IN_PROGRESS', tallyStartedBy: 'warehouse' })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.complete')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.complete',
            target: task.body.id,
            after: expect.objectContaining({
              task: expect.objectContaining({ status: 'COMPLETED', completedPackageCount: 1 }),
              resultMappings: [expect.objectContaining({ sourcePackageIds: [sourceId] })]
            })
          })
        ]));
      });
    await request(app.getHttpServer())
      .get('/api/system/audit-logs?action=warehouse.tally.cancel_completed')
      .set('Authorization', app.auth(adminToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.rows).toEqual(expect.arrayContaining([
          expect.objectContaining({
            action: 'warehouse.tally.cancel_completed',
            target: task.body.id,
            after: expect.objectContaining({
              tallyProgressStatus: 'CANCELLED',
              cancelReason: reason,
              restoredPackageIds: [sourceId],
              archivedResultPackageIds: expect.any(Array)
            })
          })
        ]));
      });
  });
});
