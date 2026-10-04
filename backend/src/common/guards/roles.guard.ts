import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  PERMISSIONS_KEY,
  RequiredPermission,
} from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../../modules/auth/types/authenticated-user.type';
import { UserRole } from '../../modules/users/entities/user.enums';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<
      RequiredPermission[]
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (requiredRoles?.includes(user.role)) {
      return true;
    }

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return false;
    }

    return requiredPermissions.some((required) =>
      (user.permissions ?? []).some(
        (permission) =>
          permission.isAllowed &&
          permission.action === required.action &&
          (required.sectorCode === undefined ||
            required.sectorCode === null ||
            permission.sectorCode === required.sectorCode ||
            permission.sectorCode === null),
      ),
    );
  }
}
