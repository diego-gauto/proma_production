import * as bcrypt from 'bcrypt';
import { readFileSync } from 'fs';
import { join } from 'path';
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

type DemoPermission = { sectorCode: SectorCode | null; action: PermissionAction };
type DemoData = {
  password: string;
  users: { fullName: string; email: string; role: UserRole; permissions: DemoPermission[] }[];
  clients: { businessName: string; taxId: string }[];
  workshops: { name: string; specialties: SectorCode[] }[];
  fabrics: { code: string; name: string }[];
  supplies: { code: string; name: string; category: SupplyCategory }[];
  sizeCurve: { name: string; sequenceType: SizeSequenceType; values: string[] };
  articles: { code: string; name: string }[];
  orders: {
    externalCode: string;
    internalCode: string;
    clientTaxId: string;
    articleCode: string;
    fabricCode: string;
    sizeLabel: string;
    quantity: number;
    orderStatus?: OrderStatus;
    repairNote?: string;
    partStatus: PartStatus;
    stageCode?: SectorCode;
    executionType?: StageExecutionType;
    workshopName?: string;
    estimatedDaysOffset?: number;
    finalized?: boolean;
  }[];
};

function loadDemoData(): DemoData {
  const filePath = join(__dirname, '..', 'data', 'demo-data.json');
  return JSON.parse(readFileSync(filePath, 'utf8')) as DemoData;
}

export async function seedDemoData(dataSource: DataSource): Promise<void> {
  const demoData = loadDemoData();
  await dataSource.transaction(async (manager) => {
    const passwordHash = await bcrypt.hash(demoData.password, 10);
    const usersByEmail = new Map<string, IdRow>();

    for (const user of demoData.users) {
      usersByEmail.set(
        user.email,
        await upsertUser(
          manager,
          user.fullName,
          user.email,
          user.role,
          passwordHash,
          user.permissions,
        ),
      );
    }

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

    const clients = new Map<string, IdRow>();
    for (const client of demoData.clients) {
      clients.set(client.taxId, await upsertClient(manager, client.businessName, client.taxId));
    }

    const workshops = new Map<string, IdRow>();
    for (const workshop of demoData.workshops) {
      workshops.set(workshop.name, await upsertWorkshop(manager, workshop.name, workshop.specialties));
    }

    const fabrics = new Map<string, IdRow>();
    for (const fabric of demoData.fabrics) {
      fabrics.set(fabric.code, await upsertFabric(manager, fabric.code, fabric.name));
    }

    const supplies: IdRow[] = [];
    for (const supply of demoData.supplies) {
      supplies.push(await upsertSupply(manager, supply.code, supply.name, supply.category));
    }

    const curve = await upsertSizeCurve(manager, demoData.sizeCurve);
    const articles = new Map<string, IdRow>();
    for (const article of demoData.articles) {
      articles.set(article.code, await upsertArticle(manager, article.code, article.name, supplies));
    }

    const admin = usersByEmail.get('admin@demo.proma.local');
    if (!admin) {
      throw new Error('Demo data must include admin@demo.proma.local');
    }

    for (const order of demoData.orders) {
      await ensureOrder(manager, {
        externalCode: order.externalCode,
        internalCode: order.internalCode,
        clientId: requireDemoId(clients, order.clientTaxId, 'client'),
        articleId: requireDemoId(articles, order.articleCode, 'article'),
        fabricId: requireDemoId(fabrics, order.fabricCode, 'fabric'),
        sizeCurveId: curve.id,
        sizeValueId: requireSizeValueId(curve.sizeValueIdsByLabel, order.sizeLabel),
        quantity: order.quantity,
        createdById: admin.id,
        orderStatus: order.orderStatus,
        repairNote: order.repairNote,
        partStatus: order.partStatus,
        stageCode: order.stageCode,
        executionType: order.executionType,
        workshopId: order.workshopName ? requireDemoId(workshops, order.workshopName, 'workshop') : undefined,
        estimatedDaysOffset: order.estimatedDaysOffset,
        finalized: order.finalized,
      });
    }
  });
}

function requireDemoId(values: Map<string, IdRow>, key: string, label: string): string {
  const row = values.get(key);
  if (!row) {
    throw new Error(`Missing demo ${label}: ${key}`);
  }
  return row.id;
}

function requireSizeValueId(values: Map<string, number>, label: string): number {
  const id = values.get(label);
  if (!id) {
    throw new Error(`Missing demo size value: ${label}`);
  }
  return id;
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
      INSERT INTO fabrics (code, name, color, weave_type, format_type)
      VALUES ($1, $2, 'Azul', $3, $4)
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
      INSERT INTO supplies (code, name, category)
      VALUES ($1, $2, $3)
      ON CONFLICT (code)
      DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, is_active = true, updated_at = now()
      RETURNING id
    `,
    [code, name, category],
  );
  return { id: rows[0].id as string };
}

async function upsertSizeCurve(
  manager: DataSource['manager'],
  sizeCurve: DemoData['sizeCurve'],
): Promise<{ id: number; sizeValueIdsByLabel: Map<string, number> }> {
  const existing = await manager.query('SELECT id FROM size_curves WHERE name = $1', [sizeCurve.name]);
  const curveId = existing.length > 0
    ? (existing[0].id as number)
    : ((await manager.query(
        'INSERT INTO size_curves (name, sequence_type) VALUES ($1, $2) RETURNING id',
        [sizeCurve.name, sizeCurve.sequenceType],
      ))[0].id as number);
  const ids = new Map<string, number>();
  for (const [index, label] of sizeCurve.values.entries()) {
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
    ids.set(label, rows[0].id as number);
  }
  return { id: curveId, sizeValueIdsByLabel: ids };
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
