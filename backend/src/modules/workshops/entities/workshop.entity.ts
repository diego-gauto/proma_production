import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SectorCode } from '../../catalog/entities/catalog.enums';
import { PartStageEvent } from '../../orders/entities/part-stage-event.entity';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({
    name: 'contact_name',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  contactName?: string | null;

  @Column({ name: 'phone', type: 'varchar', length: 50, nullable: true })
  phone?: string | null;

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({
    name: 'specialties',
    type: 'enum',
    enum: SectorCode,
    enumName: 'sector_code',
    array: true,
    default: '{}',
  })
  specialties!: SectorCode[];

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => PartStageEvent, (event) => event.workshop)
  events!: PartStageEvent[];
}
