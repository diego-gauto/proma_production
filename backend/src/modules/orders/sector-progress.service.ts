import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { OrderFabricUseType, SectorCode } from '../catalog/entities/catalog.enums';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { FabricRoll } from '../inventory/entities/fabric-roll.entity';
import { User } from '../users/entities/user.entity';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { CreateCutLoadDto, CreateDecorationLoadDto } from './dto/order.dto';
import { OrderPart } from './entities/order-part.entity';
import { PartCutLoadItem } from './entities/part-cut-load-item.entity';
import { PartCutLoad } from './entities/part-cut-load.entity';
import { PartDecorationLoadItem } from './entities/part-decoration-load-item.entity';
import { PartDecorationLoad } from './entities/part-decoration-load.entity';
import { PartStageEvent } from './entities/part-stage-event.entity';
import { StageEventsService } from './stage-events.service';

@Injectable()
export class SectorProgressService {
  constructor(
    @InjectRepository(OrderPart)
    private readonly partsRepository: Repository<OrderPart>,
    @InjectRepository(PartStageEvent)
    private readonly eventsRepository: Repository<PartStageEvent>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(PartCutLoad)
    private readonly cutLoadsRepository: Repository<PartCutLoad>,
    @InjectRepository(PartCutLoadItem)
    private readonly cutLoadItemsRepository: Repository<PartCutLoadItem>,
    @InjectRepository(PartDecorationLoad)
    private readonly decorationLoadsRepository: Repository<PartDecorationLoad>,
    @InjectRepository(PartDecorationLoadItem)
    private readonly decorationLoadItemsRepository: Repository<PartDecorationLoadItem>,
    @InjectRepository(SizeCurveValue)
    private readonly sizeCurveValuesRepository: Repository<SizeCurveValue>,
    @InjectRepository(FabricRoll)
    private readonly fabricRollsRepository: Repository<FabricRoll>,
    private readonly stageEventsService: StageEventsService,
  ) {}

  async recordCutLoad(
    partId: string,
    dto: CreateCutLoadDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ cutLoad: PartCutLoad; stageFinished: boolean }> {
    const [part, activeEvent, user] = await Promise.all([
      this.findPart(partId),
      this.findActiveEvent(partId),
      this.findUser(currentUser.id),
    ]);
    if (!activeEvent) {
      throw new ConflictException('Esta parte no tiene una etapa en curso');
    }
    if (activeEvent.stage.code !== SectorCode.CORTE) {
      throw new BadRequestException('Esta carga solo corresponde a Corte');
    }
    this.ensureCanLoadProgress(currentUser, SectorCode.CORTE);

    const fabricUseType = dto.fabricUseType ?? OrderFabricUseType.PRIMARIA;
    const previousBySize = await this.cutTotalsBySize(part.id, OrderFabricUseType.PRIMARIA);

    const items: PartCutLoadItem[] = [];
    for (const item of dto.items) {
      const sizeCurveValue = await this.sizeCurveValuesRepository.findOneBy({ id: item.sizeCurveValueId });
      if (!sizeCurveValue) {
        throw new NotFoundException('Talle no encontrado');
      }
      const previous = fabricUseType === OrderFabricUseType.PRIMARIA ? (previousBySize.get(sizeCurveValue.id) ?? 0) : 0;
      const requested = this.requestedQuantityForSize(part, sizeCurveValue.id);
      if (fabricUseType === OrderFabricUseType.PRIMARIA && previous + item.quantity > requested) {
        throw new BadRequestException('La carga de corte supera la cantidad permitida para un talle');
      }
      items.push(this.cutLoadItemsRepository.create({ sizeCurveValue, quantity: item.quantity }));
    }

    const incomingTotal = dto.items.reduce((sum, item) => sum + item.quantity, 0);
    const previousTotal = [...previousBySize.values()].reduce((sum, value) => sum + value, 0);
    const totalAfter = fabricUseType === OrderFabricUseType.PRIMARIA ? previousTotal + incomingTotal : previousTotal;
    if (fabricUseType === OrderFabricUseType.PRIMARIA && totalAfter > part.quantity) {
      throw new BadRequestException('La carga de corte supera la cantidad pendiente');
    }

    const fabricRoll = dto.fabricRollId
      ? await this.fabricRollsRepository.findOne({
          where: { id: dto.fabricRollId },
          relations: { entry: { fabric: true } },
        })
      : null;
    if (dto.fabricRollId && !fabricRoll) {
      throw new NotFoundException('Rollo de tela no encontrado');
    }
    if (fabricRoll) {
      const orderFabricIds = this.orderFabricIds(part);
      if (!orderFabricIds.has(fabricRoll.entry.fabric.id)) {
        throw new BadRequestException('El rollo no pertenece a las telas de esta orden');
      }
      const expectedUseType = part.order.fabric?.id === fabricRoll.entry.fabric.id
        ? OrderFabricUseType.PRIMARIA
        : OrderFabricUseType.COMPLEMENTO;
      if (fabricUseType !== expectedUseType) {
        throw new BadRequestException('El tipo de tela de la carga no coincide con el rollo seleccionado');
      }
      if (dto.fabricQuantity !== undefined && dto.fabricQuantity > Number(fabricRoll.currentQuantity)) {
        throw new BadRequestException('El consumo supera lo disponible en el rollo');
      }
    }
    if (dto.fabricQuantity !== undefined && !fabricRoll) {
      throw new BadRequestException('Para registrar consumo tenes que seleccionar un rollo');
    }

    const cutLoad = this.cutLoadsRepository.create({
      orderPart: part,
      stageEvent: activeEvent,
      lotCode: dto.lotCode,
      fabricUseType,
      fabricRoll,
      fabricQuantity: dto.fabricQuantity === undefined ? null : String(dto.fabricQuantity),
      fabricUnit: fabricRoll?.entry.fabric.consumptionUnit ?? dto.fabricUnit ?? null,
      note: dto.note ?? null,
      createdBy: user,
      items,
    });
    const saved = await this.cutLoadsRepository.save(cutLoad);
    const stageFinished = fabricUseType === OrderFabricUseType.PRIMARIA && totalAfter === part.quantity;
    if (stageFinished) {
      await this.stageEventsService.finish(part.id, { note: `Corte completo (${totalAfter}/${part.quantity}).` }, currentUser);
    }
    const reloaded = await this.cutLoadsRepository.findOne({
      where: { id: saved.id },
      relations: { items: { sizeCurveValue: true }, fabricRoll: { entry: { fabric: true } } },
    });
    if (!reloaded) {
      throw new NotFoundException('Carga de corte no encontrada');
    }
    return { cutLoad: reloaded, stageFinished };
  }

