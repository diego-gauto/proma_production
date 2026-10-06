import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Supply } from '../../catalog/entities/supply.entity';
import { FabricRoll } from './fabric-roll.entity';

export enum StockAdjustmentReason {
  USO = 'USO',
  CORRECCION = 'CORRECCION',
  ROTURA = 'ROTURA',
  DEVOLUCION = 'DEVOLUCION',
}

@Entity('stock_adjustments')
export class StockAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => FabricRoll, (roll) => roll.adjustments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fabric_roll_id' })
  fabricRoll?: FabricRoll | null;

  @ManyToOne(() => Supply, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supply_id' })
  supply?: Supply | null;

  @Column({ name: 'quantity_delta', type: 'numeric', precision: 12, scale: 2 })
  quantityDelta!: string;

  @Column({ name: 'reason', type: 'varchar', length: 30 })
  reason!: StockAdjustmentReason;

  @Column({ name: 'note', type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
