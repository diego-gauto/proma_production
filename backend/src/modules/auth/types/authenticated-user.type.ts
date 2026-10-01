import { UserRole } from '../../users/entities/user.enums';

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  stageId: number | null;
};
