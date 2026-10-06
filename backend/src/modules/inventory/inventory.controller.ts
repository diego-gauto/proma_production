import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import {
  CreateFabricStockEntryDto,
  CreateProviderDto,
  CreateSupplyStockEntryDto,
  ProviderQueryDto,
  UpdateProviderDto,
} from './dto/inventory.dto';
import { InventoryService } from './inventory.service';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('providers')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  createProvider(@Body() dto: CreateProviderDto) {
    return this.inventoryService.createProvider(dto);
  }

  @Get('providers')
  findProviders(@Query() query: ProviderQueryDto) {
    return this.inventoryService.findProviders(query);
  }

  @Patch('providers/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  updateProvider(@Param('id') id: string, @Body() dto: UpdateProviderDto) {
    return this.inventoryService.updateProvider(id, dto);
  }

  @Delete('providers/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  deleteProvider(@Param('id') id: string) {
    return this.inventoryService.softDeleteProvider(id);
  }

  @Post('fabric-stock-entries')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  createFabricEntry(@Body() dto: CreateFabricStockEntryDto) {
    return this.inventoryService.createFabricEntry(dto);
  }

  @Post('supply-stock-entries')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  createSupplyEntry(@Body() dto: CreateSupplyStockEntryDto) {
    return this.inventoryService.createSupplyEntry(dto);
  }
}
