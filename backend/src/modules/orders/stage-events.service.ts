import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import {
  SectorCode,
  StageExecutionType,
} from '../catalog/entities/catalog.enums';
import { Stage } from '../catalog/entities/stage.entity';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { User } from '../users/entities/user.entity';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { Workshop } from '../workshops/entities/workshop.entity';
import { FinishStageDto, StartStageDto } from './dto/order.dto';
import { OrderPart } from './entities/order-part.entity';
import { Order } from './entities/order.entity';
import { OrderStatus, PartSplitMode, PartStatus } from './entities/order.enums';
import { PartStageEvent } from './entities/part-stage-event.entity';

type FinishResult = {
  event: PartStageEvent;
  includedAtraqueEvent?: PartStageEvent | null;
};

@Injectable()
export class StageEventsService {
  constructor(
    @InjectRepository(PartStageEvent)
    private readonly eventsRepository: Repository<PartStageEvent>,
    @InjectRepository(OrderPart)
    private readonly partsRepository: Repository<OrderPart>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Stage)
    private readonly stagesRepository: Repository<Stage>,
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async start(
    partId: string,
    dto: StartStageDto,
    currentUser: AuthenticatedUser,
  ): Promise<PartStageEvent> {
    const [part, stage, user] = await Promise.all([
      this.findPart(partId),
      this.findStage(dto.stageId),
      this.findUser(currentUser.id),
    ]);

    this.ensureCanOperate(currentUser, stage.code, PermissionAction.INICIAR_ETAPA);

    if (part.isSplit || part.status === PartStatus.DIVIDIDA) {
      throw new BadRequestException('No se puede iniciar una parte dividida');
    }
    if (part.status === PartStatus.REINTEGRADA) {
      throw new BadRequestException('No se puede iniciar una rama reintegrada');
    }
    if (
      stage.code === SectorCode.CONFECCION &&
      part.splitMode === PartSplitMode.COMPONENTE &&
      part.isComponentBranch
    ) {
      throw new BadRequestException('Primero reunifica los componentes de la prenda');
    }

    const active = await this.eventsRepository.findOne({
      where: { orderPart: { id: part.id }, finishedAt: IsNull() },
    });
    if (active) {
      throw new ConflictException('Esta parte ya tiene una etapa en curso');
    }

    const workshop = await this.resolveWorkshop(dto, stage);
    const event = this.eventsRepository.create({
      orderPart: part,
      stage,
      executionType: dto.executionType,
      workshop,
      startedAt: new Date(),
      estimatedFinishAt: dto.estimatedFinishAt
        ? new Date(dto.estimatedFinishAt)
        : null,
      note: dto.note ?? null,
      performedBy: user,
    });

    await this.eventsRepository.save(event);
    part.status = PartStatus.EN_PROCESO;
    part.currentStage = stage;
    await this.partsRepository.save(part);
    return this.findEvent(event.id);
  }

  async finish(
    partId: string,
    dto: FinishStageDto,
    currentUser: AuthenticatedUser,
  ): Promise<FinishResult> {
    const part = await this.findPart(partId);
    const active = await this.eventsRepository.findOne({
      where: { orderPart: { id: part.id }, finishedAt: IsNull() },
      relations: { stage: true, workshop: true, orderPart: { order: true }, performedBy: true },
    });
    if (!active) {
      throw new ConflictException('Esta parte no tiene una etapa en curso');
    }

    this.ensureCanOperate(
      currentUser,
      active.stage.code,
      PermissionAction.FINALIZAR_ETAPA,
    );

    const finishedAt = dto.actualFinishAt ? new Date(dto.actualFinishAt) : new Date();
    active.finishedAt = finishedAt;
    active.note = dto.note ?? active.note ?? null;
    if (active.stage.code === SectorCode.CONFECCION) {
      active.includesAtraque = dto.includesAtraque ?? false;
    }
    await this.eventsRepository.save(active);

    let includedAtraqueEvent: PartStageEvent | null = null;
    if (
      active.stage.code === SectorCode.CONFECCION &&
      active.executionType === StageExecutionType.EXTERNO &&
      active.includesAtraque === true
    ) {
      includedAtraqueEvent = await this.createIncludedAtraqueEvent(
        part,
        active,
        currentUser.id,
        finishedAt,
      );
    }

    if (active.stage.code === SectorCode.TERMINACION) {
      part.status = PartStatus.FINALIZADA;
    } else {
      part.status = PartStatus.PENDIENTE;
    }
    part.currentStage = null;
    await this.partsRepository.save(part);

    if (active.stage.code === SectorCode.TERMINACION) {
      await this.finalizeOrderIfAllLeavesDone(part.order.id);
    }

    return {
      event: await this.findEvent(active.id),
      includedAtraqueEvent: includedAtraqueEvent
        ? await this.findEvent(includedAtraqueEvent.id)
        : null,
    };
  }

