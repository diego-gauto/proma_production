import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'tax_id', type: 'varchar', length: 30, nullable: true })
  taxId?: string | null;

  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  contactName?: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Order, (order) => order.client)
  orders!: Order[];
}
