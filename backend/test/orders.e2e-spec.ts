import { INestApplication, ValidationPipe } from '@nestjs/common';
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
  FabricFormatType,
  FabricWeaveType,
  SectorCode,
  SizeSequenceType,
  StageExecutionType,
  SupplyCategory,
} from './../src/modules/catalog/entities/catalog.enums';
import {
  PartSplitMode,
  PartStatus,
} from './../src/modules/orders/entities/order.enums';
import { UserRole } from './../src/modules/users/entities/user.enums';

type OrderFixture = {
  clientId: string;
  articleId: string;
  fabricId: string;
  sizeCurveId: number;
  sizes: { id: number; label: string }[];
  supplyId: string;
};

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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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

  async function createOrderFixture(label: string): Promise<OrderFixture> {
    const uniqueTax = `30-${String(Math.floor(Math.random() * 89999999 + 10000000))}-1`;
    const client = await dataSource.query(
      `
        INSERT INTO clients (name, business_name, tax_id)
        VALUES ($1, $1, $2)
        RETURNING id
      `,
      [`Cliente ${label} ${suffix}`, uniqueTax],
    );
    const article = await dataSource.query(
      `
        INSERT INTO articles (code, name)
        VALUES ($1, $2)
        RETURNING id
      `,
      [`ART-${label}-${suffix}`.slice(0, 80), `Articulo ${label} ${suffix}`],
    );
    const fabric = await dataSource.query(
      `
        INSERT INTO fabrics (code, name, weave_type, format_type)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        `FAB-${label}-${suffix}`.slice(0, 80),
        `Tela ${label} ${suffix}`,
        FabricWeaveType.PUNTO,
        FabricFormatType.ABIERTO,
      ],
    );
    const curve = await dataSource.query(
      `
        INSERT INTO size_curves (name, sequence_type)
        VALUES ($1, $2)
        RETURNING id
      `,
      [`Curva ${label} ${suffix}`, SizeSequenceType.ALFABETICA],
    );
    const sizes = await dataSource.query(
      `
        INSERT INTO size_curve_values (size_curve_id, label, sort_order)
        VALUES ($1, 'S', 1), ($1, 'M', 2), ($1, 'L', 3)
        RETURNING id, label
      `,
      [curve[0].id],
    );
    const supply = await dataSource.query(
      `
        INSERT INTO supplies (code, name, category)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [
        `SUP-${label}-${suffix}`.slice(0, 80),
        `Avio ${label} ${suffix}`,
        SupplyCategory.CONFECCION,
      ],
    );
    await dataSource.query(
      `
        INSERT INTO article_supplies (article_id, supply_id, quantity, note)
        VALUES ($1, $2, 2, 'Puños')
      `,
      [article[0].id, supply[0].id],
    );
    await dataSource.query(
      `
        INSERT INTO article_decoration_parts (article_id, garment_part, decoration_type)
        VALUES ($1, 'Pecho', 'BORDADO')
      `,
      [article[0].id],
    );

    return {
      clientId: client[0].id as string,
      articleId: article[0].id as string,
      fabricId: fabric[0].id as string,
      sizeCurveId: curve[0].id as number,
      sizes: sizes as { id: number; label: string }[],
      supplyId: supply[0].id as string,
    };
  }

  it('creates an order with real order fabric, curve, requested items, root part and supply checklist', async () => {
    const fixture = await createOrderFixture('Crear');

    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalCode: `EXT-${suffix}`,
        clientId: fixture.clientId,
        articleId: fixture.articleId,
        fabricId: fixture.fabricId,
        sizeCurveId: fixture.sizeCurveId,
        requestedItems: [
          {
            sizeCurveValueId: fixture.sizes[0].id,
            color: 'Azul',
            quantityRequested: 12,
          },
          {
            sizeCurveValueId: fixture.sizes[1].id,
            color: 'Azul',
            quantityRequested: 8,
          },
        ],
      })
      .expect(201);

    expect(created.body.internalCode).toMatch(/^OC-\d{4}-\d{6}$/);
    expect(created.body.fabric.id).toBe(fixture.fabricId);
    expect(created.body.sizeCurve.id).toBe(fixture.sizeCurveId);
    expect(created.body.requestedItems).toHaveLength(2);
    expect(created.body.parts).toEqual([
      expect.objectContaining({
        partCode: 'P1',
        quantity: 20,
        supplies: [
          expect.objectContaining({
            supply: expect.objectContaining({ id: fixture.supplyId }),
            quantityNeeded: 2,
          }),
        ],
      }),
    ]);
    expect(created.body.article.decorationParts).toEqual([
      expect.objectContaining({ garmentPart: 'Pecho', decorationType: 'BORDADO' }),
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

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalCode: `EXT-${suffix}`,
        clientId: fixture.clientId,
        articleId: fixture.articleId,
        fabricId: fixture.fabricId,
        sizeCurveId: fixture.sizeCurveId,
        requestedItems: [
          { sizeCurveValueId: fixture.sizes[2].id, quantityRequested: 1 },
        ],
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalCode: `EXT-${suffix}-INVALID`,
        clientId: fixture.clientId,
        articleId: fixture.articleId,
        sizeCurveId: fixture.sizeCurveId,
        requestedItems: [
          { sizeCurveValueId: fixture.sizes[0].id, quantityRequested: 1 },
        ],
      })
      .expect(400);
  });

  it('lists order parts with current stage, active event and workshop for tracking', async () => {
    const fixture = await createOrderFixture('Tracking');
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
        clientId: fixture.clientId,
        articleId: fixture.articleId,
        fabricId: fixture.fabricId,
        sizeCurveId: fixture.sizeCurveId,
        requestedItems: [
          {
            sizeCurveValueId: fixture.sizes[2].id,
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

  it('returns the order detail, filters parts by stage, splits lote/component branches and recombines components', async () => {
    const fixture = await createOrderFixture('Arbol');
    const created = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        externalCode: `EXT-${suffix}-TREE`,
        clientId: fixture.clientId,
        articleId: fixture.articleId,
        fabricId: fixture.fabricId,
        sizeCurveId: fixture.sizeCurveId,
        requestedItems: [
          { sizeCurveValueId: fixture.sizes[0].id, quantityRequested: 10 },
        ],
      })
      .expect(201);
    const rootId = created.body.parts[0].id as string;

    const loteSplit = await request(app.getHttpServer())
      .post(`/api/v1/order-parts/${rootId}/split`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        splitMode: PartSplitMode.LOTE,
        subParts: [
          { quantity: 6, splitReason: 'Lote A' },
          { quantity: 4, splitReason: 'Lote B' },
        ],
      })
      .expect(201);
    expect(loteSplit.body).toHaveLength(2);
    expect(loteSplit.body[0]).toMatchObject({
      parentPartId: rootId,
      quantity: 6,
      splitMode: PartSplitMode.LOTE,
      isComponentBranch: false,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/order-parts/${loteSplit.body[0].id}/split`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        splitMode: PartSplitMode.LOTE,
        subParts: [
          { quantity: 7, splitReason: 'Excede' },
          { quantity: 1, splitReason: 'Excede mas' },
        ],
      })
      .expect(400);

    const componentSplit = await request(app.getHttpServer())
      .post(`/api/v1/order-parts/${loteSplit.body[0].id}/split`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        splitMode: PartSplitMode.COMPONENTE,
        subParts: [
          { quantity: 6, splitReason: 'Mangas a bordar' },
          { quantity: 6, splitReason: 'Resto en espera' },
        ],
      })
      .expect(201);
    expect(componentSplit.body).toEqual([
      expect.objectContaining({ isComponentBranch: true, quantity: 6 }),
      expect.objectContaining({ isComponentBranch: true, quantity: 6 }),
    ]);

    const recombined = await request(app.getHttpServer())
      .post('/api/v1/order-parts/recombine')
      .set('Authorization', `Bearer ${token}`)
      .send({
        componentPartIds: componentSplit.body.map((part: { id: string }) => part.id),
        quantity: 6,
        note: 'Componentes listos',
      })
      .expect(201);
    expect(recombined.body).toMatchObject({
      parentPartId: loteSplit.body[0].id,
      quantity: 6,
      isComponentBranch: false,
      status: PartStatus.PENDIENTE,
    });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(detail.body.parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: loteSplit.body[0].id,
          children: expect.arrayContaining([
            expect.objectContaining({ status: PartStatus.REINTEGRADA }),
            expect.objectContaining({ id: recombined.body.id }),
          ]),
        }),
      ]),
    );

    const stage = await dataSource.query('SELECT id FROM stages WHERE code = $1', [
      SectorCode.BORDADO,
    ]);
    await dataSource.query(
      `
        UPDATE order_parts
        SET current_stage_id = $1, status = $2
        WHERE id = $3
      `,
      [stage[0].id, PartStatus.EN_PROCESO, recombined.body.id],
    );

    const filtered = await request(app.getHttpServer())
      .get(`/api/v1/orders/${created.body.id}/parts`)
      .set('Authorization', `Bearer ${token}`)
      .query({ stageId: stage[0].id })
      .expect(200);
    expect(filtered.body).toEqual([
      expect.objectContaining({ id: recombined.body.id }),
    ]);
  });
});
