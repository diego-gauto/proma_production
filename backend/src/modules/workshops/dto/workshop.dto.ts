import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SectorCode } from '../../catalog/entities/catalog.enums';

export class WorkshopQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(SectorCode)
  specialty?: SectorCode;
}

export class WorkshopContactDto {
  @IsString()
  @MaxLength(150)
  contactName!: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  fixedPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobilePhone1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mobilePhone2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  roleNote?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateWorkshopDto {
  @IsString()
  @MaxLength(180)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsArray()
  @IsEnum(SectorCode, { each: true })
  specialties!: SectorCode[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkshopContactDto)
  contacts?: WorkshopContactDto[];
}

export class UpdateWorkshopDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  locality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  district?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  province?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(SectorCode, { each: true })
  specialties?: SectorCode[];

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkshopContactDto)
  contacts?: WorkshopContactDto[];
}
