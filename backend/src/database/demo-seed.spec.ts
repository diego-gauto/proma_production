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
    await dataSource?.query("DELETE FROM orders WHERE external_code LIKE 'DEMO-%'");
    await dataSource?.query("DELETE FROM users WHERE email LIKE '%@demo.proma.local'");
    await dataSource?.query("DELETE FROM clients WHERE tax_id LIKE 'DEMO-%'");
    await dataSource?.query("DELETE FROM workshops WHERE name LIKE 'Demo %'");
    await dataSource?.query("DELETE FROM articles WHERE code LIKE 'DEMO-%'");
    await dataSource?.query("DELETE FROM supplies WHERE code LIKE 'DEMO-%'");
    await dataSource?.query("DELETE FROM fabrics WHERE code LIKE 'DEMO-%'");
    await dataSource?.query("DELETE FROM size_curves WHERE name LIKE 'Demo %'");
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
    expect(orders[0].count).toBeGreaterThanOrEqual(5);
  });
});
