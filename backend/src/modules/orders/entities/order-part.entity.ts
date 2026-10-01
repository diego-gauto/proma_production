import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Fabric } from '../../catalog/entities/fabric.entity';
import { SizeCurveValue } from '../../catalog/entities/size-curve-value.entity';
import { Stage } from '../../catalog/entities/stage.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { PartSplitMode, PartStatus } from './order.enums';
import { Order } from './order.entity';
import { PartStageEvent } from './part-stage-event.entity';
import { PartSupply } from './part-supply.entity';

@Entity('order_parts')
export class OrderPart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Order, (order) => order.parts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => OrderPart, (part) => part.children, { nullable: true })
  @JoinColumn({ name: 'parent_part_id' })
  parentPart?: OrderPart | null;

  @OneToMany(() => OrderPart, (part) => part.parentPart)
  children!: OrderPart[];

  @Column({ name: 'part_code', type: 'varchar', length: 20 })
  partCode!: string;

  @ManyToOne(() => Fabric, (fabric) => fabric.parts, { nullable: true })
  @JoinColumn({ name: 'fabric_id' })
  fabric?: Fabric | null;

  @Column({ name: 'color', type: 'varchar', length: 80, nullable: true })
  color?: string | null;

  @ManyToOne(() => SizeCurveValue, (value) => value.parts, { nullable: true })
  @JoinColumn({ name: 'size_curve_value_id' })
  sizeCurveValue?: SizeCurveValue | null;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;

  @Column({
    name: 'status',
    type: 'enum',
    enum: PartStatus,
    enumName: 'part_status',
    default: PartStatus.PENDIENTE,
  })
  status!: PartStatus;

  @Column({ name: 'is_split', type: 'boolean', default: false })
  isSplit!: boolean;

  @Column({
    name: 'split_mode',
    type: 'enum',
    enum: PartSplitMode,
    enumName: 'part_split_mode',
    nullable: true,
  })
  splitMode?: PartSplitMode | null;

  @Column({ name: 'is_component_branch', type: 'boolean', default: false })
  isComponentBranch!: boolean;

  @ManyToOne(() => OrderPart, { nullable: true })
  @JoinColumn({ name: 'recombined_into_part_id' })
  recombinedIntoPart?: OrderPart | null;

  @ManyToOne(() => Stage, (stage) => stage.currentParts, { nullable: true })
  @JoinColumn({ name: 'current_stage_id' })
  currentStage?: Stage | null;

  @Column({
    name: 'split_reason',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  splitReason?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PartStageEvent, (event) => event.orderPart)
  events!: PartStageEvent[];

  @OneToMany(() => PartSupply, (supply) => supply.orderPart)
  supplies!: PartSupply[];

  @OneToMany(() => Notification, (notification) => notification.orderPart)
  notifications!: Notification[];
}
