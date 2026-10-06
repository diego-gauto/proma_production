import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import { Fabric } from '../catalog/entities/fabric.entity';
import { Supply } from '../catalog/entities/supply.entity';
import {
  CreateFabricStockEntryDto,
  CreateProviderDto,
  CreateStockAdjustmentDto,
  CreateSupplyStockEntryDto,
  ProviderQueryDto,
  StockQueryDto,
  UpdateProviderDto,
} from './dto/inventory.dto';
import { FabricRoll } from './entities/fabric-roll.entity';
import { FabricStockEntry } from './entities/fabric-stock-entry.entity';
import { ProviderContact } from './entities/provider-contact.entity';
import { Provider } from './entities/provider.entity';
import { StockAdjustment } from './entities/stock-adjustment.entity';
import { SupplyStockEntry } from './entities/supply-stock-entry.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Provider)
    private readonly providersRepository: Repository<Provider>,
    @InjectRepository(FabricStockEntry)
    private readonly fabricEntriesRepository: Repository<FabricStockEntry>,
    @InjectRepository(SupplyStockEntry)
    private readonly supplyEntriesRepository: Repository<SupplyStockEntry>,
    @InjectRepository(FabricRoll)
    private readonly fabricRollsRepository: Repository<FabricRoll>,
    @InjectRepository(StockAdjustment)
    private readonly stockAdjustmentsRepository: Repository<StockAdjustment>,
    @InjectRepository(Fabric)
    private readonly fabricsRepository: Repository<Fabric>,
    @InjectRepository(Supply)
    private readonly suppliesRepository: Repository<Supply>,
  ) {}

  createProvider(dto: CreateProviderDto): Promise<Provider> {
    const provider = this.providersRepository.create({
      ...dto,
      contacts: (dto.contacts ?? []).map((contact) => Object.assign(new ProviderContact(), contact)),
    });
    return this.providersRepository.save(provider);
  }

  async findProviders(query: ProviderQueryDto): Promise<PaginatedResponse<Provider>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search ? ILike(`%${query.search}%`) : undefined;
    const [items, total] = await this.providersRepository.findAndCount({
      where: search
        ? [
            { deletedAt: IsNull(), businessName: search },
            { deletedAt: IsNull(), taxId: search },
            { deletedAt: IsNull(), locality: search },
          ]
        : { deletedAt: IsNull() },
      relations: { contacts: true },
      order: { businessName: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async findProvider(id: string): Promise<Provider> {
    const provider = await this.providersRepository.findOne({ where: { id }, relations: { contacts: true } });
    if (!provider) throw new NotFoundException('Proveedor no encontrado');
    return provider;
  }

  async updateProvider(id: string, dto: UpdateProviderDto): Promise<Provider> {
    const provider = await this.findProvider(id);
    await this.providersRepository.manager.transaction(async (manager) => {
      Object.assign(provider, dto);
      if (dto.isActive === true) {
        provider.deletedAt = null;
        provider.isActive = true;
      }
      if (dto.contacts) {
        await manager.delete(ProviderContact, { provider: { id } });
        provider.contacts = dto.contacts.map((contact) => Object.assign(new ProviderContact(), contact));
      }
      await manager.save(provider);
    });
    return this.findProvider(id);
  }

  async softDeleteProvider(id: string): Promise<Provider> {
    const provider = await this.findProvider(id);
    provider.isActive = false;
    provider.deletedAt = new Date();
    return this.providersRepository.save(provider);
  }

  async createFabricEntry(dto: CreateFabricStockEntryDto): Promise<FabricStockEntry> {
    const [provider, fabric] = await Promise.all([
      this.findProvider(dto.providerId),
      this.fabricsRepository.findOneBy({ id: dto.fabricId }),
    ]);
    if (!fabric) throw new NotFoundException('Tela no encontrada');
    const entry = this.fabricEntriesRepository.create({
      provider,
      fabric,
      entryDate: dto.entryDate,
      documentNumber: dto.documentNumber,
      note: dto.note,
      rolls: dto.rolls.map((roll) =>
        Object.assign(new FabricRoll(), {
          code: roll.code,
          lot: roll.lot,
          originalQuantity: roll.quantity.toFixed(2),
          currentQuantity: roll.quantity.toFixed(2),
        }),
      ),
    });
    const saved = await this.fabricEntriesRepository.save(entry);
    return this.fabricEntriesRepository.findOneOrFail({ where: { id: saved.id }, relations: { provider: true, fabric: true, rolls: true } });
  }

  async createSupplyEntry(dto: CreateSupplyStockEntryDto): Promise<SupplyStockEntry> {
    const [provider, supply] = await Promise.all([
      this.findProvider(dto.providerId),
      this.suppliesRepository.findOneBy({ id: dto.supplyId }),
    ]);
    if (!supply) throw new NotFoundException('Avio no encontrado');
    const entry = this.supplyEntriesRepository.create({
      provider,
      supply,
      entryDate: dto.entryDate,
      documentNumber: dto.documentNumber,
      quantity: dto.quantity.toFixed(2),
      note: dto.note,
    });
    const saved = await this.supplyEntriesRepository.save(entry);
    return this.supplyEntriesRepository.findOneOrFail({ where: { id: saved.id }, relations: { provider: true, supply: true } });
  }

  async listFabricStock(query: StockQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.fabricsRepository
      .createQueryBuilder('fabric')
      .leftJoin('fabric_stock_entries', 'entry', 'entry.fabric_id = fabric.id')
      .leftJoin('fabric_rolls', 'roll', 'roll.fabric_stock_entry_id = entry.id')
      .select('fabric.id', 'fabric_id')
      .addSelect('fabric.code', 'fabric_code')
      .addSelect('fabric.name', 'fabric_name')
      .addSelect('fabric.color', 'fabric_color')
      .addSelect('COUNT(roll.id)', 'roll_count')
      .addSelect('COALESCE(SUM(roll.original_quantity), 0)', 'original_quantity')
      .addSelect('COALESCE(SUM(roll.current_quantity), 0)', 'current_quantity')
      .where('fabric.deleted_at IS NULL')
      .groupBy('fabric.id')
      .orderBy('fabric.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);

    const countQb = this.fabricsRepository.createQueryBuilder('fabric').where('fabric.deleted_at IS NULL');
    if (query.search) {
      qb.andWhere('(fabric.name ILIKE :search OR fabric.code ILIKE :search OR fabric.color ILIKE :search)', { search: `%${query.search}%` });
      countQb.andWhere('(fabric.name ILIKE :search OR fabric.code ILIKE :search OR fabric.color ILIKE :search)', { search: `%${query.search}%` });
    }

    const [rows, total] = await Promise.all([qb.getRawMany(), countQb.getCount()]);
    return {
      items: rows.map((row) => ({
        fabric: { id: row.fabric_id, code: row.fabric_code, name: row.fabric_name, color: row.fabric_color },
        rollCount: Number(row.roll_count),
        originalQuantity: Number(row.original_quantity),
        currentQuantity: Number(row.current_quantity),
      })),
      total,
      page,
      limit,
    };
  }

  async getFabricStockDetail(fabricId: string) {
    const fabric = await this.fabricsRepository.findOneBy({ id: fabricId });
    if (!fabric) throw new NotFoundException('Tela no encontrada');
    const rolls = await this.fabricRollsRepository.find({
      where: { entry: { fabric: { id: fabricId } } },
      relations: { entry: { provider: true }, adjustments: true },
      order: { code: 'ASC' },
    });
    const originalQuantity = rolls.reduce((sum, roll) => sum + Number(roll.originalQuantity), 0);
    const currentQuantity = rolls.reduce((sum, roll) => sum + Number(roll.currentQuantity), 0);
    return {
      fabric: { id: fabric.id, code: fabric.code, name: fabric.name, color: fabric.color },
      rollCount: rolls.length,
      originalQuantity,
      currentQuantity,
      rolls: rolls.map((roll) => ({
        id: roll.id,
        code: roll.code,
        lot: roll.lot,
        originalQuantity: Number(roll.originalQuantity),
        currentQuantity: Number(roll.currentQuantity),
        entryDate: roll.entry.entryDate,
        providerName: roll.entry.provider.businessName,
        movements: (roll.adjustments ?? []).map((adjustment) => ({
          id: adjustment.id,
          quantityDelta: Number(adjustment.quantityDelta),
          reason: adjustment.reason,
          note: adjustment.note,
          createdAt: adjustment.createdAt,
        })),
      })),
    };
  }

  async listSupplyStock(query: StockQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const qb = this.suppliesRepository
      .createQueryBuilder('supply')
      .leftJoin(
        (subQuery) =>
          subQuery
            .select('entry.supply_id', 'supply_id')
            .addSelect('SUM(entry.quantity)', 'entry_quantity')
            .from('supply_stock_entries', 'entry')
            .groupBy('entry.supply_id'),
        'entry_totals',
        'entry_totals.supply_id = supply.id',
      )
      .leftJoin(
        (subQuery) =>
          subQuery
            .select('adjustment.supply_id', 'supply_id')
            .addSelect('SUM(adjustment.quantity_delta)', 'adjustment_quantity')
            .from('stock_adjustments', 'adjustment')
            .groupBy('adjustment.supply_id'),
        'adjustment_totals',
        'adjustment_totals.supply_id = supply.id',
      )
      .select('supply.id', 'supply_id')
      .addSelect('supply.code', 'supply_code')
      .addSelect('supply.name', 'supply_name')
      .addSelect('supply.color', 'supply_color')
      .addSelect('supply.category', 'supply_category')
      .addSelect('COALESCE(entry_totals.entry_quantity, 0) + COALESCE(adjustment_totals.adjustment_quantity, 0)', 'current_quantity')
      .where('supply.deleted_at IS NULL')
      .orderBy('supply.name', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit);
    const countQb = this.suppliesRepository.createQueryBuilder('supply').where('supply.deleted_at IS NULL');
    if (query.search) {
      qb.andWhere('(supply.name ILIKE :search OR supply.code ILIKE :search OR supply.color ILIKE :search)', { search: `%${query.search}%` });
      countQb.andWhere('(supply.name ILIKE :search OR supply.code ILIKE :search OR supply.color ILIKE :search)', { search: `%${query.search}%` });
    }
    const [rows, total] = await Promise.all([qb.getRawMany(), countQb.getCount()]);
    return {
      items: rows.map((row) => ({
        supply: { id: row.supply_id, code: row.supply_code, name: row.supply_name, color: row.supply_color, category: row.supply_category },
        currentQuantity: Number(row.current_quantity),
      })),
      total,
      page,
      limit,
    };
  }

  async getSupplyStockDetail(supplyId: string) {
    const supply = await this.suppliesRepository.findOneBy({ id: supplyId });
    if (!supply) throw new NotFoundException('Avio no encontrado');
    const [entries, movements] = await Promise.all([
      this.supplyEntriesRepository.find({ where: { supply: { id: supplyId } }, relations: { provider: true }, order: { entryDate: 'DESC' } }),
      this.stockAdjustmentsRepository.find({ where: { supply: { id: supplyId } }, order: { createdAt: 'DESC' } }),
    ]);
    const entryTotal = entries.reduce((sum, entry) => sum + Number(entry.quantity), 0);
    const movementTotal = movements.reduce((sum, movement) => sum + Number(movement.quantityDelta), 0);
    return {
      supply: { id: supply.id, code: supply.code, name: supply.name, color: supply.color, category: supply.category },
      currentQuantity: entryTotal + movementTotal,
      entries: entries.map((entry) => ({
        id: entry.id,
        entryDate: entry.entryDate,
        providerName: entry.provider.businessName,
        quantity: Number(entry.quantity),
        documentNumber: entry.documentNumber,
      })),
      movements: movements.map((movement) => ({
        id: movement.id,
        quantityDelta: Number(movement.quantityDelta),
        reason: movement.reason,
        note: movement.note,
        createdAt: movement.createdAt,
      })),
    };
  }

  async adjustFabricRollStock(rollId: string, dto: CreateStockAdjustmentDto) {
    return this.fabricRollsRepository.manager.transaction(async (manager) => {
      const roll = await manager.findOne(FabricRoll, { where: { id: rollId } });
      if (!roll) throw new NotFoundException('Rollo no encontrado');
      const nextQuantity = Number(roll.currentQuantity) + dto.quantityDelta;
      if (nextQuantity < 0) throw new BadRequestException('El ajuste deja el rollo con stock negativo');
      roll.currentQuantity = nextQuantity.toFixed(2);
      await manager.save(roll);
      const adjustment = manager.create(StockAdjustment, {
        fabricRoll: roll,
        quantityDelta: dto.quantityDelta.toFixed(2),
        reason: dto.reason,
        note: dto.note,
      });
      return manager.save(adjustment);
    });
  }

  async adjustSupplyStock(supplyId: string, dto: CreateStockAdjustmentDto) {
    const supply = await this.suppliesRepository.findOneBy({ id: supplyId });
    if (!supply) throw new NotFoundException('Avio no encontrado');
    const detail = await this.getSupplyStockDetail(supplyId);
    if (detail.currentQuantity + dto.quantityDelta < 0) {
      throw new BadRequestException('El ajuste deja el avio con stock negativo');
    }
    const adjustment = this.stockAdjustmentsRepository.create({
      supply,
      quantityDelta: dto.quantityDelta.toFixed(2),
      reason: dto.reason,
      note: dto.note,
    });
    return this.stockAdjustmentsRepository.save(adjustment);
  }
}
