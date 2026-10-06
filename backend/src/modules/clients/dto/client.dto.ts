import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ClientQueryDto extends PaginationQueryDto {}

export class ClientContactDto {
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

export class CreateClientDto {
  @IsString()
  @MaxLength(180)
  businessName!: string;

  @IsString()
  @MaxLength(30)
  taxId!: string;

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];
}

export class UpdateClientDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  taxId?: string;

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
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClientContactDto)
  contacts?: ClientContactDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
