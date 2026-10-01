import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { OrderPart } from '../../orders/entities/order-part.entity';
import { OrderRequestedItem } from '../../orders/entities/order-requested-item.entity';
import { SizeCurve } from './size-curve.entity';

@Entity('size_curve_values')
export class SizeCurveValue {
  @PrimaryGeneratedColumn('increment', { type: 'integer' })
  id!: number;

  @ManyToOne(() => SizeCurve, (curve) => curve.values, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'size_curve_id' })
  sizeCurve!: SizeCurve;

  @Column({ name: 'label', type: 'varchar', length: 20 })
  label!: string;

  @Column({ name: 'sort_order', type: 'smallint' })
  sortOrder!: number;

  @OneToMany(() => OrderRequestedItem, (item) => item.sizeCurveValue)
  requestedItems!: OrderRequestedItem[];

  @OneToMany(() => OrderPart, (part) => part.sizeCurveValue)
  parts!: OrderPart[];
}
