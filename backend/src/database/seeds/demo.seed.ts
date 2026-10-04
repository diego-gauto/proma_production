import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import {
  FabricFormatType,
  FabricWeaveType,
  SectorCode,
  SizeSequenceType,
  StageExecutionType,
  SupplyCategory,
} from '../../modules/catalog/entities/catalog.enums';
import { OrderStatus, PartStatus } from '../../modules/orders/entities/order.enums';
import { PermissionAction, UserRole } from '../../modules/users/entities/user.enums';

type IdRow = { id: string };
type NumericIdRow = { id: number };

const DEMO_PASSWORD = 'Demo-Proma-123';

export async function seedDemoData(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const admin = await upsertUser(
      manager,
      'Admin Demo',
      'admin@demo.proma.local',
      UserRole.ADMIN,
      passwordHash,
      [],
    );

    for (const sector of Object.values(SectorCode)) {
      await upsertUser(
        manager,
        `Sector ${sector}`,
        `${sector.toLowerCase()}@demo.proma.local`,
        UserRole.USER,
        passwordHash,
        [
          { sectorCode: sector, action: PermissionAction.VER },
          { sectorCode: sector, action: PermissionAction.INICIAR_ETAPA },
          { sectorCode: sector, action: PermissionAction.FINALIZAR_ETAPA },
        ],
      );
    }
    await upsertUser(
      manager,
      'Produccion Demo',
      'produccion@demo.proma.local',
      UserRole.USER,
      passwordHash,
      [
        { sectorCode: null, action: PermissionAction.VER },
        { sectorCode: null, action: PermissionAction.CREAR },
        { sectorCode: null, action: PermissionAction.EDITAR },
        { sectorCode: null, action: PermissionAction.FORZAR_CAMBIO },
      ],
    );

    const clients = await Promise.all([
      upsertClient(manager, 'Demo Metalurgica Norte', 'DEMO-CLIENTE-1'),
      upsertClient(manager, 'Demo Servicios Sur', 'DEMO-CLIENTE-2'),
    ]);
    const workshops = await Promise.all([
      upsertWorkshop(manager, 'Demo Taller Confeccion', [SectorCode.CONFECCION]),
      upsertWorkshop(manager, 'Demo Ojal y Boton', [SectorCode.OJAL_BOTON]),
      upsertWorkshop(manager, 'Demo Plancha Externa', [SectorCode.PLANCHA]),
    ]);
    const fabrics = await Promise.all([
      upsertFabric(manager, 'DEMO-TELA-GABARDINA', 'Gabardina azul demo'),
      upsertFabric(manager, 'DEMO-TELA-RIPSTOP', 'Ripstop gris demo'),
    ]);
    const supplies = await Promise.all([
      upsertSupply(manager, 'DEMO-AVIO-CIERRE', 'Cierre reforzado', SupplyCategory.CONFECCION),
      upsertSupply(manager, 'DEMO-AVIO-BOTON', 'Boton metalico', SupplyCategory.TERMINACION),
    ]);
    const curve = await upsertSizeCurve(manager);
    const articles = await Promise.all([
      upsertArticle(manager, 'DEMO-ART-CAMPERA', 'Campera demo', supplies),
      upsertArticle(manager, 'DEMO-ART-PANTALON', 'Pantalon demo', supplies),
    ]);

    await ensureOrder(manager, {
      externalCode: 'DEMO-ORDEN-001',
      internalCode: 'DEMO-OC-001',
      clientId: clients[0].id,
      articleId: articles[0].id,
      fabricId: fabrics[0].id,
      sizeCurveId: curve.id,
      sizeValueId: curve.sizeValueIds[0],
      quantity: 40,
      createdById: admin.id,
      partStatus: PartStatus.EN_PROCESO,
      stageCode: SectorCode.CORTE,
      executionType: StageExecutionType.INTERNO,
    });
    await ensureOrder(manager, {
      externalCode: 'DEMO-ORDEN-002',
      internalCode: 'DEMO-OC-002',
      clientId: clients[1].id,
      articleId: articles[0].id,
      fabricId: fabrics[0].id,
      sizeCurveId: curve.id,
      sizeValueId: curve.sizeValueIds[1],
      quantity: 25,
      createdById: admin.id,
      partStatus: PartStatus.EN_PROCESO,
      stageCode: SectorCode.CONFECCION,
      executionType: StageExecutionType.EXTERNO,
      workshopId: workshops[0].id,
    });
    await ensureOrder(manager, {
      externalCode: 'DEMO-ORDEN-003',
      internalCode: 'DEMO-OC-003',
      clientId: clients[0].id,
      articleId: articles[1].id,
      fabricId: fabrics[1].id,
      sizeCurveId: curve.id,
      sizeValueId: curve.sizeValueIds[2],
      quantity: 18,
      createdById: admin.id,
      partStatus: PartStatus.EN_PROCESO,
      stageCode: SectorCode.PLANCHA,
      executionType: StageExecutionType.EXTERNO,
      workshopId: workshops[2].id,
      estimatedDaysOffset: -1,
    });
    await ensureOrder(manager, {
      externalCode: 'DEMO-ORDEN-004',
      internalCode: 'DEMO-OC-004',
      clientId: clients[1].id,
      articleId: articles[1].id,
      fabricId: fabrics[1].id,
      sizeCurveId: curve.id,
      sizeValueId: curve.sizeValueIds[0],
      quantity: 12,
      createdById: admin.id,
      orderStatus: OrderStatus.EN_ARREGLO,
      repairNote: 'Demo: revisar costura de muestra.',
      partStatus: PartStatus.PENDIENTE,
    });
    await ensureOrder(manager, {
      externalCode: 'DEMO-ORDEN-005',
      internalCode: 'DEMO-OC-005',
      clientId: clients[0].id,
      articleId: articles[0].id,
      fabricId: fabrics[0].id,
      sizeCurveId: curve.id,
      sizeValueId: curve.sizeValueIds[1],
      quantity: 30,
      createdById: admin.id,
      orderStatus: OrderStatus.FINALIZADA,
      partStatus: PartStatus.FINALIZADA,
      finalized: true,
    });
  });
}

