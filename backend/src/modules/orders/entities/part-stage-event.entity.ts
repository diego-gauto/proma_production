import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StageExecutionType } from '../../catalog/entities/catalog.enums';
import { Stage } from '../../catalog/entities/stage.entity';
import { User } from '../../users/entities/user.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';
import { OrderPart } from './order-part.entity';

@Entity('part_stage_events')
export class PartStageEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => OrderPart, (part) => part.events, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_part_id' })
  orderPart!: OrderPart;

  @ManyToOne(() => Stage, (stage) => stage.events, { nullable: false })
  @JoinColumn({ name: 'stage_id' })
  stage!: Stage;

  @Column({
    name: 'execution_type',
    type: 'enum',
    enum: StageExecutionType,
    enumName: 'stage_execution_type',
  })
  executionType!: StageExecutionType;

  @ManyToOne(() => Workshop, (workshop) => workshop.events, { nullable: true })
  @JoinColumn({ name: 'workshop_id' })
  workshop?: Workshop | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt?: Date | null;

  @Column({ name: 'estimated_finish_at', type: 'timestamptz', nullable: true })
  estimatedFinishAt?: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt?: Date | null;

  @Column({
    name: 'duration_days',
    type: 'numeric',
    precision: 6,
    scale: 2,
    generatedType: 'STORED',
    asExpression:
      'CASE WHEN finished_at IS NOT NULL AND started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (finished_at - started_at)) / 86400.0 ELSE NULL::numeric END',
    insert: false,
    update: false,
    nullable: true,
  })
  durationDays?: string | null;

  @Column({ name: 'overdue_notified', type: 'boolean', default: false })
  overdueNotified!: boolean;

  @Column({ name: 'includes_atraque', type: 'boolean', nullable: true })
  includesAtraque?: boolean | null;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @ManyToOne(() => User, (user) => user.performedEvents, { nullable: false })
  @JoinColumn({ name: 'performed_by' })
  performedBy!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
