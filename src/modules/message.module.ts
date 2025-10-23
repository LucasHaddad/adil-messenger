import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageController } from '@/controllers/message.controller';
import { MessageService } from '@/services/message.service';
import { UserService } from '@/services/user.service';
import { Message, User } from '@/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Message, User])],
  controllers: [MessageController],
  providers: [MessageService, UserService],
  exports: [MessageService, UserService],
})
export class MessageModule {}