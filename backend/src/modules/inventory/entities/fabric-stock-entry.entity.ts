import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fabric } from '../../catalog/entities/fabric.entity';
import { FabricRoll } from './fabric-roll.entity';
import { Provider } from './provider.entity';

@Entity('fabric_stock_entries')
export class FabricStockEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, (provider) => provider.fabricEntries)
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @ManyToOne(() => Fabric)
  @JoinColumn({ name: 'fabric_id' })
  fabric!: Fabric;

  @Column({ name: 'entry_date', type: 'date' })
  entryDate!: string;

  @Column({ name: 'document_number', type: 'varchar', length: 80, nullable: true })
  documentNumber?: string | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => FabricRoll, (roll) => roll.entry, { cascade: ['insert', 'update'] })
  rolls!: FabricRoll[];
}
