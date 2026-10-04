import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SectorCode } from '../../catalog/entities/catalog.enums';
import { PermissionAction } from './user.enums';
import { User } from './user.entity';

@Entity('user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, (user) => user.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'sector_code', type: 'enum', enum: SectorCode, enumName: 'sector_code', nullable: true })
  sectorCode!: SectorCode | null;

  @Column({ name: 'action', type: 'enum', enum: PermissionAction, enumName: 'permission_action' })
  action!: PermissionAction;

  @Column({ name: 'is_allowed', type: 'boolean', default: true })
  isAllowed!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
