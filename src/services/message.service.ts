import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, User } from '../entities';
import { CreateMessageDto, UpdateMessageDto } from '../dto';

@Injectable()
export class MessageService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Create a new message or reply
   * Supports both top-level messages and replies to existing messages
   */
  async createMessage(createMessageDto: CreateMessageDto): Promise<Message> {
    const { authorId, parentMessageId, content } = createMessageDto;

    // Verify that the author exists
    const author = await this.userRepository.findOne({ where: { id: authorId } });
    if (!author) {
      throw new NotFoundException('Author not found');
    }

    // If this is a reply, verify the parent message exists and is not deleted
    if (parentMessageId) {
      const parentMessage = await this.messageRepository.findOne({
        where: { id: parentMessageId, isDeleted: false },
      });
      if (!parentMessage) {
        throw new NotFoundException('Parent message not found or has been deleted');
      }
    }

    const message = this.messageRepository.create({
      content,
      authorId,
      parentMessageId,
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
  ): Promise<{ messages: Message[]; total: number; page: number; limit: number }> {
    const whereClause: any = { isDeleted: false };
    
    // Filter by parent message if specified (get replies)
    if (parentMessageId !== undefined) {
      whereClause.parentMessageId = parentMessageId;
    } else {
      // Only get top-level messages (not replies)
      whereClause.parentMessageId = null;
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where: whereClause,
      relations: ['author'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Add reply count to each message
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

    // Add reply count
    message.replyCount = await this.messageRepository.count({
      where: { parentMessageId: message.id, isDeleted: false },
    });

    return message;
  }

  /**
   * Get replies for a specific message
   */
  async getReplies(messageId: string, page: number = 1, limit: number = 10): Promise<{
    replies: Message[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Verify the parent message exists
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

    // Check if the user is the author
    if (message.authorId !== authorId) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Update the message
    message.content = updateMessageDto.content;
    message.isEdited = true;

    const updatedMessage = await this.messageRepository.save(message);

    // Add reply count
    updatedMessage.replyCount = await this.messageRepository.count({
      where: { parentMessageId: updatedMessage.id, isDeleted: false },
    });

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

    // Check if the user is the author
    if (message.authorId !== authorId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Soft delete the message
    message.isDeleted = true;
    message.deletedAt = new Date();

    await this.messageRepository.save(message);
  }

  /**
   * Get conversation thread starting from a message
   * Returns the message and all its replies in a hierarchical structure
   */
  async getConversationThread(messageId: string): Promise<Message> {
    const message = await this.getMessageById(messageId);
    
    // Get all replies recursively
    const replies = await this.messageRepository.find({
      where: { parentMessageId: messageId, isDeleted: false },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    // Add reply counts to replies
    for (const reply of replies) {
      reply.replyCount = await this.messageRepository.count({
        where: { parentMessageId: reply.id, isDeleted: false },
      });
    }

    message.replies = replies;
    return message;
  }
}