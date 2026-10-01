import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ArticleFabric } from '../../articles/entities/article-fabric.entity';
import { OrderPart } from '../../orders/entities/order-part.entity';
import { OrderRequestedItem } from '../../orders/entities/order-requested-item.entity';

@Entity('fabrics')
export class Fabric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'color', type: 'varchar', length: 80, nullable: true })
  color?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => ArticleFabric, (articleFabric) => articleFabric.fabric)
  articleFabrics!: ArticleFabric[];

  @OneToMany(() => OrderRequestedItem, (item) => item.fabric)
  requestedItems!: OrderRequestedItem[];

  @OneToMany(() => OrderPart, (part) => part.fabric)
  parts!: OrderPart[];
}
