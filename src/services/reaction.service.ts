import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reaction, ReactionType, Message, User } from '@/entities';
import { CreateReactionDto } from '@/dto/create-reaction.dto';
import { ReactionCountDto, MessageReactionsDto } from '@/dto/reaction-response.dto';

@Injectable()
export class ReactionService {
  constructor(
    @InjectRepository(Reaction)
    private reactionRepository: Repository<Reaction>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /**
   * Add or update a reaction to a message
   * If user already reacted, update the reaction type
   */
  async addReaction(createReactionDto: CreateReactionDto): Promise<Reaction> {
    const { userId, messageId, type } = createReactionDto;

    // Verify that the user exists
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify that the message exists and is not deleted
    const message = await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
    });
    if (!message) {
      throw new NotFoundException('Message not found or has been deleted');
    }

    // Check if user already has a reaction on this message
    const existingReaction = await this.reactionRepository.findOne({
      where: { userId, messageId },
    });

    if (existingReaction) {
      // Update existing reaction
      existingReaction.type = type;
      return this.reactionRepository.save(existingReaction);
    } else {
      // Create new reaction
      const reaction = this.reactionRepository.create({
        userId,
        messageId,
        type,
      });
      return this.reactionRepository.save(reaction);
    }
  }

  /**
   * Remove a user's reaction from a message
   */
  async removeReaction(messageId: string, userId: string): Promise<void> {
    const reaction = await this.reactionRepository.findOne({
      where: { messageId, userId },
    });

    if (!reaction) {
      throw new NotFoundException('Reaction not found');
    }

    await this.reactionRepository.remove(reaction);
  }

  /**
   * Get all reactions for a specific message with counts
   */
  async getMessageReactions(messageId: string): Promise<MessageReactionsDto> {
    // Verify message exists
    const message = await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
    });
    if (!message) {
      throw new NotFoundException('Message not found or has been deleted');
    }

    // Get reaction counts grouped by type
    const reactionCounts = await this.reactionRepository
      .createQueryBuilder('reaction')
      .select('reaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('reaction.messageId = :messageId', { messageId })
      .groupBy('reaction.type')
      .getRawMany();

    const reactions: ReactionCountDto[] = reactionCounts.map(item => ({
      type: item.type as ReactionType,
      count: parseInt(item.count, 10),
    }));

    const totalReactions = reactions.reduce((sum, reaction) => sum + reaction.count, 0);

    return {
      messageId,
      reactions,
      totalReactions,
    };
  }

  /**
   * Get a user's reaction to a specific message
   */
  async getUserReaction(messageId: string, userId: string): Promise<Reaction | null> {
    return this.reactionRepository.findOne({
      where: { messageId, userId },
      relations: ['user', 'message'],
    });
  }

  /**
   * Get all reactions by a specific user
   */
  async getUserReactions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ reactions: Reaction[]; total: number; page: number; limit: number }> {
    const [reactions, total] = await this.reactionRepository.findAndCount({
      where: { userId },
      relations: ['message', 'message.author'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      reactions,
      total,
      page,
      limit,
    };
  }

  /**
   * Get reaction statistics for a user
   */
  async getUserReactionStats(userId: string): Promise<{
    totalReactionsGiven: number;
    totalReactionsReceived: number;
    reactionsByType: { type: ReactionType; given: number; received: number }[];
  }> {
    // Get reactions given by the user
    const reactionsGiven = await this.reactionRepository
      .createQueryBuilder('reaction')
      .select('reaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('reaction.userId = :userId', { userId })
      .groupBy('reaction.type')
      .getRawMany();

    // Get reactions received by the user (on their messages)
    const reactionsReceived = await this.reactionRepository
      .createQueryBuilder('reaction')
      .innerJoin('reaction.message', 'message')
      .select('reaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('message.authorId = :userId', { userId })
      .groupBy('reaction.type')
      .getRawMany();

    // Combine the data
    const allTypes = Object.values(ReactionType);
    const reactionsByType = allTypes.map(type => {
      const given = reactionsGiven.find(r => r.type === type)?.count || 0;
      const received = reactionsReceived.find(r => r.type === type)?.count || 0;
      return {
        type,
        given: parseInt(given, 10),
        received: parseInt(received, 10),
      };
    });

    const totalReactionsGiven = reactionsGiven.reduce((sum, r) => sum + parseInt(r.count, 10), 0);
    const totalReactionsReceived = reactionsReceived.reduce((sum, r) => sum + parseInt(r.count, 10), 0);

    return {
      totalReactionsGiven,
      totalReactionsReceived,
      reactionsByType,
    };
  }

  /**
   * Get trending reactions (most used reaction types)
   */
  async getTrendingReactions(days: number = 7): Promise<ReactionCountDto[]> {
    const date = new Date();
    date.setDate(date.getDate() - days);

    const trendingReactions = await this.reactionRepository
      .createQueryBuilder('reaction')
      .select('reaction.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('reaction.createdAt >= :date', { date })
      .groupBy('reaction.type')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    return trendingReactions.map(item => ({
      type: item.type as ReactionType,
      count: parseInt(item.count, 10),
    }));
  }
}