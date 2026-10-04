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
} from './../src/modules/catalog/entities/catalog.enums';
import {
  OrderStatus,
  PartSplitMode,
  PartStatus,
} from './../src/modules/orders/entities/order.enums';
import {
  PermissionAction,
  UserRole,
} from './../src/modules/users/entities/user.enums';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const codePrefix = `DASH-${suffix.slice(0, 18)}`;
  const password = 'Clave-Segura-123';
  const adminEmail = `dashboard-${suffix}@proma.test`;

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
      [
        'Admin Dashboard',
        adminEmail,
        await bcrypt.hash(password, 10),
        UserRole.ADMIN,
      ],
    );

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminEmail, password })
      .expect(201);
    adminToken = login.body.accessToken as string;
  });

  afterAll(async () => {
    await dataSource?.query('DELETE FROM orders WHERE external_code LIKE $1', [
      `${codePrefix}%`,
    ]);
    await dataSource?.query('DELETE FROM users WHERE email LIKE $1', [
      `%${suffix}@proma.test`,
    ]);
    await app?.close();
  });

  async function stageId(code: SectorCode): Promise<number> {
    const rows = await dataSource.query(
      'SELECT id FROM stages WHERE code = $1',
      [code],
    );
    return rows[0].id as number;
  }

  async function createToken(
    label: string,
    sectorCode: SectorCode,
    actions: PermissionAction[],
  ): Promise<string> {
    const email = `${label}-${suffix}@proma.test`;
    const user = await dataSource.query(
      `
        INSERT INTO users (full_name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        `Usuario ${label}`,
        email,
        await bcrypt.hash(password, 10),
        UserRole.USER,
      ],
    );
    for (const action of actions) {
      await dataSource.query(
        `
          INSERT INTO user_permissions (user_id, sector_code, action)
          VALUES ($1, $2, $3)
        `,
        [user[0].id, sectorCode, action],
      );
    }

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);
    return login.body.accessToken as string;
  }

  async function createOrder(label: string): Promise<{
    id: string;
    rootPartId: string;
    clientName: string;
    articleName: string;
    fabricName: string;
  }> {
    const clientName = `Cliente ${label} ${suffix}`;
    const articleName = `Articulo ${label} ${suffix}`;
    const fabricName = `Tela ${label} ${suffix}`;
    const tax = `30-${String(Math.floor(Math.random() * 89999999 + 10000000))}-9`;
    const createdBy = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail],
    );
    const client = await dataSource.query(
      `
        INSERT INTO clients (name, business_name, tax_id)
        VALUES ($1, $1, $2)
        RETURNING id
      `,
      [clientName, tax],
    );
    const article = await dataSource.query(
      `
        INSERT INTO articles (code, name)
        VALUES ($1, $2)
        RETURNING id
      `,
      [`DASH-ART-${label}-${suffix}`.slice(0, 80), articleName],
    );
    const fabric = await dataSource.query(
      `
        INSERT INTO fabrics (code, name, weave_type, format_type)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        `DASH-FAB-${label}-${suffix}`.slice(0, 80),
        fabricName,
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
    const size = await dataSource.query(
      `
        INSERT INTO size_curve_values (size_curve_id, label, sort_order)
        VALUES ($1, 'M', 1)
        RETURNING id
      `,
      [curve[0].id],
    );
    const order = await dataSource.query(
      `
        INSERT INTO orders (
          internal_code, external_code, client_id, article_id, fabric_id,
          size_curve_id, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        `OC-2099-${String(Math.floor(Math.random() * 899999 + 1)).padStart(6, '0')}`,
        `${codePrefix}-${label}`.slice(0, 50),
        client[0].id,
        article[0].id,
        fabric[0].id,
        curve[0].id,
        OrderStatus.ACTIVA,
        createdBy[0].id,
      ],
    );
    await dataSource.query(
      `
        INSERT INTO order_requested_items (
          order_id, size_curve_value_id, quantity_requested
        )
        VALUES ($1, $2, 10)
      `,
      [order[0].id, size[0].id],
    );
    const rootPart = await dataSource.query(
      `
        INSERT INTO order_parts (
          order_id, part_code, fabric_id, size_curve_value_id, quantity, status
        )
        VALUES ($1, 'P1', $2, $3, 10, $4)
        RETURNING id
      `,
      [order[0].id, fabric[0].id, size[0].id, PartStatus.PENDIENTE],
    );
    return {
      id: order[0].id as string,
      rootPartId: rootPart[0].id as string,
      clientName,
      articleName,
      fabricName,
    };
  }

  async function startPart(
    partId: string,
    stageCode: SectorCode,
    startedAt: Date,
    estimatedFinishAt?: Date,
  ): Promise<void> {
    const stage = await stageId(stageCode);
    await dataSource.query(
      `
        UPDATE order_parts
        SET status = $2, current_stage_id = $3
        WHERE id = $1
      `,
      [partId, PartStatus.EN_PROCESO, stage],
    );
    const user = await dataSource.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail],
    );
    await dataSource.query(
      `
        INSERT INTO part_stage_events (
          order_part_id, stage_id, execution_type, started_at,
          estimated_finish_at, performed_by
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        partId,
        stage,
        StageExecutionType.INTERNO,
        startedAt,
        estimatedFinishAt ?? null,
        user[0].id,
      ],
    );
  }

  it('returns prepared operational rows for simple, split and finalized orders', async () => {
    const simple = await createOrder('simple');
    await startPart(simple.rootPartId, SectorCode.CORTE, new Date());

    const split = await createOrder('split');
    await dataSource.query(
      `
        UPDATE order_parts
        SET status = $2, is_split = true
        WHERE id = $1
      `,
      [split.rootPartId, PartStatus.DIVIDIDA],
    );
    const corteId = await stageId(SectorCode.CORTE);
    const children = await dataSource.query(
      `
        INSERT INTO order_parts (
          order_id, parent_part_id, part_code, quantity, status,
          current_stage_id, split_mode
        )
        VALUES
          ($1, $2, 'P1-A', 4, $3, $4, $5),
          ($1, $2, 'P1-B', 6, $3, $4, $5)
        RETURNING id, part_code
      `,
      [
        split.id,
        split.rootPartId,
        PartStatus.EN_PROCESO,
        corteId,
        PartSplitMode.LOTE,
      ],
    );

    const finalized = await createOrder('done');
    await dataSource.query(
      `
        UPDATE orders
        SET status = $2, finalized_at = now()
        WHERE id = $1
      `,
      [finalized.id, OrderStatus.FINALIZADA],
    );
    await dataSource.query(
      `
        UPDATE order_parts
        SET status = $2
        WHERE id = $1
      `,
      [finalized.rootPartId, PartStatus.FINALIZADA],
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/orders-list')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: codePrefix })
      .expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          orderId: simple.id,
          partId: simple.rootPartId,
          externalCode: `${codePrefix}-simple`.slice(0, 50),
          clientName: simple.clientName,
          articleName: simple.articleName,
          stage: expect.objectContaining({ code: SectorCode.CORTE }),
          quantity: 10,
          rowType: 'SIMPLE',
        }),
        expect.objectContaining({
          orderId: split.id,
          partId: split.rootPartId,
          rowType: 'SPLIT_PARENT',
          statusLabel: 'Corte dividido',
        }),
        expect.objectContaining({
          orderId: split.id,
          partId: children[0].id,
          parentPartId: split.rootPartId,
          rowType: 'SPLIT_CHILD',
          partCode: 'P1-A',
          quantity: 4,
        }),
        expect.objectContaining({
          orderId: finalized.id,
          partId: finalized.rootPartId,
          orderStatus: OrderStatus.FINALIZADA,
          rowType: 'SIMPLE',
        }),
      ]),
    );
  });

  it('groups only active leaves by stage and respects sector permissions', async () => {
    const order = await createOrder('kanban');
    await dataSource.query(
      `
        UPDATE order_parts
        SET status = $2, is_split = true
        WHERE id = $1
      `,
      [order.rootPartId, PartStatus.DIVIDIDA],
    );
    const corteId = await stageId(SectorCode.CORTE);
    const bordadoId = await stageId(SectorCode.BORDADO);
    const parts = await dataSource.query(
      `
        INSERT INTO order_parts (
          order_id, parent_part_id, part_code, quantity, status,
          current_stage_id, split_mode, is_component_branch, recombined_into_part_id
        )
        VALUES
          ($1, $2, 'P1-A', 5, $3, $5, $7, false, NULL),
          ($1, $2, 'P1-B', 5, $4, $6, $8, true, NULL),
          ($1, $2, 'P1-C', 5, $9, $6, $8, true, NULL)
        RETURNING id, part_code
      `,
      [
        order.id,
        order.rootPartId,
        PartStatus.EN_PROCESO,
        PartStatus.REINTEGRADA,
        corteId,
        bordadoId,
        PartSplitMode.LOTE,
        PartSplitMode.COMPONENTE,
        PartStatus.DIVIDIDA,
      ],
    );

    const adminResponse = await request(app.getHttpServer())
      .get('/api/v1/dashboard/kanban')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: `${codePrefix}-kanban` })
      .expect(200);

    const corteColumn = adminResponse.body.stages.find(
      (column: { stage: { code: SectorCode } }) =>
        column.stage.code === SectorCode.CORTE,
    );
    const bordadoColumn = adminResponse.body.stages.find(
      (column: { stage: { code: SectorCode } }) =>
        column.stage.code === SectorCode.BORDADO,
    );
    expect(corteColumn.parts).toEqual([
      expect.objectContaining({ id: parts[0].id, partCode: 'P1-A' }),
    ]);
    expect(bordadoColumn.parts).toEqual([]);

    const sectorToken = await createToken('dashboard-corte', SectorCode.CORTE, [
      PermissionAction.VER,
    ]);
    const sectorResponse = await request(app.getHttpServer())
      .get('/api/v1/dashboard/kanban')
      .set('Authorization', `Bearer ${sectorToken}`)
      .expect(200);

    expect(sectorResponse.body.stages).toHaveLength(1);
    expect(sectorResponse.body.stages[0].stage.code).toBe(SectorCode.CORTE);
  });

  it('returns management summary counters from controlled fixtures', async () => {
    const active = await createOrder('summary-active');
    const repair = await createOrder('summary-repair');
    await dataSource.query(
      'UPDATE orders SET status = $2, repair_note = $3 WHERE id = $1',
      [repair.id, OrderStatus.EN_ARREGLO, 'Revisar costura'],
    );
    const bottleneck = await createOrder('summary-bottleneck');
    await startPart(
      bottleneck.rootPartId,
      SectorCode.CORTE,
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    );
    const overdue = await createOrder('summary-overdue');
    await startPart(
      overdue.rootPartId,
      SectorCode.BORDADO,
      new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    const finalized = await createOrder('summary-finalized');
    await dataSource.query(
      'UPDATE orders SET status = $2, finalized_at = now() WHERE id = $1',
      [finalized.id, OrderStatus.FINALIZADA],
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/dashboard/summary')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: `${codePrefix}-summary` })
      .expect(200);

    expect(response.body).toEqual({
      activeOrders: 3,
      inRepair: 1,
      bottlenecks: 2,
      overdue: 1,
      finalized: 1,
    });
    expect(active.id).toBeDefined();
  });
});
