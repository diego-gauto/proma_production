import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { UserRole } from '../users/entities/user.enums';
import { CreateOrderDto, OrderQueryDto } from './dto/order.dto';
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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }
}
