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
import { Article } from '../../articles/entities/article.entity';
import { Client } from '../../clients/entities/client.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { User } from '../../users/entities/user.entity';
import { OrderStatus } from './order.enums';
import { OrderPart } from './order-part.entity';
import { OrderRequestedItem } from './order-requested-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'internal_code', type: 'varchar', length: 30, unique: true })
  internalCode!: string;

  @Column({ name: 'external_code', type: 'varchar', length: 50 })
  externalCode!: string;

  @ManyToOne(() => Client, (client) => client.orders, { nullable: false })
  @JoinColumn({ name: 'client_id' })
  client!: Client;

  @ManyToOne(() => Article, (article) => article.orders, { nullable: false })
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  @Column({
    name: 'status',
    type: 'enum',
    enum: OrderStatus,
    enumName: 'order_status',
    default: OrderStatus.ACTIVA,
  })
  status!: OrderStatus;

  @Column({ name: 'repair_note', type: 'text', nullable: true })
  repairNote?: string | null;

  @ManyToOne(() => User, (user) => user.createdOrders, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdBy!: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ name: 'finalized_at', type: 'timestamptz', nullable: true })
  finalizedAt?: Date | null;

  @OneToMany(() => OrderRequestedItem, (item) => item.order, {
    cascade: ['insert', 'update'],
  })
  requestedItems!: OrderRequestedItem[];

  @OneToMany(() => OrderPart, (part) => part.order, {
    cascade: ['insert', 'update'],
  })
  parts!: OrderPart[];

  @OneToMany(() => Notification, (notification) => notification.order)
  notifications!: Notification[];
}
