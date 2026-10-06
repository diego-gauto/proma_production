import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { ClientContact } from './client-contact.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_name', type: 'varchar', length: 180 })
  businessName!: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 30 })
  taxId!: string;

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

  @OneToMany(() => ClientContact, (contact) => contact.client, {
    cascade: ['insert', 'update'],
  })
  contacts!: ClientContact[];

  @OneToMany(() => Order, (order) => order.client)
  orders!: Order[];
}
