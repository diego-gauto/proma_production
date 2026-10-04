import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class OrderQueryDto extends PaginationQueryDto {}

export class CreateOrderRequestedItemDto {
  @IsOptional()
  @IsUUID()
  fabricId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  color?: string;

  @IsInt()
  sizeCurveValueId!: number;

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

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderRequestedItemDto)
  requestedItems!: CreateOrderRequestedItemDto[];
}
