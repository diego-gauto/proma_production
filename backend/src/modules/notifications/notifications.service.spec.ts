import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectorCode, StageExecutionType } from '../catalog/entities/catalog.enums';
import { Stage } from '../catalog/entities/stage.entity';
import { OrderPart } from '../orders/entities/order-part.entity';
import { PartStageEvent } from '../orders/entities/part-stage-event.entity';
import { SystemSetting } from '../settings/entities/system-setting.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.enums';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './entities/notification.enums';
import { NotificationsService } from './notifications.service';

type MockRepository<T extends object> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const mockRepository = <T extends object>(): MockRepository<T> => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => value),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneBy: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
});

describe('NotificationsService', () => {
  let service: NotificationsService;
  let notificationsRepository: MockRepository<Notification>;
  let eventsRepository: MockRepository<PartStageEvent>;
  let usersRepository: MockRepository<User>;
  let settingsRepository: MockRepository<SystemSetting>;

  beforeEach(async () => {
    notificationsRepository = mockRepository<Notification>();
    eventsRepository = mockRepository<PartStageEvent>();
    usersRepository = mockRepository<User>();
    settingsRepository = mockRepository<SystemSetting>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: notificationsRepository },
        { provide: getRepositoryToken(PartStageEvent), useValue: eventsRepository },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(SystemSetting), useValue: settingsRepository },
        { provide: ConfigService, useValue: { get: jest.fn((_key, fallback) => fallback) } },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  it('creates bottleneck notifications for old active events except excluded stages', async () => {
    const recipient = { id: 'admin-1', role: UserRole.ADMIN, isActive: true } as User;
    usersRepository.find!.mockResolvedValue([recipient]);
    settingsRepository.findOneBy!.mockResolvedValue({ key: 'bottleneck_threshold_days', value: '3' });
    notificationsRepository.findOne!.mockResolvedValue(null);
    const corteEvent = eventFixture('event-corte', SectorCode.CORTE, false, 5);
    const confeccionEvent = eventFixture('event-confeccion', SectorCode.CONFECCION, true, 5);
    eventsRepository.find!.mockResolvedValue([corteEvent, confeccionEvent]);

    const result = await service.checkBottlenecks(new Date('2026-10-04T12:00:00Z'));

    expect(result.created).toBe(1);
    expect(notificationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: NotificationType.CUELLO_DE_BOTELLA, recipientUser: recipient, stage: corteEvent.stage }),
    );
    expect(notificationsRepository.save).not.toHaveBeenCalledWith(expect.objectContaining({ stage: confeccionEvent.stage }));
  });

  it('creates only one overdue notification even if the check runs twice', async () => {
    const recipient = { id: 'admin-1', role: UserRole.ADMIN, isActive: true } as User;
    const overdueEvent = eventFixture('event-vencido', SectorCode.BORDADO, false, 1);
    overdueEvent.estimatedFinishAt = new Date('2026-10-01T12:00:00Z');
    usersRepository.find!.mockResolvedValue([recipient]);
    eventsRepository.find!.mockResolvedValue([overdueEvent]);
    notificationsRepository.findOne!.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'ya-existe' });

    const first = await service.checkOverdueEstimatedFinishes(new Date('2026-10-04T12:00:00Z'));
    const second = await service.checkOverdueEstimatedFinishes(new Date('2026-10-04T12:00:00Z'));

    expect(first.created).toBe(1);
    expect(second.created).toBe(0);
    expect(eventsRepository.update).toHaveBeenCalledWith(overdueEvent.id, { overdueNotified: true });
    expect(notificationsRepository.save).toHaveBeenCalledTimes(1);
  });
});

function eventFixture(id: string, code: SectorCode, excludedFromBottleneckAlerts: boolean, ageDays: number): PartStageEvent {
  const now = new Date('2026-10-04T12:00:00Z');
  const startedAt = new Date(now.getTime() - ageDays * 24 * 60 * 60 * 1000);
  return {
    id,
    startedAt,
    finishedAt: null,
    overdueNotified: false,
    executionType: StageExecutionType.INTERNO,
    stage: { id: code === SectorCode.CONFECCION ? 5 : 1, code, name: code, excludedFromBottleneckAlerts } as Stage,
    orderPart: {
      id: `part-${id}`,
      partCode: `P-${id}`,
      order: { id: `order-${id}`, internalCode: `OC-${id}`, externalCode: `EXT-${id}` },
    } as OrderPart,
  } as PartStageEvent;
}
