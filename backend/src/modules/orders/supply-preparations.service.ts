import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { SectorCode, SupplyCategory } from '../catalog/entities/catalog.enums';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { User } from '../users/entities/user.entity';
import { Order } from './entities/order.entity';
import { OrderPart } from './entities/order-part.entity';
import { PartSupply } from './entities/part-supply.entity';
import { OrderStatus, SupplyCompleteness } from './entities/order.enums';
import { SaveSupplyPreparationDto, SupplyPreparationQueryDto } from './dto/supply-preparation.dto';

export type PreparationStatus = 'PARA_PREPARAR' | 'EN_PREPARACION' | 'INCOMPLETO' | 'TERMINADO';

export function activeSupplyParts<T extends { isSplit: boolean; status: string; recombinedIntoPartId?: string | null }>(parts: T[]): T[] {
  return parts.filter(part => !part.isSplit && part.status !== 'DIVIDIDA' && part.status !== 'REINTEGRADA' && !part.recombinedIntoPartId);
}

export function splitPreparationGroups<T extends { id: string; partCode: string; quantity: number; isSplit: boolean; parentPartId?: string | null }>(parts: T[]) {
  return parts.filter(part => part.isSplit).map(parent => ({
    parentPartCode: parent.partCode, parentQuantity: parent.quantity,
    children: parts.filter(child => child.parentPartId === parent.id).sort((a, b) => a.partCode.localeCompare(b.partCode)).map(child => ({ partCode: child.partCode, quantity: child.quantity })),
  })).filter(group => group.children.length > 0);
}

@Injectable()
export class SupplyPreparationsService {
  constructor(@InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(OrderPart) private readonly parts: Repository<OrderPart>) {}

  private authorize(user: AuthenticatedUser, category: SupplyCategory, action: PermissionAction) {
    const sector = category === SupplyCategory.CONFECCION ? SectorCode.AVIOS_CONFECCION : SectorCode.AVIOS_TERMINACION;
    if (user.role !== UserRole.ADMIN && !user.permissions.some(p => p.isAllowed && p.action === action && (p.sectorCode === sector || p.sectorCode === null))) {
      throw new ForbiddenException('No tenés permiso para esta categoría de avíos');
    }
  }

