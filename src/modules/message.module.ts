import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageController } from '@/controllers/message.controller';
import { MessageService } from '@/services/message.service';
import { UserService } from '@/services/user.service';
import { FileModule } from '@/modules/file.module';
import { Message, User } from '@/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, User]),
    FileModule,
  ],
  controllers: [MessageController],
  providers: [
    MessageService,
    UserService,
    {
      provide: 'ChatGateway',
      useFactory: () => null, // Will be properly injected when WebSocketModule is imported
    },
  ],
  exports: [MessageService, UserService],
})
export class MessageModule {}