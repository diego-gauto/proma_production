import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Article } from '../articles/entities/article.entity';
import { SectorCode } from '../catalog/entities/catalog.enums';
import { Fabric } from '../catalog/entities/fabric.entity';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { SizeCurve } from '../catalog/entities/size-curve.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { Workshop } from '../workshops/entities/workshop.entity';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import {
  CreateOrderDto,
  OrderPartsQueryDto,
  OrderQueryDto,
  RecombinePartsDto,
  RepairOrderDto,
  SplitPartDto,
  UpdatePartSupplyDto,
} from './dto/order.dto';
import { OrderPart } from './entities/order-part.entity';
import { OrderRequestedItem } from './entities/order-requested-item.entity';
import { Order } from './entities/order.entity';
import { PartSupply } from './entities/part-supply.entity';
import {
  OrderStatus,
  PartSplitMode,
  PartStatus,
  SupplyCompleteness,
} from './entities/order.enums';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderPart)
    private readonly orderPartsRepository: Repository<OrderPart>,
    @InjectRepository(PartSupply)
    private readonly partSuppliesRepository: Repository<PartSupply>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(SizeCurve)
    private readonly sizeCurvesRepository: Repository<SizeCurve>,
    @InjectRepository(SizeCurveValue)
    private readonly sizeCurveValuesRepository: Repository<SizeCurveValue>,
    @InjectRepository(Fabric)
    private readonly fabricsRepository: Repository<Fabric>,
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
  ) {}

  async create(dto: CreateOrderDto, userId: string): Promise<Order> {
    const existing = await this.ordersRepository.findOne({
      where: { externalCode: dto.externalCode },
    });
    if (existing) {
      throw new ConflictException('Ya existe una orden con ese codigo externo');
    }

    const [client, article, createdBy, fabric, sizeCurve, initialWorkshop] =
      await Promise.all([
        this.findClient(dto.clientId),
        this.findArticle(dto.articleId),
        this.findUser(userId),
        this.findFabric(dto.fabricId),
        this.findSizeCurve(dto.sizeCurveId),
        dto.initialWorkshopId
          ? this.findWorkshop(dto.initialWorkshopId)
          : Promise.resolve(null),
      ]);

    const requestedItems = await Promise.all(
      dto.requestedItems.map(async (item) => {
        const sizeCurveValue = await this.findSizeCurveValue(
          item.sizeCurveValueId,
        );
        if (sizeCurveValue.sizeCurve.id !== sizeCurve.id) {
          throw new BadRequestException(
            'El talle indicado no pertenece a la curva de la orden',
          );
        }
        const itemFabric = item.fabricId
          ? await this.findFabric(item.fabricId)
          : fabric;
        return Object.assign(new OrderRequestedItem(), {
          fabric: itemFabric,
          color: item.color ?? fabric.color ?? null,
          sizeCurveValue,
          quantityRequested: item.quantityRequested,
        });
      }),
    );
    const quantity = requestedItems.reduce(
      (total, item) => total + item.quantityRequested,
      0,
    );
    if (quantity <= 0) {
      throw new BadRequestException('La orden debe tener cantidades mayores a cero');
    }

    const rootPart = Object.assign(new OrderPart(), {
      partCode: 'P1',
      quantity,
      fabric,
      color: this.sameValue(requestedItems.map((item) => item.color))
        ? requestedItems[0].color
        : null,
      sizeCurveValue:
        requestedItems.length === 1 ? requestedItems[0].sizeCurveValue : null,
    });

    const order = this.ordersRepository.create({
      internalCode: await this.nextInternalCode(),
      externalCode: dto.externalCode,
      client,
      article,
      fabric,
      sizeCurve,
      initialWorkshop,
      createdBy,
      requestedItems,
      parts: [rootPart],
    });

    const saved = await this.ordersRepository.save(order);
    await this.preloadPartSupplies(saved.parts[0], article);
    return this.findOne(saved.id);
  }

  async findAll(query: OrderQueryDto): Promise<PaginatedResponse<Order>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.search
      ? [
          { internalCode: ILike(`%${query.search}%`) },
          { externalCode: ILike(`%${query.search}%`) },
        ]
      : {};
    const [items, total] = await this.ordersRepository.findAndCount({
      where,
      relations: this.orderRelations(),
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: this.orderRelations(true),
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return order;
  }

  async findParts(orderId: string, query: OrderPartsQueryDto): Promise<OrderPart[]> {
    await this.findOne(orderId);
    const where = query.stageId
      ? { order: { id: orderId }, currentStage: { id: query.stageId } }
      : { order: { id: orderId } };
    return this.orderPartsRepository.find({
      where,
      relations: {
        parentPart: true,
        currentStage: true,
        children: true,
        events: { stage: true, workshop: true },
        supplies: { supply: true },
      },
      order: { partCode: 'ASC' },
    });
  }

  async split(partId: string, dto: SplitPartDto): Promise<OrderPart[]> {
    const parent = await this.findPart(partId);
    if (parent.isSplit || parent.status === PartStatus.DIVIDIDA) {
      throw new ConflictException('Esta parte ya fue dividida');
    }
    if (parent.status === PartStatus.REINTEGRADA) {
      throw new BadRequestException('No se puede dividir una rama reintegrada');
    }

    const total = dto.subParts.reduce((sum, part) => sum + part.quantity, 0);
    if (dto.splitMode === PartSplitMode.LOTE && total > parent.quantity) {
      throw new BadRequestException(
        'La suma de cantidades hijas no puede superar la cantidad de la parte padre',
      );
    }
    if (
      dto.splitMode === PartSplitMode.COMPONENTE &&
      dto.subParts.some((part) => !part.splitReason?.trim())
    ) {
      throw new BadRequestException(
        'Cada rama componente debe indicar que representa',
      );
    }

    const children = await Promise.all(
      dto.subParts.map(async (subPart, index) => {
        const fabric = subPart.fabricId
          ? await this.findFabric(subPart.fabricId)
          : parent.fabric ?? null;
        const sizeCurveValue = subPart.sizeCurveValueId
          ? await this.findSizeCurveValue(subPart.sizeCurveValueId)
          : parent.sizeCurveValue ?? null;
        return this.orderPartsRepository.create({
          order: parent.order,
          parentPart: parent,
          partCode: `${parent.partCode}-${String.fromCharCode(65 + index)}`,
          quantity: subPart.quantity,
          fabric,
          color: subPart.color ?? parent.color ?? null,
          sizeCurveValue,
          splitMode: dto.splitMode,
          isComponentBranch: dto.splitMode === PartSplitMode.COMPONENTE,
          splitReason: subPart.splitReason ?? null,
          status: PartStatus.PENDIENTE,
        });
      }),
    );

    parent.isSplit = true;
    parent.status = PartStatus.DIVIDIDA;
    parent.currentStage = null;
    await this.orderPartsRepository.save(parent);
    const saved = await this.orderPartsRepository.save(children);
    return this.findPartsByIds(saved.map((part) => part.id));
  }

  async recombine(dto: RecombinePartsDto): Promise<OrderPart> {
    const branches = await this.orderPartsRepository.find({
      where: { id: In(dto.componentPartIds) },
      relations: {
        order: true,
        parentPart: true,
        fabric: true,
        sizeCurveValue: true,
      },
    });
    if (branches.length !== dto.componentPartIds.length) {
      throw new NotFoundException('Una o mas ramas componente no existen');
    }
    const parentId = branches[0].parentPartId;
    const orderId = branches[0].order.id;
    if (!parentId || branches.some((branch) => branch.parentPartId !== parentId)) {
      throw new BadRequestException('Las ramas deben pertenecer al mismo padre');
    }
    if (branches.some((branch) => branch.order.id !== orderId)) {
      throw new BadRequestException('Las ramas deben pertenecer a la misma orden');
    }
    if (
      branches.some(
        (branch) =>
          branch.splitMode !== PartSplitMode.COMPONENTE ||
          !branch.isComponentBranch ||
          branch.status === PartStatus.REINTEGRADA,
      )
    ) {
      throw new BadRequestException('Solo se pueden reunificar ramas componente activas');
    }

    const siblingsCount = await this.orderPartsRepository.count({
      where: { parentPartId: parentId },
    });
    const recombined = this.orderPartsRepository.create({
      order: branches[0].order,
      parentPart: branches[0].parentPart ?? undefined,
      partCode: `${branches[0].parentPart?.partCode ?? 'P'}-R${siblingsCount + 1}`,
      quantity: dto.quantity,
      fabric: branches[0].fabric ?? null,
      color: this.sameValue(branches.map((branch) => branch.color))
        ? branches[0].color
        : null,
      sizeCurveValue: branches[0].sizeCurveValue ?? null,
      splitReason: dto.note ?? 'Componentes reunificados',
      status: PartStatus.PENDIENTE,
      isComponentBranch: false,
    });
    const saved = await this.orderPartsRepository.save(recombined);

    branches.forEach((branch) => {
      branch.status = PartStatus.REINTEGRADA;
      branch.recombinedIntoPart = saved;
      branch.recombinedIntoPartId = saved.id;
    });
    await this.orderPartsRepository.save(branches);
    return this.findPart(saved.id);
  }


  async updatePartSupply(
    partId: string,
    supplyId: string,
    dto: UpdatePartSupplyDto,
    currentUser: AuthenticatedUser,
  ): Promise<PartSupply> {
    this.ensurePermission(currentUser, PermissionAction.EDITAR, [
      SectorCode.AVIOS_CONFECCION,
      SectorCode.AVIOS_TERMINACION,
    ]);
    const [partSupply, user] = await Promise.all([
      this.partSuppliesRepository.findOne({
        where: { orderPart: { id: partId }, supply: { id: supplyId } },
        relations: { orderPart: true, supply: true, updatedBy: true },
      }),
      this.findUser(currentUser.id),
    ]);
    if (!partSupply) {
      throw new NotFoundException('Avio de parte no encontrado');
    }

    partSupply.completeness = dto.completeness;
    partSupply.quantityAvailable = dto.quantityAvailable ?? null;
    partSupply.note = dto.note ?? null;
    partSupply.updatedBy = user;
    const saved = await this.partSuppliesRepository.save(partSupply);
    const reloaded = await this.partSuppliesRepository.findOne({
      where: { id: saved.id },
      relations: { orderPart: true, supply: true, updatedBy: true },
    });
    if (!reloaded) {
      throw new NotFoundException('Avio de parte no encontrado');
    }
    return reloaded;
  }

  async markRepair(id: string, dto: RepairOrderDto): Promise<Order> {
    const order = await this.findOne(id);
    order.status = OrderStatus.EN_ARREGLO;
    order.repairNote = dto.note;
    await this.ordersRepository.save(order);
    return this.findOne(id);
  }

  async resolveRepair(id: string): Promise<Order> {
    const order = await this.findOne(id);
    order.status = OrderStatus.ACTIVA;
    order.repairNote = null;
    await this.ordersRepository.save(order);
    return this.findOne(id);
  }

  private orderRelations(includeTree = false) {
    return {
      client: true,
      article: { supplies: { supply: true }, decorationParts: true },
      fabric: true,
      sizeCurve: { values: true },
      initialWorkshop: true,
      requestedItems: { sizeCurveValue: true, fabric: true },
      parts: {
        parentPart: true,
        fabric: true,
        sizeCurveValue: true,
        currentStage: true,
        children: includeTree
          ? {
              children: true,
              currentStage: true,
              events: { stage: true, workshop: true },
              supplies: { supply: true },
            }
          : true,
        events: { stage: true, workshop: true },
        supplies: { supply: true },
      },
    } as const;
  }

  private async nextInternalCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `OC-${year}-`;
    const latest = await this.ordersRepository
      .createQueryBuilder('order')
      .where('order.internal_code LIKE :prefix', { prefix: `${prefix}%` })
      .andWhere('order.internal_code ~ :pattern', {
        pattern: `^${prefix}[0-9]{6}$`,
      })
      .orderBy('order.internal_code', 'DESC')
      .getOne();
    const next = latest
      ? Number(latest.internalCode.slice(prefix.length)) + 1
      : 1;
    return `${prefix}${String(next).padStart(6, '0')}`;
  }

  private async preloadPartSupplies(part: OrderPart, article: Article): Promise<void> {
    const supplies = (article.supplies ?? []).map((articleSupply) =>
      this.partSuppliesRepository.create({
        orderPart: part,
        supply: articleSupply.supply,
        completeness: SupplyCompleteness.FALTANTE,
        quantityNeeded: articleSupply.quantity
          ? Math.ceil(Number(articleSupply.quantity))
          : null,
        note: articleSupply.note ?? null,
      }),
    );
    if (supplies.length > 0) {
      await this.partSuppliesRepository.save(supplies);
    }
  }

  private sameValue(values: (string | null | undefined)[]): boolean {
    return values.every((value) => value === values[0]);
  }


  private ensurePermission(
    user: AuthenticatedUser,
    action: PermissionAction,
    sectors: SectorCode[],
  ): void {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const allowed = (user.permissions ?? []).some(
      (permission) =>
        permission.isAllowed &&
        permission.action === action &&
        (permission.sectorCode === null || sectors.includes(permission.sectorCode)),
    );
    if (!allowed) {
      throw new ForbiddenException('No tenes permisos para esta accion');
    }
  }

  private async findPart(id: string): Promise<OrderPart> {
    const part = await this.orderPartsRepository.findOne({
      where: { id },
      relations: {
        order: true,
        parentPart: true,
        fabric: true,
        sizeCurveValue: true,
        currentStage: true,
        children: true,
        events: { stage: true, workshop: true },
        supplies: { supply: true },
      },
    });
    if (!part) {
      throw new NotFoundException('Parte no encontrada');
    }
    return part;
  }



  private async findPartsByIds(ids: string[]): Promise<OrderPart[]> {
    return this.orderPartsRepository.find({
      where: { id: In(ids) },
      relations: {
        parentPart: true,
        fabric: true,
        sizeCurveValue: true,
        currentStage: true,
        events: { stage: true, workshop: true },
        supplies: { supply: true },
      },
      order: { partCode: 'ASC' },
    });
  }

  private async findClient(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOneBy({ id });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  private async findArticle(id: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: { supplies: { supply: true }, decorationParts: true },
    });
    if (!article) {
      throw new NotFoundException('Articulo no encontrado');
    }
    return article;
  }

  private async findUser(id: string): Promise<User> {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  private async findSizeCurve(id: number): Promise<SizeCurve> {
    const curve = await this.sizeCurvesRepository.findOne({
      where: { id },
      relations: { values: true },
    });
    if (!curve) {
      throw new NotFoundException('Curva de talles no encontrada');
    }
    return curve;
  }

  private async findSizeCurveValue(id: number): Promise<SizeCurveValue> {
    const value = await this.sizeCurveValuesRepository.findOne({
      where: { id },
      relations: { sizeCurve: true },
    });
    if (!value) {
      throw new NotFoundException('Talle no encontrado');
    }
    return value;
  }

  private async findFabric(id: string): Promise<Fabric> {
    const fabric = await this.fabricsRepository.findOneBy({ id });
    if (!fabric) {
      throw new NotFoundException('Tela no encontrada');
    }
    return fabric;
  }

  private async findWorkshop(id: string): Promise<Workshop> {
    const workshop = await this.workshopsRepository.findOneBy({ id });
    if (!workshop) {
      throw new NotFoundException('Taller no encontrado');
    }
    return workshop;
  }
}
