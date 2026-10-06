import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FabricStockEntry } from './fabric-stock-entry.entity';
import { StockAdjustment } from './stock-adjustment.entity';

@Entity('fabric_rolls')
export class FabricRoll {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FabricStockEntry, (entry) => entry.rolls, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fabric_stock_entry_id' })
  entry!: FabricStockEntry;

  @Column({ name: 'code', type: 'varchar', length: 80 })
  code!: string;

  @Column({ name: 'lot', type: 'varchar', length: 80 })
  lot!: string;

  @Column({ name: 'original_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
  originalQuantity!: string;

  @Column({ name: 'current_quantity', type: 'numeric', precision: 12, scale: 2, default: 0 })
  currentQuantity!: string;

  @OneToMany(() => StockAdjustment, (adjustment) => adjustment.fabricRoll)
  adjustments!: StockAdjustment[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
