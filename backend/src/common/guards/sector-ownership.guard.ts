import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';
import { UserRole } from '../../modules/users/entities/user.enums';

type SectorScopedRequest = {
  user?: AuthenticatedUser;
  params?: { stageId?: string; sectorStageId?: string };
  body?: { stageId?: number | string; sectorStageId?: number | string };
  resource?: { stageId?: number | string; sectorStageId?: number | string };
};

@Injectable()
export class SectorOwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<SectorScopedRequest>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    if (user.role === UserRole.ADMIN) {
      return true;
    }

    const requestedStageId = this.resolveRequestedStageId(request);
    if (requestedStageId !== user.stageId) {
      throw new ForbiddenException('No puede operar recursos de otro sector');
    }

    return true;
  }

  private resolveRequestedStageId(request: SectorScopedRequest): number | null {
    const rawStageId =
      request.params?.stageId ??
      request.params?.sectorStageId ??
      request.body?.stageId ??
      request.body?.sectorStageId ??
      request.resource?.stageId ??
      request.resource?.sectorStageId;

    if (rawStageId === undefined || rawStageId === null || rawStageId === '') {
      return null;
    }

    const stageId = Number(rawStageId);
    return Number.isInteger(stageId) ? stageId : null;
  }
}
