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

  @Column({ name: 'placement', type: 'varchar', length: 120, nullable: true })
  placement!: string | null;

  @Column({ name: 'decoration_code', type: 'varchar', length: 80, nullable: true })
  decorationCode!: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'notes', type: 'varchar', length: 500, nullable: true })
  notes!: string | null;
}
