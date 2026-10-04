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
import {
  CreateWorkshopDto,
  UpdateWorkshopDto,
  WorkshopQueryDto,
} from './dto/workshop.dto';
import { WorkshopsService } from './workshops.service';

@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  create(@Body() dto: CreateWorkshopDto) {
    return this.workshopsService.create(dto);
  }

  @Get()
  findAll(@Query() query: WorkshopQueryDto) {
    return this.workshopsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.workshopsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  update(@Param('id') id: string, @Body() dto: UpdateWorkshopDto) {
    return this.workshopsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  remove(@Param('id') id: string) {
    return this.workshopsService.softDelete(id);
  }
}
