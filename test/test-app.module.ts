import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../src/modules/auth.module';
import { MessageModule } from '../src/modules/message.module';
import { User } from '../src/entities/user.entity';
import { Message } from '../src/entities/message.entity';
import { Reaction } from '../src/entities/reaction.entity';
import { HealthModule } from '../src/modules/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.test',
    }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Message, Reaction],
      synchronize: true,
      logging: false,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    MessageModule,
    HealthModule,
  ],
})
export class TestAppModule {}