async function upsertUser(
  manager: DataSource['manager'],
  fullName: string,
  email: string,
  role: UserRole,
  passwordHash: string,
  permissions: { sectorCode: SectorCode | null; action: PermissionAction }[],
): Promise<IdRow> {
  const rows = await manager.query(
    `
      INSERT INTO users (full_name, email, password_hash, role, is_active)
      VALUES ($1, $2, $3, $4, true)
      ON CONFLICT (email)
      DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, is_active = true, updated_at = now()
      RETURNING id
    `,
    [fullName, email, passwordHash, role],
  );
  const userId = rows[0].id as string;
  await manager.query('DELETE FROM user_permissions WHERE user_id = $1', [userId]);
  for (const permission of permissions) {
    await manager.query(
      `
        INSERT INTO user_permissions (user_id, sector_code, action, is_allowed)
        VALUES ($1, $2, $3, true)
      `,
      [userId, permission.sectorCode, permission.action],
    );
  }
  return { id: userId };
}

async function upsertClient(manager: DataSource['manager'], businessName: string, taxId: string): Promise<IdRow> {
  const existing = await manager.query('SELECT id FROM clients WHERE tax_id = $1', [taxId]);
  if (existing.length > 0) {
    await manager.query(
      'UPDATE clients SET name = $2, business_name = $2, is_active = true, updated_at = now() WHERE id = $1',
      [existing[0].id, businessName],
    );
    return { id: existing[0].id as string };
  }
  const rows = await manager.query(
    `
      INSERT INTO clients (name, business_name, tax_id, locality, province)
      VALUES ($1, $1, $2, 'San Martin', 'Buenos Aires')
      RETURNING id
    `,
    [businessName, taxId],
  );
  return { id: rows[0].id as string };
}

async function upsertWorkshop(manager: DataSource['manager'], name: string, specialties: SectorCode[]): Promise<IdRow> {
  const existing = await manager.query('SELECT id FROM workshops WHERE name = $1', [name]);
  if (existing.length > 0) {
    await manager.query('UPDATE workshops SET specialties = $2, is_active = true, updated_at = now() WHERE id = $1', [existing[0].id, specialties]);
    return { id: existing[0].id as string };
  }
  const rows = await manager.query(
    `
      INSERT INTO workshops (name, address, locality, province, specialties)
      VALUES ($1, 'Calle demo 123', 'San Martin', 'Buenos Aires', $2)
      RETURNING id
    `,
    [name, specialties],
  );
  return { id: rows[0].id as string };
}

async function upsertFabric(manager: DataSource['manager'], code: string, name: string): Promise<IdRow> {
  const rows = await manager.query(
    `
      INSERT INTO fabrics (code, name, color, weave_type, format_type, supplier)
      VALUES ($1, $2, 'Azul', $3, $4, 'Proveedor demo')
      ON CONFLICT (code)
      DO UPDATE SET name = EXCLUDED.name, is_active = true, updated_at = now()
      RETURNING id
    `,
    [code, name, FabricWeaveType.PLANO, FabricFormatType.ABIERTO],
  );
  return { id: rows[0].id as string };
}

async function upsertSupply(
  manager: DataSource['manager'],
  code: string,
  name: string,
  category: SupplyCategory,
): Promise<IdRow> {
  const rows = await manager.query(
    `
      INSERT INTO supplies (code, name, category, supplier)
      VALUES ($1, $2, $3, 'Proveedor demo')
      ON CONFLICT (code)
      DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true, updated_at = now()
      RETURNING id
    `,
    [code, name, category],
  );
  return { id: rows[0].id as string };
}

