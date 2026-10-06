import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FabricStockEntry } from './fabric-stock-entry.entity';

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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
