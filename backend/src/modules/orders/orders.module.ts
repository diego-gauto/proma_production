import { SupplyPreparationsService } from './supply-preparations.service';
import { SupplyPreparationsController } from './supply-preparations.controller';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Article } from '../articles/entities/article.entity';
import { Fabric } from '../catalog/entities/fabric.entity';
import { FabricRoll } from '../inventory/entities/fabric-roll.entity';
import { SizeCurveValue } from '../catalog/entities/size-curve-value.entity';
import { Stage } from '../catalog/entities/stage.entity';
import { SizeCurve } from '../catalog/entities/size-curve.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Workshop } from '../workshops/entities/workshop.entity';
import { Order } from './entities/order.entity';
import { PartCutLoadItem } from './entities/part-cut-load-item.entity';
import { PartCutLoad } from './entities/part-cut-load.entity';
import { PartDecorationLoadItem } from './entities/part-decoration-load-item.entity';
import { PartDecorationLoad } from './entities/part-decoration-load.entity';
import { PartStageEvent } from './entities/part-stage-event.entity';
import { OrderPart } from './entities/order-part.entity';
import { PartSupply } from './entities/part-supply.entity';
import { OrderPartsController } from './order-parts.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SectorProgressService } from './sector-progress.service';
import { StageEventsService } from './stage-events.service';
import { ConfectionService } from './confection.service';
import { ConfectionController } from './confection.controller';
import { ConfectionAssignment } from './entities/confection-assignment.entity';
import { ConfectionDelivery } from './entities/confection-delivery.entity';

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
      FabricRoll,
      OrderPart,
      PartSupply,
      PartStageEvent,
      PartDecorationLoadItem,
      PartDecorationLoad,
      PartCutLoadItem,
      PartCutLoad,
      Stage,
      ConfectionAssignment,
      ConfectionDelivery,
    ]),
  ],
  controllers: [OrdersController, OrderPartsController, SupplyPreparationsController, ConfectionController],
  providers: [OrdersService, StageEventsService, SectorProgressService, SupplyPreparationsService, ConfectionService],
})
export class OrdersModule {}
