import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderPart } from './order-part.entity';
import { PartDecorationLoadItem } from './part-decoration-load-item.entity';
import { PartStageEvent } from './part-stage-event.entity';

@Entity('part_decoration_loads')
export class PartDecorationLoad {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderPart, (part) => part.decorationLoads, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_part_id' })
  orderPart!: OrderPart;

  @ManyToOne(() => PartStageEvent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'stage_event_id' })
  stageEvent!: PartStageEvent;

  // Snapshot: article edits can replace decoration IDs; history keeps the physical part name.
  @Column({ name: 'garment_part', type: 'varchar', length: 100, nullable: true })
  garmentPart!: string | null;

  @Column({ name: 'lot_code', type: 'varchar', length: 100, nullable: true })
  lotCode!: string | null;

  @Column({ name: 'work_date', type: 'date' })
  workDate!: string;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => PartDecorationLoadItem, (item) => item.decorationLoad, { cascade: ['insert'] })
  items!: PartDecorationLoadItem[];
}
