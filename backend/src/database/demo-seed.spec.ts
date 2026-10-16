import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://proma:proma_dev@localhost:55432/produccion_textil';
process.env.JWT_SECRET = 'test-jwt-secret-with-enough-length';
process.env.JWT_EXPIRES_IN = '8h';
process.env.CORS_ORIGIN = 'http://localhost:3000';

import { AppModule } from '../app.module';
import { seedDemoData } from './seeds/demo.seed';

describe('demo seed', () => {
  let moduleFixture: TestingModule;
  let dataSource: DataSource;

  beforeAll(async () => {
    moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    dataSource = moduleFixture.get(DataSource);
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await moduleFixture?.close();
  });

  it('is idempotent and creates enough data to test login and dashboard', async () => {
    await seedDemoData(dataSource);
    await seedDemoData(dataSource);

    const [users, clients, workshops, articles, orders] = await Promise.all([
      dataSource.query("SELECT count(*)::int AS count FROM users WHERE email LIKE '%@demo.proma.local'"),
      dataSource.query("SELECT count(*)::int AS count FROM clients WHERE tax_id LIKE 'DEMO-%'"),
      dataSource.query("SELECT count(*)::int AS count FROM workshops WHERE name LIKE 'Demo %'"),
      dataSource.query("SELECT count(*)::int AS count FROM articles WHERE code LIKE 'DEMO-%'"),
      dataSource.query("SELECT count(*)::int AS count FROM orders WHERE external_code LIKE 'DEMO-%'"),
    ]);

    expect(users[0].count).toBeGreaterThanOrEqual(10);
    expect(clients[0].count).toBeGreaterThanOrEqual(2);
    expect(workshops[0].count).toBeGreaterThanOrEqual(3);
    expect(articles[0].count).toBeGreaterThanOrEqual(2);
    expect(orders[0].count).toBeGreaterThanOrEqual(10);

    const sectorOrders = await dataSource.query(`
      SELECT s.code, count(*)::int AS count
      FROM orders o
      JOIN order_parts p ON p.order_id = o.id
      JOIN stages s ON s.id = p.current_stage_id
      WHERE o.external_code LIKE 'DEMO-%' AND s.code IN ('BORDADO', 'ESTAMPADO')
      GROUP BY s.code
    `);
    expect(sectorOrders).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'BORDADO', count: expect.any(Number) }),
      expect.objectContaining({ code: 'ESTAMPADO', count: expect.any(Number) }),
    ]));
    expect(sectorOrders.every((row: { count: number }) => row.count >= 2)).toBe(true);

    const aviosEditors = await dataSource.query(`
      SELECT u.email, p.sector_code AS "sectorCode", p.action
      FROM users u
      JOIN user_permissions p ON p.user_id = u.id
      WHERE u.email = 'avios@demo.proma.local'
        AND p.action = 'EDITAR'
      ORDER BY p.sector_code
    `);
    expect(aviosEditors).toEqual(expect.arrayContaining([
      expect.objectContaining({ email: 'avios@demo.proma.local', sectorCode: 'AVIOS_CONFECCION', action: 'EDITAR' }),
      expect.objectContaining({ email: 'avios@demo.proma.local', sectorCode: 'AVIOS_TERMINACION', action: 'EDITAR' }),
    ]));
    const oldAviosUsers = await dataSource.query(`
      SELECT email, is_active AS "isActive" FROM users
      WHERE email IN ('avios_confeccion@demo.proma.local', 'avios_terminacion@demo.proma.local')
    `);
    expect(oldAviosUsers.every((user: { isActive: boolean }) => !user.isActive)).toBe(true);
  });
});
