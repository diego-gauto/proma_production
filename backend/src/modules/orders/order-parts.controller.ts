import { Body, Controller, Param, Post } from '@nestjs/common';
import { RecombinePartsDto, SplitPartDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@Controller('order-parts')
export class OrderPartsController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post(':id/split')
  split(@Param('id') id: string, @Body() dto: SplitPartDto) {
    return this.ordersService.split(id, dto);
  }

  @Post('recombine')
  recombine(@Body() dto: RecombinePartsDto) {
    return this.ordersService.recombine(dto);
  }
}
