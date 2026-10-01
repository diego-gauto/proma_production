import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fabric } from '../../catalog/entities/fabric.entity';
import { SizeCurveValue } from '../../catalog/entities/size-curve-value.entity';
import { Order } from './order.entity';

@Entity('order_requested_items')
export class OrderRequestedItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.requestedItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Fabric, (fabric) => fabric.requestedItems, {
    nullable: true,
  })
  @JoinColumn({ name: 'fabric_id' })
  fabric?: Fabric | null;

  @Column({ name: 'color', type: 'varchar', length: 80, nullable: true })
  color?: string | null;

  @ManyToOne(() => SizeCurveValue, (value) => value.requestedItems, {
    nullable: false,
  })
  @JoinColumn({ name: 'size_curve_value_id' })
  sizeCurveValue!: SizeCurveValue;

  @Column({ name: 'quantity_requested', type: 'integer' })
  quantityRequested!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
