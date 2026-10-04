import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ArticleSupply } from '../../articles/entities/article-supply.entity';
import { PartSupply } from '../../orders/entities/part-supply.entity';
import { SupplyCategory } from './catalog.enums';

@Entity('supplies')
export class Supply {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 80 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'color', type: 'varchar', length: 80, nullable: true })
  color?: string | null;

  @Column({ name: 'supplier', type: 'varchar', length: 150, nullable: true })
  supplier?: string | null;

  @Column({ name: 'category', type: 'enum', enum: SupplyCategory, enumName: 'supply_category' })
  category!: SupplyCategory;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ArticleSupply, (articleSupply) => articleSupply.supply)
  articleSupplies!: ArticleSupply[];

  @OneToMany(() => PartSupply, (partSupply) => partSupply.supply)
  partSupplies!: PartSupply[];
}
