import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Fabric } from '../../catalog/entities/fabric.entity';
import { Article } from './article.entity';

@Entity('article_fabrics')
export class ArticleFabric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Article, (article) => article.fabrics, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'article_id' })
  article!: Article;

  @ManyToOne(() => Fabric, (fabric) => fabric.articleFabrics, {
    nullable: false,
  })
  @JoinColumn({ name: 'fabric_id' })
  fabric!: Fabric;

  @Column({ name: 'role', type: 'varchar', length: 30, default: 'PRINCIPAL' })
  role!: string;

  @Column({
    name: 'garment_part',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  garmentPart?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
