import request from 'supertest';
import { describe, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('warehouse tally historical aggregate correction route contract', () => {
  const app = setupE2eApp();

  it('preserves authentication and permission rejection before the repository port', async () => {
    const operatorToken = await app.loginAs('operator');
    const path = '/api/warehouse/tally-tasks/missing/historical-aggregate-correction';

    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer()).post(path).send({}).expect(401);
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', app.auth(operatorToken))
      .expect(403);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', app.auth(operatorToken))
      .send({})
      .expect(403);
  });
});
