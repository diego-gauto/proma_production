import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import databaseConfig from './config/database.config';
import { validate } from './config/env.validation';
import { ArticlesModule } from './modules/articles/articles.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ClientsModule } from './modules/clients/clients.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { UsersModule } from './modules/users/users.module';
import { WorkshopsModule } from './modules/workshops/workshops.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      load: [databaseConfig],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('database'),
    }),
    AuthModule,
    ClientsModule,
    WorkshopsModule,
    CatalogModule,
    ArticlesModule,
    UsersModule,
    OrdersModule,
    InventoryModule,
    NotificationsModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