  private async resolveWorkshop(
    dto: StartStageDto,
    stage: Stage,
  ): Promise<Workshop | null> {
    if (stage.code === SectorCode.ATRAQUE && dto.workshopId) {
      throw new BadRequestException('Atraque nunca se terceriza de forma independiente');
    }
    if (dto.executionType === StageExecutionType.EXTERNO && !dto.workshopId) {
      throw new BadRequestException('Las etapas externas requieren taller');
    }
    if (dto.executionType === StageExecutionType.EXTERNO) {
      if (stage.executionType === StageExecutionType.INTERNO) {
        throw new BadRequestException('Esta etapa no admite ejecucion externa');
      }
      const workshop = await this.workshopsRepository.findOneBy({
        id: dto.workshopId,
      });
      if (!workshop) {
        throw new NotFoundException('Taller no encontrado');
      }
      return workshop;
    }
    return null;
  }

  private async createIncludedAtraqueEvent(
    part: OrderPart,
    active: PartStageEvent,
    userId: string,
    finishedAt: Date,
  ): Promise<PartStageEvent> {
    const [atraqueStage, user] = await Promise.all([
      this.stagesRepository.findOneBy({ code: SectorCode.ATRAQUE }),
      this.findUser(userId),
    ]);
    if (!atraqueStage) {
      throw new NotFoundException('Etapa Atraque no encontrada');
    }

    const workshopName = active.workshop?.name ?? 'sin taller';
    const event = this.eventsRepository.create({
      orderPart: part,
      stage: atraqueStage,
      executionType: StageExecutionType.INTERNO,
      workshop: null,
      startedAt: finishedAt,
      finishedAt,
      note: `Incluido en Confeccion - Taller: ${workshopName}`,
      performedBy: user,
    });
    return this.eventsRepository.save(event);
  }

  private async finalizeOrderIfAllLeavesDone(orderId: string): Promise<void> {
    const activeLeaves = await this.partsRepository.find({
      where: {
        order: { id: orderId },
        isSplit: false,
        recombinedIntoPartId: IsNull(),
        status: Not(PartStatus.REINTEGRADA),
      },
    });
    if (
      activeLeaves.length > 0 &&
      activeLeaves.every((leaf) => leaf.status === PartStatus.FINALIZADA)
    ) {
      await this.ordersRepository.update(orderId, {
        status: OrderStatus.FINALIZADA,
        finalizedAt: new Date(),
      });
    }
  }

  private ensureCanOperate(
    user: AuthenticatedUser,
    sectorCode: SectorCode,
    action: PermissionAction,
  ): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const allowed = (user.permissions ?? []).some(
      (permission) =>
        permission.isAllowed &&
        permission.action === action &&
        (permission.sectorCode === sectorCode || permission.sectorCode === null),
    );
    if (!allowed) {
      throw new ForbiddenException('No tenes permisos para operar este sector');
    }
  }

  private async findPart(id: string): Promise<OrderPart> {
    const part = await this.partsRepository.findOne({
      where: { id },
      relations: { order: true, currentStage: true },
    });
    if (!part) {
      throw new NotFoundException('Parte no encontrada');
    }
    return part;
  }

  private async findStage(id: number): Promise<Stage> {
    const stage = await this.stagesRepository.findOneBy({ id });
    if (!stage) {
      throw new NotFoundException('Etapa no encontrada');
    }
    return stage;
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private async findEvent(id: string): Promise<PartStageEvent> {
    const event = await this.eventsRepository.findOne({
      where: { id },
      relations: {
        orderPart: { currentStage: true },
        stage: true,
        workshop: true,
        performedBy: true,
      },
    });
    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }
    return event;
  }
}
