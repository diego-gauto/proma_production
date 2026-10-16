import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { SizeCurveValue } from '../../catalog/entities/size-curve-value.entity';
import { PartDecorationLoad } from './part-decoration-load.entity';

@Entity('part_decoration_load_items')
export class PartDecorationLoadItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => PartDecorationLoad, (load) => load.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'decoration_load_id' })
  decorationLoad!: PartDecorationLoad;

  @ManyToOne(() => SizeCurveValue, { nullable: false })
  @JoinColumn({ name: 'size_curve_value_id' })
  sizeCurveValue!: SizeCurveValue;

  @Column({ name: 'quantity', type: 'integer' })
  quantity!: number;
}
