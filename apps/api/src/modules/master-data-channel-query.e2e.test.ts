import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('Master data channel query API', () => {
  const app = setupE2eApp();

  it('keeps master-data reference response contracts unchanged', async () => {
    const adminToken = await app.loginAs('admin');
    const marketToken = await app.loginAs('market');
    const authorization = app.auth(adminToken);
    const snapshot = await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', authorization)
      .expect(200);

    const carriers = await request(app.getHttpServer())
      .get('/api/master-data/carriers')
      .set('Authorization', authorization)
      .expect(200);
    expect(carriers.body).toEqual(snapshot.body.carriers);

    const channels = await request(app.getHttpServer())
      .get('/api/master-data/channels')
      .set('Authorization', authorization)
      .expect(200);
    expect(channels.body).toEqual(snapshot.body.channels);

    const channelCategories = await request(app.getHttpServer())
      .get('/api/master-data/channel-categories')
      .set('Authorization', authorization)
      .expect(200);
    expect(channelCategories.body).toEqual(snapshot.body.channelCategories);

    const agents = await request(app.getHttpServer())
      .get('/api/master-data/agents')
      .set('Authorization', authorization)
      .expect(200);
    expect(agents.body).toEqual(snapshot.body.agents);

    const agentChannels = await request(app.getHttpServer())
      .get('/api/master-data/agent-channels')
      .set('Authorization', authorization)
      .expect(200);
    expect(agentChannels.body).toEqual(snapshot.body.agentChannels);

    await request(app.getHttpServer())
      .get('/api/master-data/agents')
      .set('Authorization', app.auth(marketToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(snapshot.body.agents);
      });

    await request(app.getHttpServer())
      .get('/api/master-data/agent-channels')
      .set('Authorization', app.auth(marketToken))
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(snapshot.body.agentChannels);
      });
  });

  it('keeps authentication and customer permission denial unchanged', async () => {
    const customerToken = await app.loginAs('customer');
    const authorization = app.auth(customerToken);

    await request(app.getHttpServer())
      .get('/api/master-data/channels')
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe('缺少登录凭证');
      });

    for (const path of [
      '/api/master-data/carriers',
      '/api/master-data/channels',
      '/api/master-data/channel-categories',
      '/api/master-data/agents',
      '/api/master-data/agent-channels'
    ]) {
      await request(app.getHttpServer())
        .get(path)
        .set('Authorization', authorization)
        .expect(403)
        .expect((response) => {
          expect(response.body.message).toBe('没有访问权限');
        });
    }
  });

  it('keeps business-role agent identity restrictions unchanged after explicit grants', async () => {
    const adminToken = await app.loginAs('admin');
    const operatorToken = await app.loginAs('operator');

    await request(app.getHttpServer())
      .put('/api/system/roles/UG_BUSINESS/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['master-data:agents:read', 'master-data:agent-channels:read'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/master-data')
      .set('Authorization', app.auth(operatorToken))
      .expect(200)
      .expect((response) => {
        expect(response.body.agents).toEqual([]);
        expect(response.body.agentChannels).toEqual([]);
      });

    await request(app.getHttpServer())
      .get('/api/master-data/agents')
      .set('Authorization', app.auth(operatorToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('业务角色不能查看真实代理资料');
      });

    await request(app.getHttpServer())
      .get('/api/master-data/agent-channels')
      .set('Authorization', app.auth(operatorToken))
      .expect(403)
      .expect((response) => {
        expect(response.body.message).toBe('业务角色不能查看真实代理渠道');
      });
  });
});
