import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SectorCode } from '../../catalog/entities/catalog.enums';
import { PermissionAction, UserRole } from '../entities/user.enums';

export class UserQueryDto extends PaginationQueryDto {}

export class UserPermissionDto {
  @IsOptional()
  @IsEnum(SectorCode)
  sectorCode?: SectorCode | null;

  @IsEnum(PermissionAction)
  action!: PermissionAction;

  @IsOptional()
  @IsBoolean()
  isAllowed?: boolean;
}

export class CreateUserDto {
  @IsString()
  @MaxLength(150)
  fullName!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  permissions?: UserPermissionDto[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  fullName?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  permissions?: UserPermissionDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export type UserResponseDto = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  permissions: {
    sectorCode: SectorCode | null;
    action: PermissionAction;
    isAllowed: boolean;
  }[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
