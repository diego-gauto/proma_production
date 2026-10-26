import { Body, Controller, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { AssignConfectionDto, RegisterConfectionDeliveryDto, SendConfectionDto } from './dto/order.dto';
import { ConfectionService } from './confection.service';

@Controller('confection')
export class ConfectionController {
  constructor(private readonly service: ConfectionService) {}
  @Post('parts/:partId/assign') assign(@Param('partId') partId: string, @Body() dto: AssignConfectionDto, @CurrentUser() user: AuthenticatedUser) { return this.service.assign(partId, dto, user); }
  @Patch('assignments/:assignmentId/send') send(@Param('assignmentId') id: string, @Body() dto: SendConfectionDto, @CurrentUser() user: AuthenticatedUser) { return this.service.send(id, dto, user); }
  @Post('assignments/:assignmentId/deliveries') delivery(@Param('assignmentId') id: string, @Body() dto: RegisterConfectionDeliveryDto, @CurrentUser() user: AuthenticatedUser) { return this.service.registerDelivery(id, dto, user); }
}
