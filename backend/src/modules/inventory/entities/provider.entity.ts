import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FabricStockEntry } from './fabric-stock-entry.entity';
import { ProviderContact } from './provider-contact.entity';
import { SupplyStockEntry } from './supply-stock-entry.entity';

@Entity('providers')
export class Provider {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_name', type: 'varchar', length: 180 })
  businessName!: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 30, nullable: true })
  taxId?: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ name: 'locality', type: 'varchar', length: 120, nullable: true })
  locality?: string | null;

  @Column({ name: 'district', type: 'varchar', length: 120, nullable: true })
  district?: string | null;

  @Column({ name: 'province', type: 'varchar', length: 120, nullable: true })
  province?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ProviderContact, (contact) => contact.provider, { cascade: ['insert', 'update'] })
  contacts!: ProviderContact[];

  @OneToMany(() => FabricStockEntry, (entry) => entry.provider)
  fabricEntries!: FabricStockEntry[];

  @OneToMany(() => SupplyStockEntry, (entry) => entry.provider)
  supplyEntries!: SupplyStockEntry[];
}
