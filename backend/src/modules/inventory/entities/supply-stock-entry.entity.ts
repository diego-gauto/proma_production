import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supply } from '../../catalog/entities/supply.entity';
import { Provider } from './provider.entity';

@Entity('supply_stock_entries')
export class SupplyStockEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, (provider) => provider.supplyEntries)
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @ManyToOne(() => Supply)
  @JoinColumn({ name: 'supply_id' })
  supply!: Supply;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 80, nullable: true })
  documentNumber?: string | null;

  @Column({ name: 'quantity', type: 'numeric', precision: 12, scale: 2 })
  quantity!: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
