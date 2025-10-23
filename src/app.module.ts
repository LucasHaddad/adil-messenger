import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}