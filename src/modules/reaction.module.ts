import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReactionController } from '@/controllers/reaction.controller';
import { ReactionService } from '@/services/reaction.service';
import { Reaction, Message, User } from '@/entities';

@Module({
  imports: [TypeOrmModule.forFeature([Reaction, Message, User])],
  controllers: [ReactionController],
  providers: [ReactionService],
  exports: [ReactionService],
})
export class ReactionModule {}