async function upsertSizeCurve(manager: DataSource['manager']): Promise<{ id: number; sizeValueIds: number[] }> {
  const existing = await manager.query('SELECT id FROM size_curves WHERE name = $1', ['Demo Alfanumerica']);
  const curveId = existing.length > 0
    ? (existing[0].id as number)
    : ((await manager.query(
        'INSERT INTO size_curves (name, sequence_type) VALUES ($1, $2) RETURNING id',
        ['Demo Alfanumerica', SizeSequenceType.ALFABETICA],
      ))[0].id as number);
  const labels = ['S', 'M', 'L'];
  const ids: number[] = [];
  for (const [index, label] of labels.entries()) {
    const rows = await manager.query(
      `
        INSERT INTO size_curve_values (size_curve_id, label, sort_order)
        VALUES ($1, $2, $3)
        ON CONFLICT (size_curve_id, label)
        DO UPDATE SET sort_order = EXCLUDED.sort_order
        RETURNING id
      `,
      [curveId, label, index + 1],
    );
    ids.push(rows[0].id as number);
  }
  return { id: curveId, sizeValueIds: ids };
}

async function upsertArticle(manager: DataSource['manager'], code: string, name: string, supplies: IdRow[]): Promise<IdRow> {
  const rows = await manager.query(
    `
      INSERT INTO articles (code, name, description)
      VALUES ($1, $2, 'Articulo demo para pruebas del MVP')
      ON CONFLICT (code)
      DO UPDATE SET name = EXCLUDED.name, is_active = true, updated_at = now()
      RETURNING id
    `,
    [code, name],
  );
  const articleId = rows[0].id as string;
  for (const supply of supplies) {
    await manager.query(
      `
        INSERT INTO article_supplies (article_id, supply_id, quantity, note)
        SELECT $1, $2, 1, 'Demo'
        WHERE NOT EXISTS (
          SELECT 1 FROM article_supplies WHERE article_id = $1 AND supply_id = $2
        )
      `,
      [articleId, supply.id],
    );
  }
  await manager.query(
    `
      INSERT INTO article_decoration_parts (article_id, garment_part, decoration_type)
      SELECT $1, 'Pecho', 'BORDADO'
      WHERE NOT EXISTS (
        SELECT 1 FROM article_decoration_parts WHERE article_id = $1 AND garment_part = 'Pecho'
      )
    `,
    [articleId],
  );
  return { id: articleId };
}

async function ensureOrder(
  manager: DataSource['manager'],
  input: {
    externalCode: string;
    internalCode: string;
    clientId: string;
    articleId: string;
    fabricId: string;
    sizeCurveId: number;
    sizeValueId: number;
    quantity: number;
    createdById: string;
    orderStatus?: OrderStatus;
    repairNote?: string;
    partStatus: PartStatus;
    stageCode?: SectorCode;
    executionType?: StageExecutionType;
    workshopId?: string;
    estimatedDaysOffset?: number;
    finalized?: boolean;
  },
): Promise<void> {
  const existing = await manager.query('SELECT id FROM orders WHERE external_code = $1', [input.externalCode]);
  if (existing.length > 0) {
    return;
  }
  const orderRows = await manager.query(
    `
      INSERT INTO orders (
        internal_code, external_code, client_id, article_id, fabric_id, size_curve_id,
        status, repair_note, created_by, finalized_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${input.finalized ? 'now()' : 'NULL'})
      RETURNING id
    `,
    [
      input.internalCode,
      input.externalCode,
      input.clientId,
      input.articleId,
      input.fabricId,
      input.sizeCurveId,
      input.orderStatus ?? OrderStatus.ACTIVA,
      input.repairNote ?? null,
      input.createdById,
    ],
  );
  const orderId = orderRows[0].id as string;
  await manager.query(
    `
      INSERT INTO order_requested_items (order_id, fabric_id, size_curve_value_id, quantity_requested)
      VALUES ($1, $2, $3, $4)
    `,
    [orderId, input.fabricId, input.sizeValueId, input.quantity],
  );
  const stage = input.stageCode
    ? ((await manager.query('SELECT id FROM stages WHERE code = $1', [input.stageCode]))[0] as NumericIdRow)
    : null;
  const partRows = await manager.query(
    `
      INSERT INTO order_parts (order_id, part_code, fabric_id, size_curve_value_id, quantity, status, current_stage_id)
      VALUES ($1, 'P1', $2, $3, $4, $5, $6)
      RETURNING id
    `,
    [orderId, input.fabricId, input.sizeValueId, input.quantity, input.partStatus, stage?.id ?? null],
  );
  if (stage) {
    await manager.query(
      `
        INSERT INTO part_stage_events (
          order_part_id, stage_id, execution_type, workshop_id, started_at,
          estimated_finish_at, finished_at, performed_by
        )
        VALUES ($1, $2, $3, $4, now() - interval '2 days', now() + ($5::int * interval '1 day'), NULL, $6)
      `,
      [
        partRows[0].id,
        stage.id,
        input.executionType ?? StageExecutionType.INTERNO,
        input.workshopId ?? null,
        input.estimatedDaysOffset ?? 2,
        input.createdById,
      ],
    );
  }
}
