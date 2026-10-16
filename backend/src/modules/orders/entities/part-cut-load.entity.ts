import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { OrderFabricUseType } from '../../catalog/entities/catalog.enums';
import { FabricRoll } from '../../inventory/entities/fabric-roll.entity';
import { User } from '../../users/entities/user.entity';
import { OrderPart } from './order-part.entity';
import { PartStageEvent } from './part-stage-event.entity';
import { PartCutLoadItem } from './part-cut-load-item.entity';

@Entity('part_cut_loads')
export class PartCutLoad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderPart, (part) => part.cutLoads, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_part_id' })
  orderPart!: OrderPart;

  @ManyToOne(() => PartStageEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_event_id' })
  stageEvent!: PartStageEvent;

  @Column({ name: 'lot_code', type: 'varchar', length: 80 })
  lotCode!: string;

  @ManyToOne(() => FabricRoll, { nullable: true })
  @JoinColumn({ name: 'fabric_roll_id' })
  fabricRoll?: FabricRoll | null;

  @Column({ name: 'fabric_use_type', type: 'enum', enum: OrderFabricUseType, enumName: 'order_fabric_use_type', default: OrderFabricUseType.PRIMARIA })
  fabricUseType!: OrderFabricUseType;

  @Column({ name: 'fabric_quantity', type: 'numeric', precision: 12, scale: 2, nullable: true })
  fabricQuantity?: string | null;

  @Column({ name: 'fabric_unit', type: 'varchar', length: 12, nullable: true })
  fabricUnit?: string | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => PartCutLoadItem, (item) => item.cutLoad, { cascade: ['insert'] })
  items!: PartCutLoadItem[];
}
