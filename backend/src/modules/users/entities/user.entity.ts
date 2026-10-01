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
import { Stage } from '../../catalog/entities/stage.entity';
import { Notification } from '../../notifications/entities/notification.entity';
import { Order } from '../../orders/entities/order.entity';
import { PartStageEvent } from '../../orders/entities/part-stage-event.entity';
import { PartSupply } from '../../orders/entities/part-supply.entity';
import { UserRole } from './user.enums';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'full_name', type: 'varchar', length: 150 })
  fullName!: string;

  @Column({ name: 'email', type: 'varchar', length: 150, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({
    name: 'role',
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.USER,
  })
  role!: UserRole;

  @ManyToOne(() => Stage, (stage) => stage.users, { nullable: true })
  @JoinColumn({ name: 'stage_id' })
  stage?: Stage | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => Order, (order) => order.createdBy)
  createdOrders!: Order[];

  @OneToMany(() => PartStageEvent, (event) => event.performedBy)
  performedEvents!: PartStageEvent[];

  @OneToMany(() => PartSupply, (partSupply) => partSupply.updatedBy)
  updatedSupplies!: PartSupply[];

  @OneToMany(() => Notification, (notification) => notification.recipientUser)
  notifications!: Notification[];
}
