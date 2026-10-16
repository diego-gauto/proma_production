import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SizeCurveValue } from '../../catalog/entities/size-curve-value.entity';
import { PartCutLoad } from './part-cut-load.entity';

@Entity('part_cut_load_items')
export class PartCutLoadItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PartCutLoad, (load) => load.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cut_load_id' })
  cutLoad!: PartCutLoad;

  @ManyToOne(() => SizeCurveValue, { nullable: false })
  @JoinColumn({ name: 'size_curve_value_id' })
  sizeCurveValue!: SizeCurveValue;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;
}
