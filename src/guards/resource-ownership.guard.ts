import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/entities/user.entity';
import { Message } from '@/entities/message.entity';
import { SecurityLoggerService } from '@/services/security-logger.service';

export const RESOURCE_OWNER = 'resourceOwner';
export const ResourceOwner = (resourceType: 'message' | 'user') => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      RESOURCE_OWNER,
      resourceType,
      descriptor?.value || target,
    );
  };
};

@Injectable()
export class ResourceOwnershipGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private securityLogger: SecurityLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.get<string>(
      RESOURCE_OWNER,
      context.getHandler(),
    );

    if (!resourceType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const params = request.params;

    if (!user) {
      this.securityLogger.logUnauthorizedAccess(
        `${resourceType} resource`,
        undefined,
        request.ip,
      );
      throw new ForbiddenException('Authentication required');
    }

    try {
      switch (resourceType) {
        case 'message':
          return await this.checkMessageOwnership(
            user.id,
            params.id,
            request.ip,
          );
        case 'user':
          return await this.checkUserOwnership(user.id, params.id, request.ip);
        default:
          return true;
      }
    } catch (error) {
      this.securityLogger.logUnauthorizedAccess(
        `${resourceType} resource`,
        user.id,
        request.ip,
      );
      throw new ForbiddenException('Access denied');
    }
  }

  private async checkMessageOwnership(
    userId: string,
    messageId: string,
    ip: string,
  ): Promise<boolean> {
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['author'],
    });

    if (!message) {
      throw new ForbiddenException('Message not found');
    }

    if (message.author.id !== userId) {
      this.securityLogger.logUnauthorizedAccess('message', userId, ip);
      throw new ForbiddenException('You can only modify your own messages');
    }

    return true;
  }

  private async checkUserOwnership(
    userId: string,
    targetUserId: string,
    ip: string,
  ): Promise<boolean> {
    if (userId !== targetUserId) {
      this.securityLogger.logUnauthorizedAccess('user profile', userId, ip);
      throw new ForbiddenException('You can only modify your own profile');
    }

    return true;
  }
}
