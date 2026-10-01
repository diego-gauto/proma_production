import { UserRole } from '../../users/entities/user.enums';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  stageId: number | null;
};
