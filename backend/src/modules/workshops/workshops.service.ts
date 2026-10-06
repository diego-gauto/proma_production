import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import {
  CreateWorkshopDto,
  UpdateWorkshopDto,
  WorkshopQueryDto,
} from './dto/workshop.dto';
import { WorkshopContact } from './entities/workshop-contact.entity';
import { Workshop } from './entities/workshop.entity';

@Injectable()
export class WorkshopsService {
  constructor(
    @InjectRepository(Workshop)
    private readonly workshopsRepository: Repository<Workshop>,
  ) {}

  async create(dto: CreateWorkshopDto): Promise<Workshop> {
    const workshop = this.workshopsRepository.create({
      ...dto,
      contacts: (dto.contacts ?? []).map((contact) =>
        Object.assign(new WorkshopContact(), contact),
      ),
    });
    return this.workshopsRepository.save(workshop);
  }

  async findAll(query: WorkshopQueryDto): Promise<PaginatedResponse<Workshop>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder = this.workshopsRepository
      .createQueryBuilder('workshop')
      .leftJoinAndSelect('workshop.contacts', 'contact')
      .where('workshop.deleted_at IS NULL')
      .orderBy('workshop.name', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      queryBuilder.andWhere(
        `(workshop.name ILIKE :search OR workshop.locality ILIKE :search OR contact.contact_name ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    if (query.specialty) {
      queryBuilder.andWhere(':specialty = ANY(workshop.specialties)', {
        specialty: query.specialty,
      });
    }

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Workshop> {
    const workshop = await this.workshopsRepository.findOne({
      where: { id },
      relations: { contacts: true },
      order: { contacts: { isPrimary: 'DESC', contactName: 'ASC' } },
    });
    if (!workshop) {
      throw new NotFoundException('Taller no encontrado');
    }
    return workshop;
  }

  async update(id: string, dto: UpdateWorkshopDto): Promise<Workshop> {
    const workshop = await this.findOne(id);
    await this.workshopsRepository.manager.transaction(async (manager) => {
      const { contacts, ...workshopFields } = dto;
      Object.assign(workshop, workshopFields);
      if (workshopFields.isActive === true) {
        workshop.deletedAt = null;
        workshop.isActive = true;
      }
      if (contacts) {
        await manager.delete(WorkshopContact, { workshop: { id } });
        workshop.contacts = contacts.map((contact) =>
          Object.assign(new WorkshopContact(), contact),
        );
      }
      await manager.save(workshop);
    });
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<Workshop> {
    const workshop = await this.findOne(id);
    workshop.isActive = false;
    workshop.deletedAt = new Date();
    return this.workshopsRepository.save(workshop);
  }
}
