import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { ArticleSupply } from './entities/article-supply.entity';
import { ArticleDecorationPart } from './entities/article-decoration-part.entity';
import { Supply } from '../catalog/entities/supply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Article, ArticleSupply, ArticleDecorationPart, Supply])],
  controllers: [ArticlesController],
  providers: [ArticlesService],
})
export class ArticlesModule {}
