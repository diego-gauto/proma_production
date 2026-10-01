import { ExecutionContext } from '@nestjs/common';
import { SectorOwnershipGuard } from './sector-ownership.guard';
import { UserRole } from '../../modules/users/entities/user.enums';

function contextWithRequest(request: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('SectorOwnershipGuard', () => {
  const guard = new SectorOwnershipGuard();

  it('allows Admin regardless of sector', () => {
    const context = contextWithRequest({
      user: { role: UserRole.ADMIN, stageId: 1 },
      params: { stageId: '2' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows User for their own sector', () => {
    const context = contextWithRequest({
      user: { role: UserRole.USER, stageId: 3 },
      params: { stageId: '3' },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects User for another sector', () => {
    const context = contextWithRequest({
      user: { role: UserRole.USER, stageId: 3 },
      body: { stageId: 4 },
    });

    expect(() => guard.canActivate(context)).toThrow(
      'No puede operar recursos de otro sector',
    );
  });
});
