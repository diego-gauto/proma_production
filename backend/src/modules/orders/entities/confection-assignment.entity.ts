import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workshop } from '../../workshops/entities/workshop.entity';
import { OrderPart } from './order-part.entity';
import { ConfectionAssignmentStatus } from './confection.enums';
import { ConfectionDelivery } from './confection-delivery.entity';

@Entity('confection_assignments')
export class ConfectionAssignment {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @ManyToOne(() => OrderPart, { nullable: false, onDelete: 'CASCADE' }) @JoinColumn({ name: 'order_part_id' }) orderPart!: OrderPart;
  @ManyToOne(() => Workshop, { nullable: false }) @JoinColumn({ name: 'workshop_id' }) workshop!: Workshop;
  @Column({ name: 'quantity', type: 'integer' }) quantity!: number;
  @Column({ name: 'delivered_quantity', type: 'integer', default: 0 }) deliveredQuantity!: number;
  @Column({ type: 'enum', enum: ConfectionAssignmentStatus, enumName: 'confection_assignment_status', default: ConfectionAssignmentStatus.ASIGNADO }) status!: ConfectionAssignmentStatus;
  @ManyToOne(() => User, { nullable: false }) @JoinColumn({ name: 'assigned_by' }) assignedBy!: User;
  @Column({ name: 'assigned_at', type: 'timestamptz' }) assignedAt!: Date;
  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true }) sentAt?: Date | null;
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true }) finishedAt?: Date | null;
  @Column({ type: 'text', nullable: true }) note?: string | null;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date;
  @OneToMany(() => ConfectionDelivery, (delivery) => delivery.assignment) deliveries!: ConfectionDelivery[];
}
