import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Supply } from '../../catalog/entities/supply.entity';
import { User } from '../../users/entities/user.entity';
import { OrderPart } from './order-part.entity';
import { SupplyCompleteness } from './order.enums';

@Entity('part_supplies')
export class PartSupply {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderPart, (part) => part.supplies, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_part_id' })
  orderPart!: OrderPart;

  @ManyToOne(() => Supply, (supply) => supply.partSupplies, { nullable: false })
  @JoinColumn({ name: 'supply_id' })
  supply!: Supply;

  @Column({
    name: 'completeness',
    type: 'enum',
    enum: SupplyCompleteness,
    enumName: 'supply_completeness',
    default: SupplyCompleteness.FALTANTE,
  })
  completeness!: SupplyCompleteness;

  @Column({ name: 'quantity_needed', type: 'integer', nullable: true })
  quantityNeeded?: number | null;

  @Column({ name: 'quantity_available', type: 'integer', nullable: true })
  quantityAvailable?: number | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @ManyToOne(() => User, (user) => user.updatedSupplies, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedBy?: User | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
