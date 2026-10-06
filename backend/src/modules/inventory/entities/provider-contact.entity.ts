import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Provider } from './provider.entity';

@Entity('provider_contacts')
export class ProviderContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Provider, (provider) => provider.contacts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: Provider;

  @Column({ name: 'contact_name', type: 'varchar', length: 150 })
  contactName!: string;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ name: 'fixed_phone', type: 'varchar', length: 50, nullable: true })
  fixedPhone?: string | null;

  @Column({ name: 'mobile_phone_1', type: 'varchar', length: 50, nullable: true })
  mobilePhone1?: string | null;

  @Column({ name: 'mobile_phone_2', type: 'varchar', length: 50, nullable: true })
  mobilePhone2?: string | null;

  @Column({ name: 'role_note', type: 'varchar', length: 120, nullable: true })
  roleNote?: string | null;

  @Column({ name: 'is_primary', type: 'boolean', default: false })
  isPrimary!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
