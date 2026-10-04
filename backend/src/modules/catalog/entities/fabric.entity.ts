import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderPart } from '../../orders/entities/order-part.entity';
import { OrderRequestedItem } from '../../orders/entities/order-requested-item.entity';
import { FabricFormatType, FabricWeaveType } from './catalog.enums';

@Entity('fabrics')
export class Fabric {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 80 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 150 })
  name!: string;

  @Column({ name: 'color', type: 'varchar', length: 80, nullable: true })
  color?: string | null;

  @Column({ name: 'weight_oz', type: 'numeric', precision: 6, scale: 2, nullable: true })
  weightOz?: string | null;

  @Column({ name: 'supplier', type: 'varchar', length: 150, nullable: true })
  supplier?: string | null;

  @Column({ name: 'weave_type', type: 'enum', enum: FabricWeaveType, enumName: 'fabric_weave_type' })
  weaveType!: FabricWeaveType;

  @Column({ name: 'format_type', type: 'enum', enum: FabricFormatType, enumName: 'fabric_format_type' })
  formatType!: FabricFormatType;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @OneToMany(() => OrderRequestedItem, (item) => item.fabric)
  requestedItems!: OrderRequestedItem[];

  @OneToMany(() => OrderPart, (part) => part.fabric)
  parts!: OrderPart[];
}
