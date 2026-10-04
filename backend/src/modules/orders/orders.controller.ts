import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/entities/user.enums';
import {
  CreateOrderDto,
  OrderPartsQueryDto,
  RepairOrderDto,
  OrderQueryDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.create(dto, user.id);
  }

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }


  @Post(':id/repair')
  markRepair(@Param('id') id: string, @Body() dto: RepairOrderDto) {
    return this.ordersService.markRepair(id, dto);
  }

  @Post(':id/repair/resolve')
  @Roles(UserRole.ADMIN)
  resolveRepair(@Param('id') id: string) {
    return this.ordersService.resolveRepair(id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @Get(':orderId/parts')
  findParts(@Param('orderId') orderId: string, @Query() query: OrderPartsQueryDto) {
    return this.ordersService.findParts(orderId, query);
  }
}
