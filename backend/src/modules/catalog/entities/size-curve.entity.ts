import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SizeSequenceType } from './catalog.enums';
import { SizeCurveValue } from './size-curve-value.entity';

@Entity('size_curves')
export class SizeCurve {
  @PrimaryGeneratedColumn('increment', { type: 'integer' })
  id!: number;

  @Column({ name: 'name', type: 'varchar', length: 100 })
  name!: string;

  @Column({
    name: 'sequence_type',
    type: 'enum',
    enum: SizeSequenceType,
    enumName: 'size_sequence_type',
  })
  sequenceType!: SizeSequenceType;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => SizeCurveValue, (value) => value.sizeCurve, {
    cascade: ['insert', 'update'],
  })
  values!: SizeCurveValue[];
}
