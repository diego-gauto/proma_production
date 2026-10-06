import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, IsNull, Repository } from 'typeorm';
import { PaginatedResponse } from '../../common/dto/pagination-query.dto';
import { Supply } from '../catalog/entities/supply.entity';
import {
  ArticleQueryDto,
  ArticleSupplyDto,
  CreateArticleDto,
  UpdateArticleDto,
} from './dto/article.dto';
import { ArticleDecorationPart } from './entities/article-decoration-part.entity';
import { ArticleSupply } from './entities/article-supply.entity';
import { Article } from './entities/article.entity';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articlesRepository: Repository<Article>,
    @InjectRepository(Supply)
    private readonly suppliesRepository: Repository<Supply>,
  ) {}

  async create(dto: CreateArticleDto): Promise<Article> {
    const article = this.articlesRepository.create({
      code: dto.code,
      name: dto.name,
      description: dto.description ?? null,
      supplies: await this.buildSupplies(dto.supplies ?? []),
      decorationParts: this.buildDecorationParts(dto.decorationParts ?? []),
    });
    const saved = await this.articlesRepository.save(article);
    return this.findOne(saved.id);
  }

  async findAll(query: ArticleQueryDto): Promise<PaginatedResponse<Article>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.search
      ? [
          { code: ILike(`%${query.search}%`), deletedAt: IsNull() },
          { name: ILike(`%${query.search}%`), deletedAt: IsNull() },
        ]
      : { deletedAt: IsNull() };
    const [items, total] = await this.articlesRepository.findAndCount({
      where,
      relations: {
        supplies: { supply: true },
        decorationParts: true,
      },
      order: { name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string): Promise<Article> {
    const article = await this.articlesRepository.findOne({
      where: { id },
      relations: {
        supplies: { supply: true },
        decorationParts: true,
      },
    });
    if (!article) {
      throw new NotFoundException('Articulo no encontrado');
    }
    return article;
  }

  async update(id: string, dto: UpdateArticleDto): Promise<Article> {
    const article = await this.findOne(id);

    if (dto.code !== undefined) {
      article.code = dto.code;
    }
    if (dto.name !== undefined) {
      article.name = dto.name;
    }
    if (dto.description !== undefined) {
      article.description = dto.description;
    }
    if (dto.isActive === true) {
      article.deletedAt = null;
      article.isActive = true;
    }

    await this.articlesRepository.manager.transaction(async (manager) => {
      if (dto.supplies !== undefined) {
        await manager.delete(ArticleSupply, { article: { id } });
        article.supplies = await this.buildSupplies(dto.supplies);
      }
      if (dto.decorationParts !== undefined) {
        await manager.delete(ArticleDecorationPart, { article: { id } });
        article.decorationParts = this.buildDecorationParts(dto.decorationParts);
      }
      await manager.save(article);
    });

    return this.findOne(id);
  }

  async softDelete(id: string): Promise<Article> {
    const article = await this.findOne(id);
    article.isActive = false;
    article.deletedAt = new Date();
    return this.articlesRepository.save(article);
  }

  private async buildSupplies(entries: ArticleSupplyDto[]): Promise<ArticleSupply[]> {
    return Promise.all(
      entries.map(async (entry) => {
        const supply = await this.suppliesRepository.findOneBy({ id: entry.supplyId });
        if (!supply) {
          throw new NotFoundException('Avio no encontrado');
        }
        return Object.assign(new ArticleSupply(), {
          supply,
          quantity: entry.quantity !== undefined ? String(entry.quantity) : null,
          note: entry.note ?? null,
        });
      }),
    );
  }

  private buildDecorationParts(
    parts: { garmentPart: string; decorationType: string }[],
  ): ArticleDecorationPart[] {
    return parts.map((part) => Object.assign(new ArticleDecorationPart(), part));
  }
}
