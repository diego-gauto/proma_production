import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Notification } from '../../notifications/entities/notification.entity';
import { Order } from '../../orders/entities/order.entity';
import { PartStageEvent } from '../../orders/entities/part-stage-event.entity';
import { PartSupply } from '../../orders/entities/part-supply.entity';
import { UserRole } from './user.enums';
import { UserPermission } from './user-permission.entity';

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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => UserPermission, (permission) => permission.user, {
    cascade: ['insert', 'update'],
  })
  permissions!: UserPermission[];

  @OneToMany(() => Order, (order) => order.createdBy)
  createdOrders!: Order[];

  @OneToMany(() => PartStageEvent, (event) => event.performedBy)
  performedEvents!: PartStageEvent[];

  @OneToMany(() => PartSupply, (partSupply) => partSupply.updatedBy)
  updatedSupplies!: PartSupply[];

  @OneToMany(() => Notification, (notification) => notification.recipientUser)
  notifications!: Notification[];
}
