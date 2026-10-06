import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Fabric } from '../catalog/entities/fabric.entity';
import { Supply } from '../catalog/entities/supply.entity';
import { FabricRoll } from './entities/fabric-roll.entity';
import { FabricStockEntry } from './entities/fabric-stock-entry.entity';
import { ProviderContact } from './entities/provider-contact.entity';
import { Provider } from './entities/provider.entity';
import { SupplyStockEntry } from './entities/supply-stock-entry.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

@Module({
  imports: [TypeOrmModule.forFeature([Provider, ProviderContact, FabricStockEntry, FabricRoll, SupplyStockEntry, Fabric, Supply])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
