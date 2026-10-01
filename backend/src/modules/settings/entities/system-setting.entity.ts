import { Column, Entity, UpdateDateColumn } from 'typeorm';

@Entity('system_settings')
export class SystemSetting {
  @Column({ name: 'key', type: 'varchar', length: 80, primary: true })
  key!: string;

  @Column({ name: 'value', type: 'varchar', length: 255 })
  value!: string;

  @Column({ name: 'description', type: 'varchar', length: 255, nullable: true })
  description?: string | null;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
