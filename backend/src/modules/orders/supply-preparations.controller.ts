import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { SaveSupplyPreparationDto, SupplyPreparationQueryDto } from './dto/supply-preparation.dto';
import { SupplyPreparationsService } from './supply-preparations.service';

// Authentication uses the application JWT guard; the service checks category + action.
@Controller('supply-preparations')
export class SupplyPreparationsController {
  constructor(private readonly service: SupplyPreparationsService) {}
  @Get()
  list(@Query() query: SupplyPreparationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(query, user);
  }
  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string, @Query() query: SupplyPreparationQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.detail(id, query.category, user);
  }
  @Patch(':partId')
  save(@Param('partId', ParseUUIDPipe) id: string, @Body() dto: SaveSupplyPreparationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.save(id, dto, user);
  }
}
