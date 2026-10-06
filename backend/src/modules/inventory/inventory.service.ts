import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import { Fabric } from '../catalog/entities/fabric.entity';
import { Supply } from '../catalog/entities/supply.entity';
import {
  CreateFabricStockEntryDto,
  CreateProviderDto,
  CreateSupplyStockEntryDto,
  ProviderQueryDto,
  UpdateProviderDto,
} from './dto/inventory.dto';
import { FabricRoll } from './entities/fabric-roll.entity';
import { FabricStockEntry } from './entities/fabric-stock-entry.entity';
import { ProviderContact } from './entities/provider-contact.entity';
import { Provider } from './entities/provider.entity';
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
      rolls: dto.rolls.map((roll) => Object.assign(new FabricRoll(), roll)),
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
}
