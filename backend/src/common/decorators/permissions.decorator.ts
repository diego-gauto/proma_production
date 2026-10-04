import { SetMetadata } from '@nestjs/common';
import { SectorCode } from '../../modules/catalog/entities/catalog.enums';
import { PermissionAction } from '../../modules/users/entities/user.enums';

export const PERMISSIONS_KEY = 'permissions';

export type RequiredPermission = {
  action: PermissionAction;
  sectorCode?: SectorCode | null;
};

export const Permissions = (...permissions: RequiredPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
