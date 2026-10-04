import { SectorCode } from '../../catalog/entities/catalog.enums';
import { PermissionAction, UserRole } from '../../users/entities/user.enums';

export type AuthenticatedPermission = {
  sectorCode: SectorCode | null;
  action: PermissionAction;
  isAllowed: boolean;
};

export type AuthenticatedUser = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  stageId?: number | null;
  permissions: AuthenticatedPermission[];
};
