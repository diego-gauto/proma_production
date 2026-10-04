import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { Fabric } from './entities/fabric.entity';
import { SizeCurve } from './entities/size-curve.entity';
import { Supply } from './entities/supply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Fabric, SizeCurve, Supply])],
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
