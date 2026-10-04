import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { PartStageEvent } from '../orders/entities/part-stage-event.entity';
import { SystemSetting } from '../settings/entities/system-setting.entity';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/entities/user.enums';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { Notification } from './entities/notification.entity';
import { NotificationType } from './entities/notification.enums';

type NotificationCreateInput = {
  type: NotificationType;
  message: string;
  recipientUser: User;
  event?: PartStageEvent;
};

type CheckResult = { checked: number; created: number };

@Injectable()
export class NotificationsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private interval?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationsRepository: Repository<Notification>,
    @InjectRepository(PartStageEvent)
    private readonly eventsRepository: Repository<PartStageEvent>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(SystemSetting)
    private readonly settingsRepository: Repository<SystemSetting>,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    if (this.configService.get<string>('NODE_ENV') === 'test') {
      return;
    }
    this.interval = setInterval(() => {
      void this.runScheduledChecks().catch((error: unknown) => {
        this.logger.error('No se pudieron ejecutar chequeos de notificaciones', error);
      });
    }, 24 * 60 * 60 * 1000);
  }

  onModuleDestroy(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async create(input: NotificationCreateInput): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      type: input.type,
      message: input.message,
      recipientUser: input.recipientUser,
      order: input.event?.orderPart?.order ?? null,
      orderPart: input.event?.orderPart ?? null,
      stage: input.event?.stage ?? null,
    });
    return this.notificationsRepository.save(notification);
  }

  async findForUser(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = {
      recipientUser: { id: userId },
      ...(query.unreadOnly === true ? { isRead: false } : {}),
    };
    const [items, total] = await this.notificationsRepository.findAndCount({
      where,
      relations: { order: true, orderPart: true, stage: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unreadCount = await this.notificationsRepository.count({
      where: { recipientUser: { id: userId }, isRead: false },
    });
    return { items, total, page, limit, unreadCount };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, recipientUser: { id: userId } },
      relations: { order: true, orderPart: true, stage: true, recipientUser: true },
    });
    if (!notification) {
      throw new NotFoundException('Notificacion no encontrada');
    }
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepository.update(
      { recipientUser: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }

  async runScheduledChecks(now = new Date()): Promise<{ bottlenecks: CheckResult; overdue: CheckResult }> {
    const [bottlenecks, overdue] = await Promise.all([
      this.checkBottlenecks(now),
      this.checkOverdueEstimatedFinishes(now),
    ]);
    return { bottlenecks, overdue };
  }

  async checkBottlenecks(now = new Date()): Promise<CheckResult> {
    const thresholdDays = await this.getBottleneckThresholdDays();
    const activeEvents = await this.eventsRepository.find({
      where: { finishedAt: IsNull() },
      relations: { stage: true, orderPart: { order: true } },
    });
    const recipients = await this.findControlRecipients();
    let created = 0;

    for (const event of activeEvents) {
      if (!event.startedAt || event.stage.excludedFromBottleneckAlerts) {
        continue;
      }
      const ageDays = (now.getTime() - event.startedAt.getTime()) / 86400000;
      if (ageDays < thresholdDays) {
        continue;
      }
      for (const recipient of recipients) {
        const exists = await this.findDuplicate(
          NotificationType.CUELLO_DE_BOTELLA,
          recipient.id,
          event,
        );
        if (exists) {
          continue;
        }
        await this.create({
          type: NotificationType.CUELLO_DE_BOTELLA,
          recipientUser: recipient,
          event,
          message: `La parte ${event.orderPart.partCode} lleva ${Math.floor(ageDays)} dias sin movimiento en ${event.stage.name}`,
        });
        created += 1;
      }
    }

    return { checked: activeEvents.length, created };
  }

  async checkOverdueEstimatedFinishes(now = new Date()): Promise<CheckResult> {
    const overdueEvents = await this.eventsRepository.find({
      where: {
        finishedAt: IsNull(),
        overdueNotified: false,
        estimatedFinishAt: LessThan(now),
      },
      relations: { stage: true, orderPart: { order: true } },
    });
    const recipients = await this.findControlRecipients();
    let created = 0;

    for (const event of overdueEvents) {
      for (const recipient of recipients) {
        const exists = await this.findDuplicate(
          NotificationType.FECHA_ESTIMADA_INCUMPLIDA,
          recipient.id,
          event,
        );
        if (exists) {
          continue;
        }
        await this.create({
          type: NotificationType.FECHA_ESTIMADA_INCUMPLIDA,
          recipientUser: recipient,
          event,
          message: `La parte ${event.orderPart.partCode} supero la fecha estimada en ${event.stage.name}`,
        });
        created += 1;
      }
      await this.eventsRepository.update(event.id, { overdueNotified: true });
    }

    return { checked: overdueEvents.length, created };
  }

  private async getBottleneckThresholdDays(): Promise<number> {
    const setting = await this.settingsRepository.findOneBy({ key: 'bottleneck_threshold_days' });
    const value = Number(setting?.value ?? this.configService.get<number>('BOTTLENECK_THRESHOLD_DAYS', 3));
    return Number.isFinite(value) && value > 0 ? value : 3;
  }

  private findControlRecipients(): Promise<User[]> {
    return this.usersRepository.find({
      where: { role: UserRole.ADMIN, isActive: true },
    });
  }

  private findDuplicate(type: NotificationType, recipientUserId: string, event: PartStageEvent) {
    return this.notificationsRepository.findOne({
      where: {
        type,
        recipientUser: { id: recipientUserId },
        orderPart: { id: event.orderPart.id },
        stage: { id: event.stage.id },
      },
    });
  }
}
