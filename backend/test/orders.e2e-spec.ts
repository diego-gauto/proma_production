import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import * as request from 'supertest';
import { DataSource } from 'typeorm';

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  'postgresql://proma:proma_dev@localhost:55432/produccion_textil';
process.env.JWT_SECRET = 'test-jwt-secret-with-enough-length';
process.env.JWT_EXPIRES_IN = '8h';
process.env.CORS_ORIGIN = 'http://localhost:3000';

import { AppModule } from './../src/app.module';
import {
  SectorCode,
  SizeSequenceType,
  StageExecutionType,
} from './../src/modules/catalog/entities/catalog.enums';
import { PartStatus } from './../src/modules/orders/entities/order.enums';
import { UserRole } from './../src/modules/users/entities/user.enums';

describe('Orders (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const email = `orders-${suffix}@proma.test`;
  const password = 'Clave-Segura-123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();

    dataSource = app.get(DataSource);
    await dataSource.runMigrations();
    await dataSource.query(
      `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
      `,
      ['Admin Ordenes', email, await bcrypt.hash(password, 10), UserRole.ADMIN],
    );

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    token = login.body.accessToken as string;
  });

  afterAll(async () => {
    await dataSource?.query('DELETE FROM orders WHERE external_code LIKE $1', [
      `EXT-${suffix}%`,
    ]);
    await dataSource?.query('DELETE FROM users WHERE email = $1', [email]);
    await app?.close();
  });

  it('creates an order with requested items and one root part, then lists it', async () => {
    const client = await dataSource.query(
      `
        INSERT INTO clients (name)
        VALUES ($1)
        RETURNING id
      `,
      [`Cliente Orden ${suffix}`],
    );
    const article = await dataSource.query(
      `
        INSERT INTO articles (name)
        VALUES ($1)
        RETURNING id
      `,
      [`Articulo Orden ${suffix}`],
    );
    const curve = await dataSource.query(
      `
        INSERT INTO size_curves (name, sequence_type)
        VALUES ($1, $2)
        RETURNING id
      `,
      [`Curva Orden ${suffix}`, SizeSequenceType.ALFABETICA],
    );
    const size = await dataSource.query(
      `
        INSERT INTO size_curve_values (size_curve_id, label, sort_order)
        VALUES ($1, 'M', 1)
        RETURNING id
      `,
      [curve[0].id],
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalCode: `EXT-${suffix}`,
        clientId: client[0].id,
        articleId: article[0].id,
        requestedItems: [
          {
            sizeCurveValueId: size[0].id,
            color: 'Azul',
            quantityRequested: 12,
          },
        ],
      })
      .expect(201);

    expect(created.body.internalCode).toMatch(/^OC-\d{4}-\d{6}$/);
    expect(created.body.parts).toEqual([
      expect.objectContaining({ partCode: 'P1', quantity: 12 }),
    ]);

    const listed = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: `EXT-${suffix}` })
      .expect(200);

    expect(listed.body.items).toEqual([
      expect.objectContaining({
        id: created.body.id,
        externalCode: `EXT-${suffix}`,
      }),
    ]);
  });

  it('lists order parts with current stage, active event and workshop for tracking', async () => {
    const client = await dataSource.query(
      `
        INSERT INTO clients (name)
        VALUES ($1)
        RETURNING id
      `,
      [`Cliente Tracking ${suffix}`],
    );
    const article = await dataSource.query(
      `
        INSERT INTO articles (name)
        VALUES ($1)
        RETURNING id
      `,
      [`Articulo Tracking ${suffix}`],
    );
    const curve = await dataSource.query(
      `
        INSERT INTO size_curves (name, sequence_type)
        VALUES ($1, $2)
        RETURNING id
      `,
      [`Curva Tracking ${suffix}`, SizeSequenceType.ALFABETICA],
    );
    const size = await dataSource.query(
      `
        INSERT INTO size_curve_values (size_curve_id, label, sort_order)
        VALUES ($1, 'L', 1)
        RETURNING id
      `,
      [curve[0].id],
    );
    const workshop = await dataSource.query(
      `
        INSERT INTO workshops (name, specialties)
        VALUES ($1, $2)
        RETURNING id
      `,
      [`Taller Tracking ${suffix}`, [SectorCode.CONFECCION]],
    );

    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalCode: `EXT-${suffix}-TRACK`,
        clientId: client[0].id,
        articleId: article[0].id,
        requestedItems: [
          {
            sizeCurveValueId: size[0].id,
            quantityRequested: 8,
          },
        ],
      })
      .expect(201);
    const stage = await dataSource.query(
      'SELECT id FROM stages WHERE code = $1',
      [SectorCode.CONFECCION],
    );
    const partId = created.body.parts[0].id as string;
    await dataSource.query(
      `
        UPDATE order_parts
        SET current_stage_id = $1, status = $2
        WHERE id = $3
      `,
      [stage[0].id, PartStatus.EN_PROCESO, partId],
    );
    await dataSource.query(
      `
        INSERT INTO part_stage_events (
          order_part_id,
          stage_id,
          execution_type,
          workshop_id,
          started_at,
          estimated_finish_at,
          performed_by
        )
        VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', NOW() + INTERVAL '1 day', (
          SELECT id FROM users WHERE email = $5
        ))
      `,
      [
        partId,
        stage[0].id,
        StageExecutionType.EXTERNO,
        workshop[0].id,
        email,
      ],
    );

    const listed = await request(app.getHttpServer())
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .query({ search: `EXT-${suffix}-TRACK` })
      .expect(200);

    expect(listed.body.items[0].parts[0]).toEqual(
      expect.objectContaining({
        id: partId,
        currentStage: expect.objectContaining({
          code: SectorCode.CONFECCION,
          name: expect.any(String),
        }),
        events: [
          expect.objectContaining({
            finishedAt: null,
            stage: expect.objectContaining({ code: SectorCode.CONFECCION }),
            workshop: expect.objectContaining({
              id: workshop[0].id,
              name: `Taller Tracking ${suffix}`,
            }),
          }),
        ],
      }),
    );
  });
});
