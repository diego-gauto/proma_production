import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { ArticlesService } from './articles.service';
import {
  ArticleQueryDto,
  CreateArticleDto,
  UpdateArticleDto,
} from './dto/article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ArticleQueryDto) {
    return this.articlesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  remove(@Param('id') id: string) {
    return this.articlesService.softDelete(id);
  }
}
