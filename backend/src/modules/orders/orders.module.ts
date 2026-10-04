import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Fabric } from '../catalog/entities/fabric.entity';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { Stage } from '../catalog/entities/stage.entity';
import { SizeCurve } from '../catalog/entities/size-curve.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { Order } from './entities/order.entity';
import { PartStageEvent } from './entities/part-stage-event.entity';
import { OrderPart } from './entities/order-part.entity';
import { PartSupply } from './entities/part-supply.entity';
import { OrderPartsController } from './order-parts.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { StageEventsService } from './stage-events.service';

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
      PartStageEvent,
      Stage,
    ]),
  ],
  controllers: [OrdersController, OrderPartsController],
  providers: [OrdersService, StageEventsService],
})
export class OrdersModule {}