  async recordDecorationLoad(
    partId: string,
    dto: CreateDecorationLoadDto,
    currentUser: AuthenticatedUser,
  ): Promise<{ decorationLoad: PartDecorationLoad; stageFinished: boolean }> {
    const [part, activeEvent, user] = await Promise.all([
      this.findPart(partId),
      this.findActiveEvent(partId),
      this.findUser(currentUser.id),
    ]);
    if (!activeEvent) {
      throw new ConflictException('Esta parte no tiene una etapa en curso');
    }
    if (![SectorCode.BORDADO, SectorCode.ESTAMPADO].includes(activeEvent.stage.code)) {
      throw new BadRequestException('Esta carga solo corresponde a Bordado o Estampado');
    }
    this.ensureCanLoadProgress(currentUser, activeEvent.stage.code);

    const cutBySize = await this.cutTotalsBySize(part.id, OrderFabricUseType.PRIMARIA);
    const cutTotal = [...cutBySize.values()].reduce((sum, value) => sum + value, 0);
    if (cutTotal <= 0) {
      throw new BadRequestException('No se puede cargar esta etapa sin corte registrado');
    }
    const requiredParts = [...new Set((part.order.article.decorationParts ?? [])
      .filter(item => item.decorationType === activeEvent.stage.code)
      .map(item => item.garmentPart))];
    const garmentPart = dto.garmentPart?.trim() || (requiredParts.length === 1 ? requiredParts[0] : '');
    if (!requiredParts.includes(garmentPart)) {
      throw new BadRequestException('Seleccioná una parte de prenda definida para este sector en el artículo');
    }
    if (new Set(dto.items.map(item => item.sizeCurveValueId)).size !== dto.items.length) {
      throw new BadRequestException('No se puede repetir un talle en el mismo lote');
    }
    if (!dto.items.some(item => item.quantity > 0)) {
      throw new BadRequestException('Cargá al menos una cantidad mayor a cero');
    }
    const previousBySize = await this.decorationTotalsBySize(part.id, activeEvent.stage.code, garmentPart);

    const items: PartDecorationLoadItem[] = [];
    for (const item of dto.items) {
      const sizeCurveValue = await this.sizeCurveValuesRepository.findOneBy({ id: item.sizeCurveValueId });
      if (!sizeCurveValue) {
        throw new NotFoundException('Talle no encontrado');
      }
      const cutQuantity = cutBySize.get(sizeCurveValue.id) ?? 0;
      const previous = previousBySize.get(sizeCurveValue.id) ?? 0;
      if (previous + item.quantity > cutQuantity) {
        throw new BadRequestException('La carga supera lo cortado para un talle');
      }
      items.push(this.decorationLoadItemsRepository.create({ sizeCurveValue, quantity: item.quantity }));
    }

    const totalAfter = [...previousBySize.values()].reduce((sum, value) => sum + value, 0) + dto.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalAfter > cutTotal) {
      throw new BadRequestException('La carga supera lo cortado');
    }

