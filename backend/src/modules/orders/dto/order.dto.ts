import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PartSplitMode } from '../entities/order.enums';

export class OrderQueryDto extends PaginationQueryDto {}

export class OrderPartsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stageId?: number;
}

export class CreateOrderRequestedItemDto {
  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @Type(() => Number)
  @IsInt()
  sizeCurveValueId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantityRequested!: number;
}

export class CreateOrderDto {
  @IsString()
  @MaxLength(50)
  externalCode!: string;

  @IsUUID()
  clientId!: string;

  @IsUUID()
  articleId!: string;

  @IsUUID()
  fabricId!: string;

  @Type(() => Number)
  @IsInt()
  sizeCurveId!: number;

  @IsOptional()
  @IsUUID()
  initialWorkshopId?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderRequestedItemDto)
  requestedItems!: CreateOrderRequestedItemDto[];
}

export class NewSubPartDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sizeCurveValueId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  splitReason?: string;
}

export class SplitPartDto {
  @IsEnum(PartSplitMode)
  splitMode!: PartSplitMode;

  @IsArray()
  @ArrayMinSize(2, { message: 'Una division debe generar al menos 2 sub-partes' })
  @ValidateNested({ each: true })
  @Type(() => NewSubPartDto)
  subParts!: NewSubPartDto[];
}

export class RecombinePartsDto {
  @IsArray()
  @ArrayMinSize(2, { message: 'La reunificacion requiere al menos 2 ramas componente' })
  @IsUUID('4', { each: true })
  componentPartIds!: string[];

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
