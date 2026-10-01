import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Stage } from '../../catalog/entities/stage.entity';
import { User } from '../../users/entities/user.entity';
import { OrderPart } from '../../orders/entities/order-part.entity';
import { Order } from '../../orders/entities/order.entity';
import { NotificationType } from './notification.enums';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    name: 'type',
    type: 'enum',
    enum: NotificationType,
    enumName: 'notification_type',
  })
  type!: NotificationType;

  @ManyToOne(() => Order, (order) => order.notifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @ManyToOne(() => OrderPart, (part) => part.notifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_part_id' })
  orderPart?: OrderPart | null;

  @ManyToOne(() => Stage, (stage) => stage.notifications, { nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stage?: Stage | null;

  @Column({ name: 'message', type: 'varchar', length: 500 })
  message!: string;

  @ManyToOne(() => User, (user) => user.notifications, { nullable: false })
  @JoinColumn({ name: 'recipient_user_id' })
  recipientUser!: User;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
