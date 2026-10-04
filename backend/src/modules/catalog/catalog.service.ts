import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  PaginatedResponse,
  PaginationQueryDto,
} from '../../common/dto/pagination-query.dto';
import {
  CatalogQueryDto,
  CreateFabricDto,
  CreateSizeCurveDto,
  CreateSupplyDto,
  UpdateFabricDto,
  UpdateSizeCurveDto,
  UpdateSupplyDto,
} from './dto/catalog.dto';
import { Fabric } from './entities/fabric.entity';
import { SizeCurveValue } from './entities/size-curve-value.entity';
import { SizeCurve } from './entities/size-curve.entity';
import { Stage } from './entities/stage.entity';
import { Supply } from './entities/supply.entity';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Fabric)
    private readonly fabricsRepository: Repository<Fabric>,
    @InjectRepository(Supply)
    private readonly suppliesRepository: Repository<Supply>,
    @InjectRepository(SizeCurve)
    private readonly sizeCurvesRepository: Repository<SizeCurve>,
    @InjectRepository(Stage)
    private readonly stagesRepository: Repository<Stage>,
  ) {}

  findStages(): Promise<Stage[]> {
    return this.stagesRepository.find({ order: { sequenceOrder: 'ASC' } });
  }

  createFabric(dto: CreateFabricDto): Promise<Fabric> {
    const fabric = this.fabricsRepository.create({
      ...dto,
      weightOz: dto.weightOz !== undefined ? dto.weightOz.toFixed(2) : null,
    });
    return this.fabricsRepository.save(fabric);
  }

  findFabrics(query: CatalogQueryDto): Promise<PaginatedResponse<Fabric>> {
    return this.findPaginated(this.fabricsRepository, query, (qb) => {
      if (query.supplier) {
        qb.andWhere('item.supplier ILIKE :supplier', { supplier: `%${query.supplier}%` });
      }
      if (query.weaveType) {
        qb.andWhere('item.weave_type = :weaveType', { weaveType: query.weaveType });
      }
      if (query.formatType) {
        qb.andWhere('item.format_type = :formatType', { formatType: query.formatType });
      }
    });
  }

  async findFabric(id: string): Promise<Fabric> {
    const fabric = await this.fabricsRepository.findOneBy({ id });
    if (!fabric) {
      throw new NotFoundException('Tela no encontrada');
    }
    return fabric;
  }

  async updateFabric(id: string, dto: UpdateFabricDto): Promise<Fabric> {
    const fabric = await this.findFabric(id);
    Object.assign(fabric, {
      ...dto,
      weightOz:
        dto.weightOz !== undefined ? dto.weightOz.toFixed(2) : fabric.weightOz,
    });
    return this.fabricsRepository.save(fabric);
  }

  async softDeleteFabric(id: string): Promise<Fabric> {
    const fabric = await this.findFabric(id);
    fabric.isActive = false;
    return this.fabricsRepository.save(fabric);
  }

  createSupply(dto: CreateSupplyDto): Promise<Supply> {
    return this.suppliesRepository.save(this.suppliesRepository.create(dto));
  }

  findSupplies(query: CatalogQueryDto): Promise<PaginatedResponse<Supply>> {
    return this.findPaginated(this.suppliesRepository, query, (qb) => {
      if (query.supplier) {
        qb.andWhere('item.supplier ILIKE :supplier', { supplier: `%${query.supplier}%` });
      }
      if (query.category) {
        qb.andWhere('item.category = :category', { category: query.category });
      }
    });
  }

  async findSupply(id: string): Promise<Supply> {
    const supply = await this.suppliesRepository.findOneBy({ id });
    if (!supply) {
      throw new NotFoundException('Avio no encontrado');
    }
    return supply;
  }

  async updateSupply(id: string, dto: UpdateSupplyDto): Promise<Supply> {
    const supply = await this.findSupply(id);
    Object.assign(supply, dto);
    return this.suppliesRepository.save(supply);
  }

  async softDeleteSupply(id: string): Promise<Supply> {
    const supply = await this.findSupply(id);
    supply.isActive = false;
    return this.suppliesRepository.save(supply);
  }

  createSizeCurve(dto: CreateSizeCurveDto): Promise<SizeCurve> {
    const sizeCurve = this.sizeCurvesRepository.create({
      name: dto.name,
      sequenceType: dto.sequenceType,
      values: dto.values.map((value) =>
        Object.assign(new SizeCurveValue(), value),
      ),
    });
    return this.sizeCurvesRepository.save(sizeCurve);
  }

  async findSizeCurves(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<SizeCurve>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.search ? { name: ILike(`%${query.search}%`) } : {};
    const [items, total] = await this.sizeCurvesRepository.findAndCount({
      where,
      relations: { values: true },
      order: { name: 'ASC', values: { sortOrder: 'ASC' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findSizeCurve(id: number): Promise<SizeCurve> {
    const sizeCurve = await this.sizeCurvesRepository.findOne({
      where: { id },
      relations: { values: true },
      order: { values: { sortOrder: 'ASC' } },
    });
    if (!sizeCurve) {
      throw new NotFoundException('Curva de talles no encontrada');
    }
    return sizeCurve;
  }

  async updateSizeCurve(
    id: number,
    dto: UpdateSizeCurveDto,
  ): Promise<SizeCurve> {
    const sizeCurve = await this.findSizeCurve(id);

    await this.sizeCurvesRepository.manager.transaction(async (manager) => {
      Object.assign(sizeCurve, {
        name: dto.name ?? sizeCurve.name,
        sequenceType: dto.sequenceType ?? sizeCurve.sequenceType,
      });

      if (dto.values) {
        await manager.delete(SizeCurveValue, { sizeCurve: { id } });
        sizeCurve.values = dto.values.map((value) =>
          Object.assign(new SizeCurveValue(), value),
        );
      }

      await manager.save(sizeCurve);
    });

    return this.findSizeCurve(id);
  }

  async deleteSizeCurve(id: number): Promise<SizeCurve> {
    const sizeCurve = await this.findSizeCurve(id);
    await this.sizeCurvesRepository.remove(sizeCurve);
    return sizeCurve;
  }

  private async findPaginated<T extends { name: string }>(
    repository: Repository<T>,
    query: PaginationQueryDto,
    applyFilters?: (queryBuilder: ReturnType<Repository<T>["createQueryBuilder"]>) => void,
  ): Promise<PaginatedResponse<T>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder = repository
      .createQueryBuilder('item')
      .where('item.is_active = true')
      .orderBy('item.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      queryBuilder.andWhere('(item.name ILIKE :search OR item.code ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    applyFilters?.(queryBuilder);

    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, limit };
  }
}
