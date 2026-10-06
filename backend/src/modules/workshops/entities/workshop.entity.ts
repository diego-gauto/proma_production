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
import { WorkshopContact } from './workshop-contact.entity';

@Entity('workshops')
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 180 })
  name!: string;

  @Column({ name: 'address', type: 'varchar', length: 255, nullable: true })
  address?: string | null;

  @Column({ name: 'locality', type: 'varchar', length: 120, nullable: true })
  locality?: string | null;

  @Column({ name: 'district', type: 'varchar', length: 120, nullable: true })
  district?: string | null;

  @Column({ name: 'province', type: 'varchar', length: 120, nullable: true })
  province?: string | null;

  @Column({
    name: 'specialties',
    type: 'enum',
    enum: SectorCode,
    enumName: 'sector_code',
    array: true,
    default: '{}',
  })
  specialties!: SectorCode[];

  @Column({ name: 'specialty_detail', type: 'varchar', length: 255, nullable: true })
  specialtyDetail?: string | null;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => WorkshopContact, (contact) => contact.workshop, {
    cascade: ['insert', 'update'],
  })
  contacts!: WorkshopContact[];

  @OneToMany(() => PartStageEvent, (event) => event.workshop)
  events!: PartStageEvent[];
}
