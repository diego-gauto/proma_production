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
import { ClientsService } from './clients.service';
import { ClientQueryDto, CreateClientDto, UpdateClientDto } from './dto/client.dto';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  remove(@Param('id') id: string) {
    return this.clientsService.softDelete(id);
  }
}
