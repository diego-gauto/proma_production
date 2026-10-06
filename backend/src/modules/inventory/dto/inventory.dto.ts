import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { StockAdjustmentReason } from '../entities/stock-adjustment.entity';

export class ProviderContactDto {
  @IsString()
  @MaxLength(150)
  contactName!: string;

  @IsOptional()
  @IsString()
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
  isPrimary?: boolean;
}

export class ProviderQueryDto extends PaginationQueryDto {}

export class CreateProviderDto {
  @IsString()
  @MaxLength(180)
  businessName!: string;

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
  @Type(() => ProviderContactDto)
  contacts?: ProviderContactDto[];
}

export class UpdateProviderDto extends CreateProviderDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class FabricRollDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(80)
  lot!: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity!: number;
}

export class CreateFabricStockEntryDto {
  @IsUUID()
  providerId!: string;

  @IsUUID()
  fabricId!: string;

  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentNumber?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FabricRollDto)
  rolls!: FabricRollDto[];
}

export class CreateSupplyStockEntryDto {
  @IsUUID()
  providerId!: string;

  @IsUUID()
  supplyId!: string;

  @IsDateString()
  entryDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  documentNumber?: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}


export class StockQueryDto extends PaginationQueryDto {}

export class CreateStockAdjustmentDto {
  @IsNumber()
  @Type(() => Number)
  quantityDelta!: number;

  @IsEnum(StockAdjustmentReason)
  reason!: StockAdjustmentReason;

  @IsOptional()
  @IsString()
  note?: string;
}
