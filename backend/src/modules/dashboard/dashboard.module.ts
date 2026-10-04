import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Stage } from '../catalog/entities/stage.entity';
import { OrderPart } from '../orders/entities/order-part.entity';
import { Order } from '../orders/entities/order.entity';
import { PartStageEvent } from '../orders/entities/part-stage-event.entity';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderPart, PartStageEvent, Stage]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
