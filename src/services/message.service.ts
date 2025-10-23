import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, User } from '@/entities';
import { CreateMessageDto, UpdateMessageDto } from '@/dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(forwardRef(() => 'ChatGateway'))
    private chatGateway?: any,
  ) {}

  /**
   * Create a new message or reply
   * Supports both top-level messages and replies to existing messages
   */
  async createMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    const { authorId, parentMessageId, content } = createMessageDto;

    const author = await this.userRepository.findOne({
      where: { id: authorId },
    });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    if (parentMessageId) {
      const parentMessage = await this.messageRepository.findOne({
        where: { id: parentMessageId, isDeleted: false },
      });
      if (!parentMessage) {
        throw new NotFoundException(
          'Parent message not found or has been deleted',
        );
      }
    }

    const message = this.messageRepository.create({
      content,
      authorId,
      parentMessageId,
      attachmentUrl: createMessageDto.attachmentUrl,
      attachmentName: createMessageDto.attachmentName,
      attachmentType: createMessageDto.attachmentType,
      attachmentSize: createMessageDto.attachmentSize,
    });

    return this.messageRepository.save(message);
  }

  /**
   * Get all messages with pagination and filtering
   * Excludes deleted messages and includes reply counts
   */
  async getMessages(
    page: number = 1,
    limit: number = 20,
    parentMessageId?: string,
  ): Promise<{
    messages: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    const whereClause: any = { isDeleted: false };

    if (parentMessageId !== undefined) {
      whereClause.parentMessageId = parentMessageId;
    } else {
      whereClause.parentMessageId = null;
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where: whereClause,
      relations: ['author'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    for (const message of messages) {
      message.replyCount = await this.messageRepository.count({
        where: { parentMessageId: message.id, isDeleted: false },
      });
    }

    return {
      messages,
      total,
      page,
      limit,
    };
  }

  /**
   * Get a specific message by ID
   */
  async getMessageById(id: string): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['author'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    message.replyCount = await this.messageRepository.count({
      where: { parentMessageId: message.id, isDeleted: false },
    });

    return message;
  }

  /**
   * Get replies for a specific message
   */
  async getReplies(
    messageId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    replies: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    const parentMessage = await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
    });

    if (!parentMessage) {
      throw new NotFoundException('Parent message not found');
    }

    const result = await this.getMessages(page, limit, messageId);
    return {
      replies: result.messages,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  /**
   * Update a message
   * Only the author can edit their own messages
   */
  async updateMessage(
    id: string,
    updateMessageDto: UpdateMessageDto,
    authorId: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['author'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    message.content = updateMessageDto.content;
    message.isEdited = true;

    const updatedMessage = await this.messageRepository.save(message);

    updatedMessage.replyCount = await this.messageRepository.count({
      where: { parentMessageId: updatedMessage.id, isDeleted: false },
    });

    if (this.chatGateway) {
      this.chatGateway.broadcastMessageUpdate(
        updatedMessage.id,
        updatedMessage.content,
        updatedMessage.authorId,
      );
    }

    return updatedMessage;
  }

  /**
   * Soft delete a message
   * Only the author can delete their own messages
   * Cascade deletion to replies is optional - here we keep replies but mark parent as deleted
   */
  async deleteMessage(id: string, authorId: string): Promise<void> {
    const message = await this.messageRepository.findOne({
      where: { id, isDeleted: false },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    message.isDeleted = true;
    message.deletedAt = new Date();

    await this.messageRepository.save(message);

    if (this.chatGateway) {
      this.chatGateway.broadcastMessageDelete(message.id, message.authorId);
    }
  }

  /**
   * Get conversation thread starting from a message
   * Returns the message and all its replies in a hierarchical structure
   */
  async getConversationThread(messageId: string): Promise<Message> {
    const message = await this.getMessageById(messageId);

    const replies = await this.messageRepository.find({
      where: { parentMessageId: messageId, isDeleted: false },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    for (const reply of replies) {
      reply.replyCount = await this.messageRepository.count({
        where: { parentMessageId: reply.id, isDeleted: false },
      });
    }

    message.replies = replies;
    return message;
  }
}
