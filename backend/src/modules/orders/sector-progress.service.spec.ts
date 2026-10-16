import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SectorProgressService } from './sector-progress.service';
import { StageEventsService } from './stage-events.service';
import { OrderPart } from './entities/order-part.entity';
import { PartStageEvent } from './entities/part-stage-event.entity';
import { PartCutLoad } from './entities/part-cut-load.entity';
import { PartCutLoadItem } from './entities/part-cut-load-item.entity';
import { PartDecorationLoad } from './entities/part-decoration-load.entity';
import { PartDecorationLoadItem } from './entities/part-decoration-load-item.entity';
import { User } from '../users/entities/user.entity';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { FabricRoll } from '../inventory/entities/fabric-roll.entity';
import { SectorCode } from '../catalog/entities/catalog.enums';
import { UserRole } from '../users/entities/user.enums';

for (const sector of [SectorCode.BORDADO, SectorCode.ESTAMPADO]) {
  describe(`Cargas por parte ${sector}`, () => {
    const user = { id: 'user', email: 'test@example.com', role: UserRole.ADMIN, fullName: 'Test', permissions: [] };
    const size = { id: 1, label: 'M' };
    const stored: Array<{ garmentPart: string; items: Array<{ sizeCurveValue: typeof size; quantity: number }> }> = [];
    const finish = jest.fn();
    let service: SectorProgressService;
    beforeEach(async () => {
      stored.length = 0;
      finish.mockReset();
      const repositories = [OrderPart, PartStageEvent, User, PartCutLoad, PartCutLoadItem, PartDecorationLoad, PartDecorationLoadItem, SizeCurveValue, FabricRoll].map((entity) => ({
        provide: getRepositoryToken(entity),
        useValue: {
          create: (value: unknown) => value,
          findOneBy: async () => entity === User ? user : size,
          findOne: async () => entity === OrderPart ? { id: 'part', quantity: 10, order: { article: { decorationParts: ['Pecho', 'Manga'].map(garmentPart => ({ garmentPart, decorationType: sector })) } } } : entity === PartStageEvent ? { id: 'event', stage: { code: sector, name: sector } } : stored.at(-1),
          find: async (options: { where?: { decorationLoad?: { garmentPart?: string } } }) => entity === PartCutLoadItem ? [{ sizeCurveValue: size, quantity: 10 }] : stored.filter(load => !options.where?.decorationLoad?.garmentPart || load.garmentPart === options.where.decorationLoad.garmentPart).flatMap(load => load.items),
          save: async (load: typeof stored[number]) => { stored.push(load); return { ...load, id: 'load' }; },
        },
      }));
      const module = await Test.createTestingModule({ providers: [SectorProgressService, ...repositories, { provide: StageEventsService, useValue: { finish } }] }).compile();
      service = module.get(SectorProgressService);
    });
    const payload = (garmentPart: string, quantity = 10) => ({ garmentPart, lotCode: 'Lote 1', workDate: '2026-10-14', items: [{ sizeCurveValueId: 1, quantity }] });
    it('no finaliza con pecho completo y manga pendiente; finaliza con ambas', async () => {
      const first = await service.recordDecorationLoad('part', payload('Pecho'), user);
      expect(first.stageFinished).toBe(false);
      expect(finish).not.toHaveBeenCalled();
      const second = await service.recordDecorationLoad('part', payload('Manga'), user);
      expect(second.stageFinished).toBe(true);
      expect(finish).toHaveBeenCalledTimes(1);
    });
    it('rechaza partes ajenas al artículo', async () => {
      await expect(service.recordDecorationLoad('part', payload('Espalda'), user)).rejects.toThrow();
      expect(stored).toHaveLength(0);
    });
    it('rechaza excedentes de una parte aunque otra siga pendiente', async () => {
      await service.recordDecorationLoad('part', payload('Pecho', 8), user);
      await expect(service.recordDecorationLoad('part', payload('Pecho', 3), user)).rejects.toThrow();
    });
    it('rechaza talles repetidos para evitar eludir el límite', async () => {
      const body = payload('Pecho', 6);
      body.items.push({ sizeCurveValueId: 1, quantity: 6 });
      await expect(service.recordDecorationLoad('part', body, user)).rejects.toThrow();
    });
  });
}
