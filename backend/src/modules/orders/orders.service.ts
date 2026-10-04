import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import { Article } from '../articles/entities/article.entity';
import { Fabric } from '../catalog/entities/fabric.entity';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
import { OrderPart } from './entities/order-part.entity';
import { OrderRequestedItem } from './entities/order-requested-item.entity';
import { Order } from './entities/order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(SizeCurveValue)
    private readonly sizeCurveValuesRepository: Repository<SizeCurveValue>,
    @InjectRepository(Fabric)
    private readonly fabricsRepository: Repository<Fabric>,
  ) {}

  async create(dto: CreateOrderDto, userId: string): Promise<Order> {
    const existing = await this.ordersRepository.findOne({
      where: { externalCode: dto.externalCode },
    });
    if (existing) {
      throw new ConflictException('Ya existe una orden con ese codigo externo');
    }

    const [client, article, createdBy] = await Promise.all([
      this.findClient(dto.clientId),
      this.findArticle(dto.articleId),
      this.findUser(userId),
    ]);
    const requestedItems = await Promise.all(
      dto.requestedItems.map(async (item) => {
        const sizeCurveValue = await this.findSizeCurveValue(
          item.sizeCurveValueId,
        );
        const fabric = item.fabricId
          ? await this.findFabric(item.fabricId)
          : null;
        return Object.assign(new OrderRequestedItem(), {
          fabric,
          color: item.color ?? null,
          sizeCurveValue,
          quantityRequested: item.quantityRequested,
        });
      }),
    );
    const quantity = requestedItems.reduce(
      (total, item) => total + item.quantityRequested,
      0,
    );

    const order = this.ordersRepository.create({
      internalCode: await this.nextInternalCode(),
      externalCode: dto.externalCode,
      client,
      article,
      createdBy,
      requestedItems,
      parts: [
        Object.assign(new OrderPart(), {
          partCode: 'P1',
          quantity,
          color: requestedItems[0].color ?? null,
          fabric: requestedItems[0].fabric ?? null,
          sizeCurveValue: requestedItems[0].sizeCurveValue,
        }),
      ],
    });

    return this.ordersRepository.save(order);
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
      relations: {
        client: true,
        article: true,
        requestedItems: { sizeCurveValue: true, fabric: true },
        parts: { currentStage: true, events: { stage: true, workshop: true } },
      },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: {
        client: true,
        article: true,
        requestedItems: { sizeCurveValue: true, fabric: true },
        parts: {
          currentStage: true,
          children: true,
          events: { stage: true, workshop: true },
          supplies: { supply: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return order;
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

  private async findClient(id: string): Promise<Client> {
    const client = await this.clientsRepository.findOneBy({ id });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }

  private async findArticle(id: string): Promise<Article> {
    const article = await this.articlesRepository.findOneBy({ id });
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

  private async findSizeCurveValue(id: number): Promise<SizeCurveValue> {
    const value = await this.sizeCurveValuesRepository.findOneBy({ id });
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
}
