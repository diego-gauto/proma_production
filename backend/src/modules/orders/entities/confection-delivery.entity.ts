import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ConfectionAssignment } from './confection-assignment.entity';

@Entity('confection_deliveries')
export class ConfectionDelivery {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => ConfectionAssignment, (assignment) => assignment.deliveries, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'assignment_id' }) assignment!: ConfectionAssignment;
  @Column({ type: 'integer' }) quantity!: number;
  @Column({ name: 'delivered_at', type: 'timestamptz' }) deliveredAt!: Date;
  @Column({ type: 'text', nullable: true }) note?: string | null;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: 'registered_by' }) registeredBy!: User;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
