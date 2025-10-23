import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, Message, Reaction } from '@/entities';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: +configService.get<number>('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        entities: [User, Message, Reaction],
        migrations: [
          process.env.NODE_ENV === 'production'
            ? 'dist/database/migrations/*.js'
            : 'src/database/migrations/*.ts',
        ],
        synchronize: false, // Always false in production, use migrations instead
        migrationsRun: configService.get('NODE_ENV') === 'production',
        logging: configService.get('DB_LOGGING') === 'true',
        ssl:
          configService.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : false,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
