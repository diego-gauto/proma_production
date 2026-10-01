import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PartSupply } from '../../orders/entities/part-supply.entity';
import { SupplyCategory } from './catalog.enums';

@Entity('supplies')
export class Supply {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({
    name: 'category',
    type: 'enum',
    enum: SupplyCategory,
    enumName: 'supply_category',
  })
  category!: SupplyCategory;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => PartSupply, (partSupply) => partSupply.supply)
  partSupplies!: PartSupply[];
}
