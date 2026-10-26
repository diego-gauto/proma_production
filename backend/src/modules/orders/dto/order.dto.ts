import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsDateString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { OrderFabricUseType, StageExecutionType } from '../../catalog/entities/catalog.enums';
import { PartSplitMode, SupplyCompleteness } from '../entities/order.enums';

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
  @IsEnum(OrderFabricUseType)
  useType?: OrderFabricUseType;

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


export class StartStageDto {
  @Type(() => Number)
  @IsInt()
  stageId!: number;

  @IsEnum(StageExecutionType)
  executionType!: StageExecutionType;

  @IsOptional()
  @IsUUID()
  workshopId?: string;

  @IsOptional()
  @IsDateString()
  estimatedFinishAt?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class FinishStageDto {
  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsDateString()
  actualFinishAt?: string;

  @IsOptional()
  includesAtraque?: boolean;
}

export class UpdatePartSupplyDto {
  @IsEnum(SupplyCompleteness)
  completeness!: SupplyCompleteness;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityAvailable?: number;

  @IsOptional()
  @IsString()
  note?: string;
}


export class CutLoadItemDto {
  @Type(() => Number)
  @IsInt()
  sizeCurveValueId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CreateCutLoadDto {
  @IsOptional()
  @IsEnum(OrderFabricUseType)
  fabricUseType?: OrderFabricUseType;

  @IsString()
  @MaxLength(80)
  lotCode!: string;

  @IsOptional()
  @IsUUID()
  fabricRollId?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(0)
  fabricQuantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  fabricUnit?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CutLoadItemDto)
  items!: CutLoadItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class DecorationLoadItemDto {
  @Type(() => Number)
  @IsInt()
  sizeCurveValueId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CreateDecorationLoadDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  garmentPart?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lotCode?: string;

  @IsDateString()
  workDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DecorationLoadItemDto)
  items!: DecorationLoadItemDto[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class RepairOrderDto {
  @IsString()
  @MaxLength(500)
  note!: string;
}

export class AssignConfectionDto { @IsUUID() workshopId!: string; @IsOptional() @IsString() note?: string; }
export class SendConfectionDto { @IsOptional() @IsString() note?: string; }
export class RegisterConfectionDeliveryDto { @Type(() => Number) @IsInt() @Min(1) quantity!: number; @IsOptional() @IsDateString() deliveredAt?: string; @IsOptional() @IsString() note?: string; }
