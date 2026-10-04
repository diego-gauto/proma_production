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
  SupplyCategory,
} from './../src/modules/catalog/entities/catalog.enums';
import { PermissionAction, UserRole } from './../src/modules/users/entities/user.enums';

describe('Masters CRUD (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let userToken: string;
  let managerToken: string;

  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const adminEmail = `admin-${suffix}@proma.test`;
  const userEmail = `user-${suffix}@proma.test`;
  const managerEmail = `manager-${suffix}@proma.test`;
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
        VALUES ($1, $2, $3, $4), ($5, $6, $7, $8), ($9, $10, $11, $12)
      `,
      [
        'Admin Masters',
        adminEmail,
        await bcrypt.hash(password, 10),
        UserRole.ADMIN,
        'User Masters',
        userEmail,
        await bcrypt.hash(password, 10),
        UserRole.USER,
        'Manager Masters',
        managerEmail,
        await bcrypt.hash(password, 10),
        UserRole.USER,
      ],
    );

    await dataSource.query(
      `
        INSERT INTO user_permissions (user_id, sector_code, action)
        SELECT id, NULL, unnest($2::permission_action[])
        FROM users
        WHERE email = $1
      `,
      [
        managerEmail,
        [
          PermissionAction.VER,
          PermissionAction.CREAR,
          PermissionAction.EDITAR,
          PermissionAction.ELIMINAR,
          PermissionAction.ADMINISTRAR,
        ],
      ],
    );

    adminToken = await login(adminEmail);
    userToken = await login(userEmail);
    managerToken = await login(managerEmail);
  });

  afterAll(async () => {
    await dataSource?.query('DELETE FROM users WHERE email IN ($1, $2, $3)', [
      adminEmail,
      userEmail,
      managerEmail,
    ]);
    await app?.close();
  });

  async function login(email: string): Promise<string> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body.accessToken as string;
  }

  function auth(req: request.Test, token = adminToken): request.Test {
    return req.set('Authorization', `Bearer ${token}`);
  }

  it('supports clients with full address and multiple contacts', async () => {
    await auth(
      request(app.getHttpServer()).post('/api/v1/clients').send({
        businessName: `Cliente sin permiso ${suffix}`,
        taxId: '20-11111111-1',
      }),
      userToken,
    ).expect(403);

    const created = await auth(
      request(app.getHttpServer()).post('/api/v1/clients').send({
        businessName: `Razón Social ${suffix}`,
        taxId: '30-12345678-9',
        address: 'Av. Siempre Viva 742',
        locality: 'San Martín',
        district: 'General San Martín',
        province: 'Buenos Aires',
        contacts: [
          {
            contactName: 'Compras Uno',
            email: 'compras1@example.com',
            fixedPhone: '011-4444-1111',
            mobilePhone1: '11-1111-1111',
            mobilePhone2: '11-2222-2222',
            roleNote: 'Compras',
            isPrimary: true,
          },
          {
            contactName: 'Producción Dos',
            email: 'prod2@example.com',
            mobilePhone1: '11-3333-3333',
            mobilePhone2: '11-4444-4444',
          },
        ],
      }),
    ).expect(201);

    expect(created.body).toMatchObject({
      businessName: `Razón Social ${suffix}`,
      taxId: '30-12345678-9',
      locality: 'San Martín',
    });
    expect(created.body.contacts).toHaveLength(2);
    expect(created.body.contacts[0]).toMatchObject({
      contactName: 'Compras Uno',
      mobilePhone1: '11-1111-1111',
      mobilePhone2: '11-2222-2222',
    });

    const listed = await auth(
      request(app.getHttpServer()).get('/api/v1/clients').query({ search: suffix }),
    ).expect(200);
    expect(listed.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
    );

    await auth(
      request(app.getHttpServer())
        .patch(`/api/v1/clients/${created.body.id}`)
        .send({
          locality: 'Villa Lynch',
          contacts: [
            {
              contactName: 'Contacto Editado',
              email: 'editado@example.com',
              fixedPhone: '011-5555-5555',
              mobilePhone1: '11-5555-5555',
              mobilePhone2: '11-6666-6666',
              isPrimary: true,
            },
          ],
        }),
    )
      .expect(200)
      .expect(({ body }) => {
        expect(body.locality).toBe('Villa Lynch');
        expect(body.contacts).toHaveLength(1);
        expect(body.contacts[0].contactName).toBe('Contacto Editado');
      });
  });

  it('supports workshops with contacts, specialties, and no tax id', async () => {
    const created = await auth(
      request(app.getHttpServer()).post('/api/v1/workshops').send({
        name: `Taller ${suffix}`,
        address: 'Calle Taller 123',
        locality: 'Morón',
        district: 'Morón',
        province: 'Buenos Aires',
        specialties: [SectorCode.CONFECCION, SectorCode.PLANCHA],
        contacts: [
          {
            contactName: 'Encargado Taller',
            email: 'taller@example.com',
            fixedPhone: '011-4000-0000',
            mobilePhone1: '11-7000-0000',
            mobilePhone2: '11-8000-0000',
          },
        ],
      }),
    ).expect(201);

    expect(created.body.taxId).toBeUndefined();
    expect(created.body.contacts).toHaveLength(1);

    const filtered = await auth(
      request(app.getHttpServer())
        .get('/api/v1/workshops')
        .query({ specialty: SectorCode.CONFECCION, search: suffix }),
    ).expect(200);
    expect(filtered.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
    );
  });

  it('supports fabrics, supplies, and mixed size curves with real fields', async () => {
    const fabric = await auth(
      request(app.getHttpServer()).post('/api/v1/fabrics').send({
        code: `TELA-${suffix}`,
        name: 'Frisa pesada',
        color: 'Azul marino',
        weightOz: 8.5,
        supplier: 'Proveedor Textil',
        weaveType: FabricWeaveType.PUNTO,
        formatType: FabricFormatType.TUBULAR,
      }),
      managerToken,
    ).expect(201);
    expect(fabric.body).toMatchObject({
      code: `TELA-${suffix}`,
      weightOz: '8.50',
      supplier: 'Proveedor Textil',
      weaveType: FabricWeaveType.PUNTO,
      formatType: FabricFormatType.TUBULAR,
    });

    const fabricFiltered = await auth(
      request(app.getHttpServer()).get('/api/v1/fabrics').query({
        supplier: 'Proveedor Textil',
        weaveType: FabricWeaveType.PUNTO,
        formatType: FabricFormatType.TUBULAR,
        search: suffix,
      }),
    ).expect(200);
    expect(fabricFiltered.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fabric.body.id })]),
    );

    const supply = await auth(
      request(app.getHttpServer()).post('/api/v1/supplies').send({
        code: `AVIO-${suffix}`,
        name: 'Cierre reforzado',
        description: 'Cierre diente perro 20cm',
        color: 'Negro',
        supplier: 'Proveedor Avíos',
        category: SupplyCategory.CONFECCION,
      }),
    ).expect(201);
    expect(supply.body).toMatchObject({
      code: `AVIO-${suffix}`,
      description: 'Cierre diente perro 20cm',
      category: SupplyCategory.CONFECCION,
    });

    const curve = await auth(
      request(app.getHttpServer()).post('/api/v1/size-curves').send({
        name: `Mixta ${suffix}`,
        sequenceType: SizeSequenceType.MIXTA,
        values: [
          { label: 'S', sortOrder: 1 },
          { label: 'M', sortOrder: 2 },
          { label: 'Especial', sortOrder: 3 },
        ],
      }),
    ).expect(201);
    expect(curve.body.values).toEqual([
      expect.objectContaining({ label: 'S', sortOrder: 1 }),
      expect.objectContaining({ label: 'M', sortOrder: 2 }),
      expect.objectContaining({ label: 'Especial', sortOrder: 3 }),
    ]);
  });

  it('supports articles with supplies and decoration parts, without fabrics or size curves', async () => {
    const supplyOne = await auth(
      request(app.getHttpServer()).post('/api/v1/supplies').send({
        code: `ART-SUP-1-${suffix}`,
        name: 'Botón negro',
        color: 'Negro',
        supplier: 'Proveedor Avíos',
        category: SupplyCategory.TERMINACION,
      }),
    ).expect(201);
    const supplyTwo = await auth(
      request(app.getHttpServer()).post('/api/v1/supplies').send({
        code: `ART-SUP-2-${suffix}`,
        name: 'Etiqueta talle',
        color: 'Blanco',
        supplier: 'Proveedor Avíos',
        category: SupplyCategory.CONFECCION,
      }),
    ).expect(201);

    await auth(
      request(app.getHttpServer()).post('/api/v1/articles').send({
        code: `ART-INVALID-${suffix}`,
        name: 'Artículo inválido',
        sizeCurveId: 1,
        fabrics: [],
        supplies: [],
        decorationParts: [],
      }),
    ).expect(400);

    const article = await auth(
      request(app.getHttpServer()).post('/api/v1/articles').send({
        code: `ART-${suffix}`,
        name: 'Campera softshell',
        description: 'Producto a cortar',
        supplies: [
          { supplyId: supplyOne.body.id, quantity: 4, note: 'Puños' },
          { supplyId: supplyTwo.body.id, quantity: 1, note: 'Interior' },
        ],
        decorationParts: [
          { garmentPart: 'Pecho izquierdo', decorationType: 'BORDADO' },
          { garmentPart: 'Espalda', decorationType: 'ESTAMPADO' },
        ],
      }),
    ).expect(201);

    expect(article.body).toMatchObject({
      code: `ART-${suffix}`,
      name: 'Campera softshell',
    });
    expect(article.body.sizeCurve).toBeUndefined();
    expect(article.body.fabrics).toBeUndefined();
    expect(article.body.supplies).toHaveLength(2);
    expect(article.body.decorationParts).toHaveLength(2);
  });

  it('supports users with custom permissions and hides password hashes', async () => {
    const created = await auth(
      request(app.getHttpServer()).post('/api/v1/users').send({
        fullName: 'Operario Bordado',
        email: `bordado-${suffix}@proma.test`,
        password,
        role: UserRole.USER,
        permissions: [
          { sectorCode: SectorCode.BORDADO, action: PermissionAction.VER },
          { sectorCode: SectorCode.BORDADO, action: PermissionAction.INICIAR_ETAPA },
          { sectorCode: SectorCode.BORDADO, action: PermissionAction.FINALIZAR_ETAPA },
        ],
      }),
    ).expect(201);

    expect(created.body.passwordHash).toBeUndefined();
    expect(created.body.stageId).toBeUndefined();
    expect(created.body.permissions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sectorCode: SectorCode.BORDADO,
          action: PermissionAction.VER,
          isAllowed: true,
        }),
      ]),
    );

    const listed = await auth(
      request(app.getHttpServer()).get('/api/v1/users').query({ search: suffix }),
    ).expect(200);
    expect(listed.body.items[0].passwordHash).toBeUndefined();
    expect(listed.body.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.body.id })]),
    );
  });
});
