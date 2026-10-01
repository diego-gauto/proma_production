import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { DataSource, DataSourceOptions, IsNull } from 'typeorm';
import { ArticleDecorationPart } from '../modules/articles/entities/article-decoration-part.entity';
import { ArticleFabric } from '../modules/articles/entities/article-fabric.entity';
import { Article } from '../modules/articles/entities/article.entity';
import { Client } from '../modules/clients/entities/client.entity';
import { Fabric } from '../modules/catalog/entities/fabric.entity';
import { SizeCurveValue } from '../modules/catalog/entities/size-curve-value.entity';
import { SizeCurve } from '../modules/catalog/entities/size-curve.entity';
import { Stage } from '../modules/catalog/entities/stage.entity';
import { Supply } from '../modules/catalog/entities/supply.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { OrderPart } from '../modules/orders/entities/order-part.entity';
import { OrderRequestedItem } from '../modules/orders/entities/order-requested-item.entity';
import { Order } from '../modules/orders/entities/order.entity';
import { PartStageEvent } from '../modules/orders/entities/part-stage-event.entity';
import { PartSupply } from '../modules/orders/entities/part-supply.entity';
import { SystemSetting } from '../modules/settings/entities/system-setting.entity';
import { User } from '../modules/users/entities/user.entity';
import { Workshop } from '../modules/workshops/entities/workshop.entity';
import {
  SectorCode,
  SizeSequenceType,
  StageExecutionType,
  SupplyCategory,
} from '../modules/catalog/entities/catalog.enums';
import { NotificationType } from '../modules/notifications/entities/notification.enums';
import {
  PartSplitMode,
  PartStatus,
  SupplyCompleteness,
} from '../modules/orders/entities/order.enums';
import { UserRole } from '../modules/users/entities/user.enums';
import dataSource from './data-source';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://proma:proma_dev@localhost:55432/produccion_textil';

