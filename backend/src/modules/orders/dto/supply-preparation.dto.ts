import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsEnum, IsIn, IsInt, IsOptional, IsUUID, Min, ValidateNested } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { SupplyCategory } from '../../catalog/entities/catalog.enums';
import { SupplyCompleteness } from '../entities/order.enums';

export class SupplyPreparationQueryDto extends PaginationQueryDto {
  @IsEnum(SupplyCategory)
  category!: SupplyCategory;
}

export class SupplyPreparationItemDto {
  @IsUUID()
  supplyId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantityAvailable!: number;

  @IsEnum(SupplyCompleteness)
  completeness!: SupplyCompleteness;
}

export class SaveSupplyPreparationDto {
  @IsEnum(SupplyCategory)
  category!: SupplyCategory;

  @IsIn(['START', 'SAVE'])
  action!: 'START' | 'SAVE';

  @IsArray()
  @ArrayUnique((item: SupplyPreparationItemDto) => item.supplyId)
  @ValidateNested({ each: true })
  @Type(() => SupplyPreparationItemDto)
  items!: SupplyPreparationItemDto[];
}