  private query(category: SupplyCategory) {
    return this.orders.createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.article', 'article')
      .leftJoinAndSelect('article.supplies', 'requirements')
      .leftJoinAndSelect('requirements.supply', 'requiredSupply')
      .leftJoinAndSelect('order.fabric', 'fabric')
      .leftJoinAndSelect('order.parts', 'part')
      .leftJoinAndSelect('part.supplies', 'checklist')
      .leftJoinAndSelect('checklist.supply', 'supply')
      .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELADA })
      .andWhere('EXISTS (SELECT 1 FROM part_supplies ps JOIN order_parts op ON op.id = ps.order_part_id JOIN supplies s ON s.id = ps.supply_id WHERE op.order_id = "order".id AND s.category = :category)', { category });
  }

  async list(query: SupplyPreparationQueryDto, user: AuthenticatedUser) {
    this.authorize(user, query.category, PermissionAction.VER);
    const qb = this.query(query.category);
    if (query.search?.trim()) qb.andWhere(new Brackets(q => {
      q.where('order.external_code ILIKE :search').orWhere('order.internal_code ILIKE :search')
        .orWhere('client.business_name ILIKE :search').orWhere('article.name ILIKE :search');
    }), { search: `%${query.search.trim()}%` });
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [orders, total] = await qb.orderBy('order.createdAt', 'DESC').addOrderBy('order.id', 'ASC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return { items: orders.map(order => this.present(order, query.category)), total, page, limit };
  }

  async detail(id: string, category: SupplyCategory, user: AuthenticatedUser) {
    this.authorize(user, category, PermissionAction.VER);
    const order = await this.query(category).andWhere('order.id = :id', { id }).getOne();
    if (!order) throw new NotFoundException('No hay avíos de esta categoría para la orden');
    return this.present(order, category);
  }

  async save(partId: string, dto: SaveSupplyPreparationDto, user: AuthenticatedUser) {
    this.authorize(user, dto.category, PermissionAction.EDITAR);
    return this.parts.manager.transaction(async manager => {
      const part = await manager.findOne(OrderPart, { where: { id: partId }, lock: { mode: 'pessimistic_write' } });
      if (!part) throw new NotFoundException('Parte no encontrada');
      const loaded = await manager.findOneOrFail(OrderPart, { where: { id: partId }, relations: {
        order: { article: { supplies: { supply: true } } }, supplies: { supply: true },
      } });
      if (loaded.order.status === OrderStatus.CANCELADA) throw new BadRequestException('La orden está cancelada');
      const checklist = loaded.supplies.filter(row => row.supply.category === dto.category);
      if (!checklist.length) throw new BadRequestException('Esta parte no tiene avíos de esa categoría');
      if (dto.action === 'SAVE' && !dto.items.length) throw new BadRequestException('Cargá al menos una cantidad preparada');
      if (dto.action === 'START' && dto.items.length) throw new BadRequestException('Iniciar preparación no recibe cantidades');
      const changed: PartSupply[] = [];
      for (const input of dto.items) {
        const row = checklist.find(item => item.supply.id === input.supplyId);
        if (!row) throw new BadRequestException('El avío no pertenece a esta parte y categoría');
        const requirement = loaded.order.article.supplies.find(item => item.supply.id === row.supply.id);
        const perUnit = requirement?.quantity == null ? row.quantityNeeded : Number(requirement.quantity);
        if (perUnit == null) throw new BadRequestException('Definí primero la cantidad por prenda en el artículo');
        const total = Math.ceil(perUnit * loaded.quantity);
        if (input.quantityAvailable < total && input.completeness === SupplyCompleteness.COMPLETO) {
          throw new BadRequestException('Indicá Parcial o Faltante cuando la cantidad preparada es inferior al total');
        }
        row.quantityAvailable = input.quantityAvailable;
        row.completeness = input.quantityAvailable >= total ? SupplyCompleteness.COMPLETO : input.completeness;
        row.updatedBy = Object.assign(new User(), { id: user.id });
        changed.push(row);
      }
      if (dto.action === 'START') {
        for (const row of checklist.filter(row => !row.updatedById)) {
          row.updatedBy = Object.assign(new User(), { id: user.id });
          changed.push(row);
        }
      }
      await manager.save(PartSupply, changed);
      return { saved: changed.length };
    });
  }

  private present(order: Order, category: SupplyCategory) {
    const allParts = order.parts ?? [];
    const activeParts = activeSupplyParts(allParts);
    const splitGroups = splitPreparationGroups(allParts);
    const parts = activeParts.slice().sort((a, b) => a.partCode.localeCompare(b.partCode)).map(part => ({
      id: part.id, partCode: part.partCode, quantity: part.quantity,
      supplies: (part.supplies ?? []).filter(row => row.supply.category === category).sort((a, b) => a.supply.code.localeCompare(b.supply.code)).map(row => {
        const requirement = order.article.supplies.find(item => item.supply.id === row.supply.id);
        const perUnit = requirement?.quantity == null ? row.quantityNeeded ?? null : Number(requirement.quantity);
        const total = perUnit == null ? null : Math.ceil(perUnit * part.quantity);
        return {
          id: row.supply.id, code: row.supply.code, name: row.supply.name, color: row.supply.color,
          perUnit, total, quantityAvailable: row.quantityAvailable ?? null,
          completeness: total !== null && row.quantityAvailable != null && row.quantityAvailable >= total ? SupplyCompleteness.COMPLETO : row.completeness === SupplyCompleteness.COMPLETO ? SupplyCompleteness.PARCIAL : row.completeness,
          started: !!row.updatedById, updatedAt: row.updatedAt,
        };
      }),
    })).filter(part => part.supplies.length);
    const supplies = parts.flatMap(part => part.supplies);
    let status: PreparationStatus = 'PARA_PREPARAR';
    if (supplies.length && supplies.every(row => row.total !== null && row.quantityAvailable !== null && row.quantityAvailable >= row.total)) status = 'TERMINADO';
    else if (supplies.some(row => row.quantityAvailable !== null && (row.total === null || row.quantityAvailable < row.total))) status = 'INCOMPLETO';
    else if (supplies.some(row => row.started || row.quantityAvailable !== null)) status = 'EN_PREPARACION';
    return { id: order.id, externalCode: order.externalCode, internalCode: order.internalCode,
      clientName: order.client.businessName, articleCode: order.article.code, articleName: order.article.name,
      fabricName: order.fabric?.name, createdAt: order.createdAt, category, status, splitGroups, parts };
  }
}
