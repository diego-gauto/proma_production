import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  CreateCutLoadDto,
  CreateDecorationLoadDto,
  FinishStageDto,
  RecombinePartsDto,
  SplitPartDto,
  StartStageDto,
  UpdatePartSupplyDto,
} from './dto/order.dto';
import { OrdersService } from './orders.service';
import { SectorProgressService } from './sector-progress.service';
import { StageEventsService } from './stage-events.service';

@Controller('order-parts')
export class OrderPartsController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly stageEventsService: StageEventsService,
    private readonly sectorProgressService: SectorProgressService,
  ) {}


  @Post(':id/stage-events/start')
  startStage(
    @Param('id') id: string,
    @Body() dto: StartStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stageEventsService.start(id, dto, user);
  }

  @Post(':id/stage-events/finish')
  finishStage(
    @Param('id') id: string,
    @Body() dto: FinishStageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stageEventsService.finish(id, dto, user);
  }


  @Post(':id/cut-loads')
  recordCutLoad(
    @Param('id') id: string,
    @Body() dto: CreateCutLoadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sectorProgressService.recordCutLoad(id, dto, user);
  }

  @Post(':id/decoration-loads')
  recordDecorationLoad(
    @Param('id') id: string,
    @Body() dto: CreateDecorationLoadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sectorProgressService.recordDecorationLoad(id, dto, user);
  }

  @Patch(':id/supplies/:supplyId')
  updateSupply(
    @Param('id') id: string,
    @Param('supplyId') supplyId: string,
    @Body() dto: UpdatePartSupplyDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.updatePartSupply(id, supplyId, dto, user);
  }

  @Post(':id/split')
  split(
    @Param('id') id: string,
    @Body() dto: SplitPartDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.split(id, dto, user);
  }

  @Post('recombine')
  recombine(
    @Body() dto: RecombinePartsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ordersService.recombine(dto, user);
  }
}
