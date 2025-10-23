import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from '@/controllers/health.controller';
import { HealthService } from '@/services/health.service';
import { User } from '@/entities/user.entity';
import { Message } from '@/entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Message])],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
