import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { setupE2eApp } from './test-support/e2e-harness.js';

describe('System role runtime input characterization', () => {
  const app = setupE2eApp();

  it('freezes authentication, valid writes, unknown fields and malformed-body behavior', async () => {
    const adminToken = await app.loginAs('admin');
    const financeToken = await app.loginAs('finance');
    const routes: Array<[method: 'post' | 'put', path: string]> = [
      ['post', '/api/system/roles'],
      ['put', '/api/system/roles/runtime-input-probe'],
      ['put', '/api/system/roles/runtime-input-probe/enabled'],
      ['put', '/api/system/roles/runtime-input-probe/permissions'],
      ['put', '/api/system/roles/runtime-input-probe/permissions/copy']
    ];

    for (const [method, path] of routes) {
      await request(app.getHttpServer())[method](path)
        .send({})
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('缺少登录凭证');
        });

      await request(app.getHttpServer())[method](path)
        .set('Authorization', app.auth(financeToken))
        .send({})
        .expect(403)
        .expect((response) => {
          expect(response.body.message).toBe('没有访问权限');
        });
    }

    await request(app.getHttpServer())
      .put('/api/system/roles/runtime-input-missing')
      .set('Authorization', app.auth(adminToken))
      .send({ label: '不存在岗位' })
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('用户组不存在');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/runtime-input-missing/enabled')
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: true })
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('用户组不存在');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/runtime-input-missing/permissions')
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: [] })
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('用户组不存在');
      });

    await request(app.getHttpServer())
      .put('/api/system/roles/runtime-input-missing/permissions/copy')
      .set('Authorization', app.auth(adminToken))
      .send({ sourceRoleKey: 'WAREHOUSE' })
      .expect(404)
      .expect((response) => {
        expect(response.body.message).toBe('目标用户组不存在');
      });

    const created = await request(app.getHttpServer())
      .post('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .send({
        label: '运行时输入兼容固定岗位',
        description: '迁移前固定样本',
        site: '深圳思远',
        sortOrder: 61,
        enabled: true,
        templateRole: 'WAREHOUSE',
        ignoredField: 'legacy-unknown-field'
      })
      .expect(201);
    const role = created.body.key as string;
    expect(created.body).toEqual(expect.objectContaining({
      label: '运行时输入兼容固定岗位',
      description: '迁移前固定样本',
      site: '深圳思远',
      sortOrder: 61,
      enabled: true
    }));
    expect(created.body).not.toHaveProperty('ignoredField');

    const updated = await request(app.getHttpServer())
      .put(`/api/system/roles/${role}`)
      .set('Authorization', app.auth(adminToken))
      .send({
        label: '运行时输入兼容固定岗位改',
        description: '迁移前固定样本改',
        site: '深圳思远',
        sortOrder: 62,
        enabled: true,
        ignoredField: 'legacy-unknown-field'
      })
      .expect(200);
    expect(updated.body).toEqual(expect.objectContaining({
      key: role,
      label: '运行时输入兼容固定岗位改',
      description: '迁移前固定样本改',
      sortOrder: 62,
      enabled: true
    }));
    expect(updated.body).not.toHaveProperty('ignoredField');

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['warehouse:today-receipt:view'], ignoredField: true })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual(['warehouse:today-receipt:view']);
        expect(response.body).not.toHaveProperty('ignoredField');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions/copy`)
      .set('Authorization', app.auth(adminToken))
      .send({ sourceRoleKey: 'WAREHOUSE', ignoredField: true })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual(expect.arrayContaining([
          'warehouse:today-receipt:view',
          'warehouse:in-stock:view'
        ]));
        expect(response.body).not.toHaveProperty('ignoredField');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: true, ignoredField: true })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(true);
        expect(response.body).not.toHaveProperty('ignoredField');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: false })
      .expect(200)
      .expect((response) => {
        expect(response.body.enabled).toBe(false);
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: [] })
      .expect(200)
      .expect((response) => {
        expect(response.body.permissions).toEqual([]);
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['warehouse:today-receipt:view'] })
      .expect(200);

    for (const [method, path] of [
      ['post', '/api/system/roles'],
      ['put', `/api/system/roles/${role}`],
      ['put', `/api/system/roles/${role}/enabled`],
      ['put', `/api/system/roles/${role}/permissions`],
      ['put', `/api/system/roles/${role}/permissions/copy`]
    ] as const) {
      await request(app.getHttpServer())[method](path)
        .set('Authorization', app.auth(adminToken))
        .set('Content-Type', 'application/json')
        .send('null')
        .expect(400)
        .expect((response) => {
          expect(response.body.message).toContain('not valid JSON');
        });
    }

    await request(app.getHttpServer())
      .post('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请求体格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}`)
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请求体格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请求体格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请求体格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions/copy`)
      .set('Authorization', app.auth(adminToken))
      .send([])
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请求体格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['warehouse:today-receipt:view'] })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .send({ label: 61 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('用户组名称格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}`)
      .set('Authorization', app.auth(adminToken))
      .send({ label: 62 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('用户组名称格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: 61 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('权限列表格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions/copy`)
      .set('Authorization', app.auth(adminToken))
      .send({ sourceRoleKey: 61 })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('权限来源用户组格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: 'true' })
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('启用状态格式不正确');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请选择启用状态');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({})
      .expect(400)
      .expect((response) => {
        expect(response.body.message).toBe('请提交权限列表');
      });

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/enabled`)
      .set('Authorization', app.auth(adminToken))
      .send({ enabled: true })
      .expect(200);

    await request(app.getHttpServer())
      .put(`/api/system/roles/${role}/permissions`)
      .set('Authorization', app.auth(adminToken))
      .send({ permissions: ['warehouse:today-receipt:view'] })
      .expect(200);

    const roles = await request(app.getHttpServer())
      .get('/api/system/roles')
      .set('Authorization', app.auth(adminToken))
      .expect(200);
    expect(roles.body.roles).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: role,
        label: '运行时输入兼容固定岗位改',
        enabled: true,
        permissions: ['warehouse:today-receipt:view']
      })
    ]));
  });
});
