import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { ArticleDecorationPart } from './article-decoration-part.entity';
import { ArticleSupply } from './article-supply.entity';

@Entity('articles')
export class Article {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 80 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => ArticleSupply, (supply) => supply.article, {
    cascade: ['insert', 'update'],
  })
  supplies!: ArticleSupply[];

  @OneToMany(() => ArticleDecorationPart, (part) => part.article, {
    cascade: ['insert', 'update'],
  })
  decorationParts!: ArticleDecorationPart[];

  @OneToMany(() => Order, (order) => order.article)
  orders!: Order[];
}