    const decorationLoad = this.decorationLoadsRepository.create({
      orderPart: part,
      stageEvent: activeEvent,
      garmentPart,
      lotCode: dto.lotCode?.trim() || null,
      workDate: dto.workDate.slice(0, 10),
      note: dto.note ?? null,
      createdBy: user,
      items,
    });
    const saved = await this.decorationLoadsRepository.save(decorationLoad);
    const completedByPart = await Promise.all(requiredParts.map(name =>
      this.decorationTotalsBySize(part.id, activeEvent.stage.code, name)));
    const stageFinished = completedByPart.every(totals =>
      [...cutBySize].every(([sizeId, quantity]) => (totals.get(sizeId) ?? 0) === quantity));
    if (stageFinished) {
      await this.stageEventsService.finish(
        part.id,
        { note: `${activeEvent.stage.name} completo (${totalAfter}/${cutTotal}).` },
        currentUser,
      );
    }
    const reloaded = await this.decorationLoadsRepository.findOne({
      where: { id: saved.id },
      relations: { items: { sizeCurveValue: true }, stageEvent: { stage: true } },
    });
    if (!reloaded) {
      throw new NotFoundException('Carga de decoracion no encontrada');
    }
    return { decorationLoad: reloaded, stageFinished };
  }

  private async findPart(id: string): Promise<OrderPart> {
    const part = await this.partsRepository.findOne({
      where: { id },
      relations: {
        order: { article: { decorationParts: true }, fabric: true, requestedItems: { fabric: true, sizeCurveValue: true } },
        currentStage: true,
        cutLoads: { items: { sizeCurveValue: true }, fabricRoll: { entry: { fabric: true } } },
      },
    });
    if (!part) {
      throw new NotFoundException('Parte no encontrada');
    }
    return part;
  }

  private async findActiveEvent(partId: string): Promise<PartStageEvent | null> {
    return this.eventsRepository.findOne({
      where: { orderPart: { id: partId }, finishedAt: IsNull() },
      relations: { orderPart: true, stage: true },
      order: { startedAt: 'DESC' },
    });
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private ensureCanLoadProgress(user: AuthenticatedUser, sectorCode: SectorCode): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const allowed = (user.permissions ?? []).some(
      (permission) =>
        permission.isAllowed &&
        permission.action === PermissionAction.FINALIZAR_ETAPA &&
        (permission.sectorCode === null || permission.sectorCode === sectorCode),
    );
    if (!allowed) {
      throw new ForbiddenException('No tenes permisos para cargar trabajo en esta etapa');
    }
  }

  private async cutTotalsBySize(partId: string, fabricUseType: OrderFabricUseType): Promise<Map<number, number>> {
    const items = await this.cutLoadItemsRepository.find({
      where: { cutLoad: { orderPart: { id: partId }, fabricUseType } },
      relations: { sizeCurveValue: true },
    });
    return this.sumBySize(items);
  }

  private async decorationTotalsBySize(partId: string, sectorCode: SectorCode, garmentPart: string): Promise<Map<number, number>> {
    const items = await this.decorationLoadItemsRepository.find({
      where: { decorationLoad: { garmentPart, orderPart: { id: partId }, stageEvent: { stage: { code: sectorCode } } } },
      relations: { sizeCurveValue: true },
    });
    return this.sumBySize(items);
  }

  private sumBySize(items: Array<{ sizeCurveValue: SizeCurveValue; quantity: number }>): Map<number, number> {
    const bySize = new Map<number, number>();
    items.forEach((item) => {
      bySize.set(item.sizeCurveValue.id, (bySize.get(item.sizeCurveValue.id) ?? 0) + item.quantity);
    });
    return bySize;
  }

  private requestedQuantityForSize(part: OrderPart, sizeCurveValueId: number): number {
    if (part.sizeCurveValue?.id === sizeCurveValueId) {
      return part.quantity;
    }
    const requested = part.order.requestedItems.find((item) => item.sizeCurveValue.id === sizeCurveValueId);
    return requested?.quantityRequested ?? 0;
  }

  private orderFabricIds(part: OrderPart): Set<string> {
    return new Set([
      part.order.fabric?.id,
      ...(part.order.requestedItems ?? []).map((item) => item.fabric?.id),
    ].filter((id): id is string => Boolean(id)));
  }
}
