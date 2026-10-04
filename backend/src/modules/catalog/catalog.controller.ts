import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PermissionAction, UserRole } from '../users/entities/user.enums';
import { CatalogService } from './catalog.service';
import {
  CatalogQueryDto,
  CreateFabricDto,
  CreateSizeCurveDto,
  CreateSupplyDto,
  UpdateFabricDto,
  UpdateSizeCurveDto,
  UpdateSupplyDto,
} from './dto/catalog.dto';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('fabrics')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  createFabric(@Body() dto: CreateFabricDto) {
    return this.catalogService.createFabric(dto);
  }

  @Get('fabrics')
  findFabrics(@Query() query: CatalogQueryDto) {
    return this.catalogService.findFabrics(query);
  }

  @Patch('fabrics/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  updateFabric(@Param('id') id: string, @Body() dto: UpdateFabricDto) {
    return this.catalogService.updateFabric(id, dto);
  }

  @Delete('fabrics/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  deleteFabric(@Param('id') id: string) {
    return this.catalogService.softDeleteFabric(id);
  }

  @Post('supplies')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  createSupply(@Body() dto: CreateSupplyDto) {
    return this.catalogService.createSupply(dto);
  }

  @Get('supplies')
  findSupplies(@Query() query: CatalogQueryDto) {
    return this.catalogService.findSupplies(query);
  }

  @Patch('supplies/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  updateSupply(@Param('id') id: string, @Body() dto: UpdateSupplyDto) {
    return this.catalogService.updateSupply(id, dto);
  }

  @Delete('supplies/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  deleteSupply(@Param('id') id: string) {
    return this.catalogService.softDeleteSupply(id);
  }

  @Post('size-curves')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  createSizeCurve(@Body() dto: CreateSizeCurveDto) {
    return this.catalogService.createSizeCurve(dto);
  }

  @Get('size-curves')
  findSizeCurves(@Query() query: CatalogQueryDto) {
    return this.catalogService.findSizeCurves(query);
  }

  @Get('size-curves/:id')
  findSizeCurve(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.findSizeCurve(id);
  }

  @Patch('size-curves/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  updateSizeCurve(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSizeCurveDto,
  ) {
    return this.catalogService.updateSizeCurve(id, dto);
  }

  @Delete('size-curves/:id')
  @Roles(UserRole.ADMIN)
  @Permissions({ action: PermissionAction.ADMINISTRAR })
  deleteSizeCurve(@Param('id', ParseIntPipe) id: number) {
    return this.catalogService.deleteSizeCurve(id);
  }
}
