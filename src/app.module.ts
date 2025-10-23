import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '@/database/database.module';
import { MessageModule } from '@/modules/message.module';
import { UserModule } from '@/modules/user.module';
import { AuthModule } from '@/auth/auth.module';
import { WebSocketModule } from '@/modules/websocket.module';
import { FileModule } from '@/modules/file.module';
import { ReactionModule } from '@/modules/reaction.module';
import { SearchModule } from '@/modules/search.module';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { CustomThrottlerGuard } from '@/guards/custom-throttler.guard';
import { RateLimitHeadersInterceptor } from '@/interceptors/rate-limit-headers.interceptor';
import { SecurityLoggerService } from '@/services/security-logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60 * 1000,
        limit: 5,
      },
      {
        name: 'upload',
        ttl: 60 * 1000,
        limit: 10,
      },
      {
        name: 'search',
        ttl: 60 * 1000,
        limit: 30,
      },
      {
        name: 'read',
        ttl: 60 * 1000,
        limit: 100,
      },
      {
        name: 'write',
        ttl: 60 * 1000,
        limit: 50,
      },
      {
        name: 'default',
        ttl: 60 * 1000,
        limit: 20,
      },
    ]),
    DatabaseModule,
    AuthModule,
    MessageModule,
    UserModule,
    WebSocketModule,
    FileModule,
    ReactionModule,
    SearchModule,
  ],
  providers: [
    SecurityLoggerService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RateLimitHeadersInterceptor,
    },
  ],
})
export class AppModule {}