describe('phase one data model', () => {
  let schemaName: string;
  let connection: DataSource;

  beforeAll(async () => {
    schemaName = `phase_one_${randomUUID().replace(/-/g, '')}`;
    process.env.ADMIN_INITIAL_FULL_NAME = 'Admin Inicial';
    process.env.ADMIN_INITIAL_EMAIL = `admin-initial-${randomUUID()}@proma.test`;
    process.env.ADMIN_INITIAL_PASSWORD = 'Password-Inicial-123';
    process.env.ADMIN_INITIAL_PASSWORD_HASH = 'hash-from-env-for-test';
    const options = dataSource.options as DataSourceOptions & {
      type: 'postgres';
    };
    connection = new DataSource({
      ...options,
      ...dataSource.options,
      url: databaseUrl,
      schema: schemaName,
      migrationsTableName: `migrations_${schemaName}`,
      entities: [
        Stage,
        SizeCurve,
        SizeCurveValue,
        Fabric,
        Supply,
        User,
        Client,
        Workshop,
        Article,
        ArticleFabric,
        ArticleDecorationPart,
        Order,
        OrderRequestedItem,
        OrderPart,
        PartStageEvent,
        PartSupply,
        Notification,
        SystemSetting,
      ],
    } as DataSourceOptions);

    await connection.initialize();
    await connection.query(`CREATE SCHEMA "${schemaName}"`);
    await connection.query(`SET search_path TO "${schemaName}", public`);
    await connection.runMigrations();
  });

  afterAll(async () => {
    if (connection?.isInitialized) {
      await connection.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`);
      await connection.destroy();
    }
  });

  it('runs migrations and seeds the ten production stages', async () => {
    const stages = await connection
      .getRepository(Stage)
      .find({ order: { sequenceOrder: 'ASC' } });

    expect(stages).toHaveLength(10);
    expect(stages.map((stage) => stage.code)).toEqual([
      'CORTE',
      'BORDADO',
      'ESTAMPADO',
      'AVIOS_CONFECCION',
      'CONFECCION',
      'ATRAQUE',
      'OJAL_BOTON',
      'AVIOS_TERMINACION',
      'PLANCHA',
      'TERMINACION',
    ]);

    const confeccion = stages.find((stage) => stage.code === 'CONFECCION');
    expect(confeccion?.excludedFromBottleneckAlerts).toBe(true);
  });

  it('seeds one alphabetic and one numeric size curve with ordered values', async () => {
    const curves = await connection.getRepository(SizeCurve).find({
      relations: { values: true },
      order: { name: 'ASC', values: { sortOrder: 'ASC' } },
    });

    expect(curves).toHaveLength(2);
    expect(curves.map((curve) => curve.sequenceType).sort()).toEqual([
      SizeSequenceType.ALFABETICA,
      SizeSequenceType.NUMERICA,
    ]);
    expect(curves.every((curve) => curve.values.length >= 3)).toBe(true);
  });

  it('stores articles with fabrics and decoration parts through TypeORM relations', async () => {
    const sizeCurve = await connection
      .getRepository(SizeCurve)
      .findOneByOrFail({
        sequenceType: SizeSequenceType.ALFABETICA,
      });
    const mainFabric = await connection
      .getRepository(Fabric)
      .save({ name: 'Gabardina', color: 'Azul' });
    const secondaryFabric = await connection
      .getRepository(Fabric)
      .save({ name: 'Ripstop', color: 'Negro' });

    const article = await connection.getRepository(Article).save({
      name: 'Camisa de trabajo',
      description: 'Manga larga',
      sizeCurve,
      fabrics: [
        { fabric: mainFabric, role: 'PRINCIPAL', garmentPart: 'Cuerpo' },
        { fabric: secondaryFabric, role: 'SECUNDARIA', garmentPart: 'Cuello' },
      ],
      decorationParts: [
        { garmentPart: 'Manga izquierda', decorationType: 'BORDADO' },
      ],
    });

    const stored = await connection.getRepository(Article).findOneOrFail({
      where: { id: article.id },
      relations: { fabrics: { fabric: true }, decorationParts: true },
    });

    expect(stored.fabrics).toHaveLength(2);
    expect(stored.decorationParts).toHaveLength(1);
    expect(stored.fabrics.map((fabric) => fabric.role).sort()).toEqual([
      'PRINCIPAL',
      'SECUNDARIA',
    ]);
  });

  it('stores orders with root and child parts, split metadata, events, supplies, and notifications', async () => {
    const corte = await connection
      .getRepository(Stage)
      .findOneByOrFail({ code: SectorCode.CORTE });
    const sizeValue = await connection
      .getRepository(SizeCurveValue)
      .findOneOrFail({
        where: { label: 'M' },
        relations: { sizeCurve: true },
      });
    const fabric = await connection
      .getRepository(Fabric)
      .save({ name: 'Grafa', color: 'Verde' });
    const supply = await connection
      .getRepository(Supply)
      .save({ name: 'Cierre 20cm', category: SupplyCategory.CONFECCION });
    const user = await connection.getRepository(User).save({
      fullName: 'Admin Proma',
      email: `admin-${randomUUID()}@proma.test`,
      passwordHash: 'hash-from-env-placeholder',
      role: UserRole.ADMIN,
    });
    const client = await connection
      .getRepository(Client)
      .save({ name: 'Cliente Test' });
    const article = await connection.getRepository(Article).save({
      name: 'Pantalon cargo',
      sizeCurve: sizeValue.sizeCurve,
    });

    const order = await connection.getRepository(Order).save({
      internalCode: `OC-2026-${Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, '0')}`,
      externalCode: `EXT-${randomUUID()}`,
      client,
      article,
      createdBy: user,
      requestedItems: [
        {
          fabric,
          color: 'Verde',
          sizeCurveValue: sizeValue,
          quantityRequested: 40,
        },
      ],
      parts: [
        {
          partCode: 'P-0001-01',
          fabric,
          color: 'Verde',
          quantity: 40,
          currentStage: corte,
        },
      ],
    });

    const rootPart = await connection.getRepository(OrderPart).findOneOrFail({
      where: { order: { id: order.id }, parentPart: IsNull() },
    });

    const childPart = await connection.getRepository(OrderPart).save({
      order,
      parentPart: rootPart,
      partCode: 'P-0001-01-A',
      fabric,
      color: 'Verde',
      quantity: 20,
      splitMode: PartSplitMode.COMPONENTE,
      isComponentBranch: true,
      status: PartStatus.REINTEGRADA,
      recombinedIntoPart: rootPart,
      splitReason: 'Manga izquierda a bordar',
    });

    await connection.getRepository(PartStageEvent).save({
      orderPart: rootPart,
      stage: corte,
      executionType: StageExecutionType.INTERNO,
      startedAt: new Date('2026-09-01T10:00:00.000Z'),
      finishedAt: new Date('2026-09-02T10:00:00.000Z'),
      performedBy: user,
    });
    await connection.getRepository(PartSupply).save({
      orderPart: rootPart,
      supply,
      completeness: SupplyCompleteness.PARCIAL,
      quantityNeeded: 40,
      quantityAvailable: 20,
      updatedBy: user,
    });
    await connection.getRepository(Notification).save({
      type: NotificationType.INGRESO_ORDEN,
      order,
      orderPart: rootPart,
      stage: corte,
      message: 'Nueva orden ingresada',
      recipientUser: user,
    });

    const storedChild = await connection
      .getRepository(OrderPart)
      .findOneOrFail({
        where: { id: childPart.id },
        relations: {
          parentPart: true,
          recombinedIntoPart: true,
          events: true,
          supplies: { supply: true },
        },
      });

    expect(storedChild.parentPart!.id).toBe(rootPart.id);
    expect(storedChild.splitMode).toBe(PartSplitMode.COMPONENTE);
    expect(storedChild.isComponentBranch).toBe(true);
    expect(storedChild.status).toBe(PartStatus.REINTEGRADA);
    expect(storedChild.recombinedIntoPart!.id).toBe(rootPart.id);
  });

  it('seeds the bottleneck threshold system setting', async () => {
    const setting = await connection
      .getRepository(SystemSetting)
      .findOneByOrFail({ key: 'bottleneck_threshold_days' });

    expect(setting.value).toBe('3');
  });

  it('seeds the initial admin user from environment variables', async () => {
    const admin = await connection
      .getRepository(User)
      .findOneByOrFail({ email: process.env.ADMIN_INITIAL_EMAIL });

    expect(admin.fullName).toBe('Admin Inicial');
    expect(admin.role).toBe(UserRole.ADMIN);
    expect(admin.passwordHash).not.toBe('Password-Inicial-123');
    expect(
      await bcrypt.compare('Password-Inicial-123', admin.passwordHash),
    ).toBe(true);
  });
});
