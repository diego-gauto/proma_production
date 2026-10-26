import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StageEventsService } from './stage-events.service';
import { activeSupplyParts, splitPreparationGroups } from './supply-preparations.service';
import { OrderPart } from './entities/order-part.entity';
import { Order } from './entities/order.entity';
import { PartStageEvent } from './entities/part-stage-event.entity';
import { Stage } from '../catalog/entities/stage.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { User } from '../users/entities/user.entity';
import { SectorCode, StageExecutionType } from '../catalog/entities/catalog.enums';
import { UserRole } from '../users/entities/user.enums';

// Exercise the public finish/start paths: rejection must happen before any write.
describe('Avíos paralelos y cierre de sectores', () => {
  const user = { id: 'user', fullName: 'Test', email: 'test@test.com', role: UserRole.ADMIN, permissions: [] };
  let service: StageEventsService;
  let sector: SectorCode;
  let prepared: number;
  let category: string;
  let save: jest.Mock;
  let cutQuantity: number;
  beforeEach(async () => {
    sector = SectorCode.CONFECCION;
    prepared = 0;
    cutQuantity = 10;
    category = 'CONFECCION';
    save = jest.fn(async value => value);
    const supply = () => ({ id: 'supply', quantityNeeded: 20, quantityAvailable: prepared, completeness: 'COMPLETO', supply: { id: 'button', category } });
    const part = () => ({ id: 'part', quantity: 10, status: 'EN_PROCESO', cutLoads: [{ fabricUseType: 'PRIMARIA', items: [{ quantity: cutQuantity }] }], supplies: [supply()], order: { id: 'order', article: { supplies: [{ quantity: '2', supply: { id: 'button', category } }] } } });
    const event = () => ({ id: 'event', stage: { code: sector }, executionType: StageExecutionType.INTERNO });
    const module = await Test.createTestingModule({ providers: [StageEventsService,
      ...[OrderPart, Order, PartStageEvent, Stage, Workshop, User].map(entity => ({ provide: getRepositoryToken(entity), useValue: {
        findOne: async () => entity === OrderPart ? part() : event(),
        findOneBy: async () => entity === User ? user : { id: 5, code: sector, executionType: StageExecutionType.INTERNO },
        find: async () => [part()], create: (v: unknown) => v, save, update: save,
      } }))] }).compile();
    service = module.get(StageEventsService);
  });
  it('no permite finalizar Corte si la cantidad cortada es parcial', async () => {
    cutQuantity = 8;
    sector = SectorCode.CORTE;
    await expect(service.finish('part', {}, user)).rejects.toThrow(/corte es parcial/i);
    expect(save).not.toHaveBeenCalled();
  });

  it('no permite cerrar Confección sin cantidades aunque el cliente mande COMPLETO', async () => {
    await expect(service.finish('part', {}, user)).rejects.toThrow(/avíos/i);
    expect(save).not.toHaveBeenCalled();
  });
  it('acepta sobrantes para finalizar Confección', async () => {
    prepared = 22;
    await expect(service.finish('part', {}, user)).resolves.toBeDefined();
  });
  it('Terminación no finaliza sin sus avíos', async () => {
    sector = SectorCode.TERMINACION;
    category = 'TERMINACION';
    await expect(service.finish('part', {}, user)).rejects.toThrow(/avíos/i);
    expect(save).not.toHaveBeenCalled();
    prepared = 20;
    await expect(service.finish('part', {}, user)).resolves.toBeDefined();
  });
  it('Plancha no depende de avíos', async () => {
    sector = SectorCode.PLANCHA;
    await expect(service.finish('part', {}, user)).resolves.toBeDefined();
  });
});

describe('partes activas para Avíos', () => {
  it('excluye el corte padre dividido y conserva solo A/B', () => {
    const parts = activeSupplyParts([
      { id: 'p1', isSplit: true, status: 'DIVIDIDA', recombinedIntoPartId: null },
      { id: 'a', isSplit: false, status: 'PENDIENTE', recombinedIntoPartId: null },
      { id: 'b', isSplit: false, status: 'PENDIENTE', recombinedIntoPartId: null },
    ]);
    expect(parts.map(part => part.id)).toEqual(['a', 'b']);
  });
});

describe('resumen de cortes divididos para Avíos', () => {
  it('muestra el padre como resumen y las ramas con sus cantidades', () => {
    expect(splitPreparationGroups([
      { id: 'p1', partCode: 'P1', quantity: 180, isSplit: true, parentPartId: null },
      { id: 'a', partCode: 'P1-A', quantity: 100, isSplit: false, parentPartId: 'p1' },
      { id: 'b', partCode: 'P1-B', quantity: 80, isSplit: false, parentPartId: 'p1' },
    ])).toEqual([{ parentPartCode: 'P1', parentQuantity: 180, children: [{ partCode: 'P1-A', quantity: 100 }, { partCode: 'P1-B', quantity: 80 }] }]);
  });
});
