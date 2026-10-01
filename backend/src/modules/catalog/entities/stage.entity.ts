import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderPart } from '../../orders/entities/order-part.entity';
import { PartStageEvent } from '../../orders/entities/part-stage-event.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { SectorCode, StageExecutionType } from './catalog.enums';

@Entity('stages')
export class Stage {
  @PrimaryGeneratedColumn('increment', { type: 'smallint' })
  id!: number;

  @Column({
    name: 'code',
    type: 'enum',
    enum: SectorCode,
    enumName: 'sector_code',
    unique: true,
  })
  code!: SectorCode;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'sequence_order', type: 'smallint' })
  sequenceOrder!: number;

  @Column({ name: 'is_optional', type: 'boolean', default: false })
  isOptional!: boolean;

  @Column({
    name: 'execution_type',
    type: 'enum',
    enum: StageExecutionType,
    enumName: 'stage_execution_type',
    default: StageExecutionType.INTERNO,
  })
  executionType!: StageExecutionType;

  @Column({
    name: 'excluded_from_bottleneck_alerts',
    type: 'boolean',
    default: false,
  })
  excludedFromBottleneckAlerts!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => User, (user) => user.stage)
  users!: User[];

  @OneToMany(() => OrderPart, (part) => part.currentStage)
  currentParts!: OrderPart[];

  @OneToMany(() => PartStageEvent, (event) => event.stage)
  events!: PartStageEvent[];

  @OneToMany(() => Notification, (notification) => notification.stage)
  notifications!: Notification[];
}
