import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Fabric } from '../catalog/entities/fabric.entity';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { SizeCurve } from '../catalog/entities/size-curve.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { Order } from './entities/order.entity';
import { OrderPart } from './entities/order-part.entity';
import { PartSupply } from './entities/part-supply.entity';
import { OrderPartsController } from './order-parts.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Client,
      Article,
      User,
      SizeCurveValue,
      SizeCurve,
      Fabric,
      Workshop,
      OrderPart,
      PartSupply,
    ]),
  ],
  controllers: [OrdersController, OrderPartsController],
  providers: [OrdersService],
})
export class OrdersModule {}
