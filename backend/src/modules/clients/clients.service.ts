import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import { Client } from './entities/client.entity';
import { ClientContact } from './entities/client-contact.entity';
import { ClientQueryDto, CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {}

  async create(dto: CreateClientDto): Promise<Client> {
    const client = this.clientsRepository.create({
      ...dto,
      contacts: (dto.contacts ?? []).map((contact) =>
        Object.assign(new ClientContact(), contact),
      ),
    });
    return this.clientsRepository.save(client);
  }

  async findAll(query: ClientQueryDto): Promise<PaginatedResponse<Client>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder = this.clientsRepository
      .createQueryBuilder('client')
      .leftJoinAndSelect('client.contacts', 'contact')
      .where('client.is_active = true')
      .orderBy('client.businessName', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.search) {
      queryBuilder.andWhere(
        `(client.businessName ILIKE :search OR client.taxId ILIKE :search OR client.locality ILIKE :search OR contact.contactName ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    const [items, total] = await queryBuilder.getManyAndCount();
    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOne({
      where: { id },
      relations: { contacts: true },
      order: { contacts: { isPrimary: 'DESC', contactName: 'ASC' } },
    });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  async update(id: string, dto: UpdateClientDto): Promise<Client> {
    const client = await this.findOne(id);
    await this.clientsRepository.manager.transaction(async (manager) => {
      const { contacts, ...clientFields } = dto;
      Object.assign(client, clientFields);
      if (contacts) {
        await manager.delete(ClientContact, { client: { id } });
        client.contacts = contacts.map((contact) =>
          Object.assign(new ClientContact(), contact),
        );
      }
      await manager.save(client);
    });
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<Client> {
    const client = await this.findOne(id);
    client.isActive = false;
    return this.clientsRepository.save(client);
  }
}
