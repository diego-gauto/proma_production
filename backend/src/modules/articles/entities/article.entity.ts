import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SizeCurve } from '../../catalog/entities/size-curve.entity';
import { Order } from '../../orders/entities/order.entity';
import { ArticleDecorationPart } from './article-decoration-part.entity';
import { ArticleFabric } from './article-fabric.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @ManyToOne(() => SizeCurve, (sizeCurve) => sizeCurve.articles, {
    nullable: true,
  })
  @JoinColumn({ name: 'size_curve_id' })
  sizeCurve?: SizeCurve | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ArticleFabric, (fabric) => fabric.article, {
    cascade: ['insert', 'update'],
  })
  fabrics!: ArticleFabric[];

  @OneToMany(() => ArticleDecorationPart, (part) => part.article, {
    cascade: ['insert', 'update'],
  })
  decorationParts!: ArticleDecorationPart[];

  @OneToMany(() => Order, (order) => order.article)
  orders!: Order[];
}
