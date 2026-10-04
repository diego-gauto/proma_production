import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { SectorCode } from '../catalog/entities/catalog.enums';
import { Stage } from '../catalog/entities/stage.entity';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OrderPart } from '../orders/entities/order-part.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderStatus, PartStatus } from '../orders/entities/order.enums';
import { PartStageEvent } from '../orders/entities/part-stage-event.entity';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { DashboardQueryDto } from './dto/dashboard-query.dto';

type DashboardRowType = 'SIMPLE' | 'SPLIT_PARENT' | 'SPLIT_CHILD';

type DashboardRow = {
  orderId: string;
  partId: string;
  parentPartId: string | null;
  internalCode: string;
  externalCode: string;
  clientName: string;
  articleName: string;
  fabricName: string;
  quantity: number;
  partCode: string;
  orderStatus: OrderStatus;
  partStatus: PartStatus;
  statusLabel: string;
  rowType: DashboardRowType;
  stage: Stage | null;
  location: string;
  startedAt: Date | null;
  daysInStage: number | null;
  semaphore: 'OK' | 'WARNING' | 'OVERDUE' | 'FINALIZED';
};

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderPart)
    private readonly partsRepository: Repository<OrderPart>,
    @InjectRepository(Stage)
    private readonly stagesRepository: Repository<Stage>,
  ) {}

  async ordersList(query: DashboardQueryDto, user: AuthenticatedUser) {
    const orders = await this.ordersQuery(query)
      .leftJoinAndSelect('order.parts', 'parts')
      .leftJoinAndSelect('parts.parentPart', 'parentPart')
      .leftJoinAndSelect('parts.currentStage', 'currentStage')
      .leftJoinAndSelect('parts.fabric', 'partFabric')
      .leftJoinAndSelect('parts.events', 'events')
      .leftJoinAndSelect('events.stage', 'eventStage')
      .leftJoinAndSelect('events.workshop', 'eventWorkshop')
      .orderBy('order.created_at', 'DESC')
      .addOrderBy('parts.partCode', 'ASC')
      .getMany();

    const allowedSectors = this.allowedSectors(user);
    const rows = orders.flatMap((order) =>
      [...(order.parts ?? [])]
        .sort((left, right) => left.partCode.localeCompare(right.partCode))
        .filter((part) => this.matchesVisibleSector(part, allowedSectors))
        .filter((part) => this.matchesDashboardFilters(part, query))
        .map((part) => this.toRow(order, part)),
    );

    return { items: rows, total: rows.length };
  }

  async kanban(query: DashboardQueryDto, user: AuthenticatedUser) {
    const allowedSectors = this.allowedSectors(user);
    const stages = await this.stagesRepository.find({
      order: { sequenceOrder: 'ASC' },
    });
    const visibleStages = stages.filter(
      (stage) =>
        (!query.stageId || stage.id === query.stageId) &&
        (!allowedSectors || allowedSectors.includes(stage.code)),
    );
    const parts = await this.activeLeavesQuery(query)
      .leftJoinAndSelect('part.order', 'order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.article', 'article')
      .leftJoinAndSelect('order.fabric', 'fabric')
      .leftJoinAndSelect('part.currentStage', 'currentStage')
      .leftJoinAndSelect('part.events', 'events')
      .leftJoinAndSelect('events.stage', 'eventStage')
      .leftJoinAndSelect('events.workshop', 'eventWorkshop')
      .orderBy('part.updated_at', 'ASC')
      .getMany();
    const filteredParts = parts.filter(
      (part) =>
        this.matchesVisibleSector(part, allowedSectors) &&
        this.matchesOrderFilters(part.order, query),
    );

    return {
      stages: visibleStages.map((stage) => ({
        stage,
        parts: filteredParts.filter(
          (part) => part.currentStage?.id === stage.id,
        ),
      })),
    };
  }

  async summary(query: DashboardQueryDto, user: AuthenticatedUser) {
    const allowedSectors = this.allowedSectors(user);
    const orders = await this.ordersQuery(query)
      .leftJoinAndSelect('order.parts', 'parts')
      .leftJoinAndSelect('parts.currentStage', 'currentStage')
      .leftJoinAndSelect('parts.events', 'events')
      .leftJoinAndSelect('events.stage', 'eventStage')
      .getMany();
    const visibleOrders = orders.filter((order) =>
      (order.parts ?? []).some((part) =>
        this.matchesVisibleSector(part, allowedSectors),
      ),
    );
    const parts = visibleOrders.flatMap((order) => order.parts ?? []);
    const now = new Date();
    const thresholdMs = 3 * 24 * 60 * 60 * 1000;

    return {
      activeOrders: visibleOrders.filter(
        (order) => order.status === OrderStatus.ACTIVA,
      ).length,
      inRepair: visibleOrders.filter(
        (order) => order.status === OrderStatus.EN_ARREGLO,
      ).length,
      bottlenecks: parts.filter((part) => {
        const event = this.activeEvent(part);
        return (
          part.status === PartStatus.EN_PROCESO &&
          event?.startedAt &&
          event.stage?.excludedFromBottleneckAlerts !== true &&
          now.getTime() - event.startedAt.getTime() > thresholdMs
        );
      }).length,
      overdue: parts.filter((part) => {
        const event = this.activeEvent(part);
        return !!event?.estimatedFinishAt && event.estimatedFinishAt < now;
      }).length,
      finalized: visibleOrders.filter(
        (order) => order.status === OrderStatus.FINALIZADA,
      ).length,
    };
  }

  private ordersQuery(query: DashboardQueryDto) {
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.article', 'article')
      .leftJoinAndSelect('order.fabric', 'fabric')
      .leftJoinAndSelect('order.initialWorkshop', 'initialWorkshop');

    if (query.search) {
      qb.andWhere(
        new Brackets((where) => {
          where
            .where('order.internal_code ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('order.external_code ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('client.business_name ILIKE :search', {
              search: `%${query.search}%`,
            })
            .orWhere('article.name ILIKE :search', {
              search: `%${query.search}%`,
            });
        }),
      );
    }
    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }
    if (query.clientId) {
      qb.andWhere('client.id = :clientId', { clientId: query.clientId });
    }
    if (query.articleId) {
      qb.andWhere('article.id = :articleId', { articleId: query.articleId });
    }

    return qb;
  }

  private activeLeavesQuery(query: DashboardQueryDto) {
    const qb = this.partsRepository
      .createQueryBuilder('part')
      .where('part.is_split = false')
      .andWhere('part.recombined_into_part_id IS NULL')
      .andWhere('part.status NOT IN (:...hiddenStatuses)', {
        hiddenStatuses: [PartStatus.DIVIDIDA, PartStatus.REINTEGRADA],
      });

    if (query.stageId) {
      qb.andWhere('part.current_stage_id = :stageId', {
        stageId: query.stageId,
      });
    }
    return qb;
  }

  private toRow(order: Order, part: OrderPart): DashboardRow {
    const activeEvent = this.activeEvent(part);
    const startedAt = activeEvent?.startedAt ?? null;
    const daysInStage = startedAt
      ? Math.floor((Date.now() - startedAt.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const parent = part.parentPartId
      ? 'SPLIT_CHILD'
      : part.isSplit
        ? 'SPLIT_PARENT'
        : 'SIMPLE';
    return {
      orderId: order.id,
      partId: part.id,
      parentPartId: part.parentPartId ?? null,
      internalCode: order.internalCode,
      externalCode: order.externalCode,
      clientName: order.client.businessName,
      articleName: order.article.name,
      fabricName: part.fabric?.name ?? order.fabric.name,
      quantity: part.quantity,
      partCode: part.partCode,
      orderStatus: order.status,
      partStatus: part.status,
      statusLabel: part.isSplit
        ? 'Corte dividido'
        : this.statusLabel(part.status),
      rowType: parent,
      stage: part.currentStage ?? null,
      location:
        activeEvent?.workshop?.name ??
        order.initialWorkshop?.name ??
        'Planta interna',
      startedAt,
      daysInStage,
      semaphore: this.semaphore(order.status, activeEvent),
    };
  }

  private activeEvent(part: OrderPart): PartStageEvent | undefined {
    return (part.events ?? [])
      .filter((event) => !event.finishedAt)
      .sort(
        (left, right) => right.createdAt.getTime() - left.createdAt.getTime(),
      )[0];
  }

  private semaphore(
    orderStatus: OrderStatus,
    event?: PartStageEvent,
  ): DashboardRow['semaphore'] {
    if (orderStatus === OrderStatus.FINALIZADA) {
      return 'FINALIZED';
    }
    if (event?.estimatedFinishAt && event.estimatedFinishAt < new Date()) {
      return 'OVERDUE';
    }
    if (
      event?.startedAt &&
      Date.now() - event.startedAt.getTime() > 3 * 24 * 60 * 60 * 1000
    ) {
      return 'WARNING';
    }
    return 'OK';
  }

  private statusLabel(status: PartStatus): string {
    const labels: Record<PartStatus, string> = {
      [PartStatus.PENDIENTE]: 'Pendiente',
      [PartStatus.EN_PROCESO]: 'En proceso',
      [PartStatus.DIVIDIDA]: 'Corte dividido',
      [PartStatus.REINTEGRADA]: 'Reintegrada',
      [PartStatus.FINALIZADA]: 'Finalizada',
    };
    return labels[status];
  }

  private allowedSectors(user: AuthenticatedUser): SectorCode[] | null {
    if (user.role === UserRole.ADMIN) {
      return null;
    }
    const sectors = (user.permissions ?? [])
      .filter(
        (permission) =>
          permission.isAllowed &&
          permission.action === PermissionAction.VER &&
          permission.sectorCode,
      )
      .map((permission) => permission.sectorCode as SectorCode);
    return sectors.length > 0 ? sectors : [];
  }

  private matchesVisibleSector(
    part: OrderPart,
    allowedSectors: SectorCode[] | null,
  ): boolean {
    if (!allowedSectors) {
      return true;
    }
    if (allowedSectors.length === 0) {
      return false;
    }
    return (
      !!part.currentStage?.code &&
      allowedSectors.includes(part.currentStage.code)
    );
  }

  private matchesOrderFilters(order: Order, query: DashboardQueryDto): boolean {
    if (query.search) {
      const search = query.search.toLocaleLowerCase();
      const values = [
        order.internalCode,
        order.externalCode,
        order.client?.businessName,
        order.article?.name,
      ];
      if (
        values.every((value) => !value?.toLocaleLowerCase().includes(search))
      ) {
        return false;
      }
    }
    if (query.status && order.status !== query.status) {
      return false;
    }
    if (query.clientId && order.client?.id !== query.clientId) {
      return false;
    }
    if (query.articleId && order.article?.id !== query.articleId) {
      return false;
    }
    return true;
  }

  private matchesDashboardFilters(
    part: OrderPart,
    query: DashboardQueryDto,
  ): boolean {
    if (query.stageId && part.currentStage?.id !== query.stageId) {
      return false;
    }
    if (query.workshopId) {
      return (part.events ?? []).some(
        (event) => !event.finishedAt && event.workshop?.id === query.workshopId,
      );
    }
    return true;
  }
}
