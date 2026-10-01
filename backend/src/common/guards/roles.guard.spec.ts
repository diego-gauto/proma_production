import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../modules/users/entities/user.enums';

function contextWithUser(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => contextWithUser,
    getClass: () => Object,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows Admin when Admin role is required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser({ role: UserRole.ADMIN }))).toBe(
      true,
    );
  });

  it('rejects User when Admin role is required', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue([UserRole.ADMIN]),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    expect(guard.canActivate(contextWithUser({ role: UserRole.USER }))).toBe(
      false,
    );
  });
});
