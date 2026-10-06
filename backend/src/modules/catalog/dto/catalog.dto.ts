import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import {
  FabricFormatType,
  FabricWeaveType,
  SizeSequenceType,
  SupplyCategory,
} from '../entities/catalog.enums';

export class CatalogQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FabricWeaveType)
  weaveType?: FabricWeaveType;

  @IsOptional()
  @IsEnum(FabricFormatType)
  formatType?: FabricFormatType;

  @IsOptional()
  @IsEnum(SupplyCategory)
  category?: SupplyCategory;

  @IsOptional()
  @IsEnum(SizeSequenceType)
  sequenceType?: SizeSequenceType;
}

export class CreateFabricDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weightOz?: number;

  @IsEnum(FabricWeaveType)
  weaveType!: FabricWeaveType;

  @IsEnum(FabricFormatType)
  formatType!: FabricFormatType;
}

export class UpdateFabricDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  weightOz?: number;

  @IsOptional()
  @IsEnum(FabricWeaveType)
  weaveType?: FabricWeaveType;

  @IsOptional()
  @IsEnum(FabricFormatType)
  formatType?: FabricFormatType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateSupplyDto {
  @IsString()
  @MaxLength(80)
  code!: string;

  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsEnum(SupplyCategory)
  category!: SupplyCategory;
}

export class UpdateSupplyDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @IsEnum(SupplyCategory)
  category?: SupplyCategory;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SizeCurveValueDto {
  @IsString()
  @MaxLength(20)
  label!: string;

  @IsInt()
  @Min(1)
  sortOrder!: number;
}

export class CreateSizeCurveDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsEnum(SizeSequenceType)
  sequenceType!: SizeSequenceType;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SizeCurveValueDto)
  values!: SizeCurveValueDto[];
}

export class UpdateSizeCurveDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(SizeSequenceType)
  sequenceType?: SizeSequenceType;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SizeCurveValueDto)
  values?: SizeCurveValueDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
