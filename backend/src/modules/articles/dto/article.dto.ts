import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ArticleQueryDto extends PaginationQueryDto {}

export class ArticleSupplyDto {
  @IsUUID()
  supplyId!: string;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class ArticleDecorationPartDto {
  @IsString()
  @MaxLength(100)
  garmentPart!: string;

  @IsString()
  @MaxLength(30)
  decorationType!: string;
}

export class CreateArticleDto {
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
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ArticleSupplyDto)
  supplies?: ArticleSupplyDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ArticleDecorationPartDto)
  decorationParts?: ArticleDecorationPartDto[];
}

export class UpdateArticleDto {
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
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ArticleSupplyDto)
  supplies?: ArticleSupplyDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => ArticleDecorationPartDto)
  decorationParts?: ArticleDecorationPartDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
