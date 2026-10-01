import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Article } from './article.entity';

@Entity('article_decoration_parts')
export class ArticleDecorationPart {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Article, (article) => article.decorationParts, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  @Column({ name: 'garment_part', type: 'varchar', length: 100 })
  garmentPart!: string;

  @Column({ name: 'decoration_type', type: 'varchar', length: 30 })
  decorationType!: string;
}
