import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supply } from '../../catalog/entities/supply.entity';
import { Article } from './article.entity';

@Entity('article_supplies')
export class ArticleSupply {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Article, (article) => article.supplies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  @ManyToOne(() => Supply, (supply) => supply.articleSupplies)
  @JoinColumn({ name: 'supply_id' })
  supply!: Supply;

  @Column({ name: 'quantity', type: 'numeric', precision: 10, scale: 2, nullable: true })
  quantity?: string | null;

  @Column({ name: 'note', type: 'varchar', length: 255, nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
