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

  @Column({ name: 'email', type: 'varchar', length: 150, nullable: true })
  email?: string | null;

  @Column({ name: 'fixed_phone', type: 'varchar', length: 50, nullable: true })
  fixedPhone?: string | null;

  @Column({ name: 'street', type: 'varchar', length: 180, nullable: true })
  street?: string | null;

  @Column({ name: 'street_number', type: 'varchar', length: 30, nullable: true })
  streetNumber?: string | null;

  @Column({ name: 'floor_apartment', type: 'varchar', length: 60, nullable: true })
  floorApartment?: string | null;

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
