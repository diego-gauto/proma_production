import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { Client } from './entities/client.entity';
import { ClientContact } from './entities/client-contact.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, ClientContact])],
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
