import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Message } from '@/entities/message.entity';
import { User } from '@/entities/user.entity';
import { MessageSearchDto } from '@/dto/message-search.dto';
import { MessageSearchResponseDto } from '@/dto/message-search-response.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async searchMessages(
    searchDto: MessageSearchDto,
  ): Promise<MessageSearchResponseDto> {
    const {
      query,
      userId,
      dateFrom,
      dateTo,
      limit = 20,
      offset = 0,
    } = searchDto;

    let queryBuilder: SelectQueryBuilder<Message> = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.user', 'user')
      .leftJoinAndSelect('message.reactions', 'reactions')
      .select([
        'message.id',
        'message.content',
        'message.createdAt',
        'message.updatedAt',
        'message.attachmentUrl',
        'message.attachmentName',
        'message.attachmentType',
        'message.attachmentSize',
        'user.id',
        'user.username',
        'user.email',
        'reactions.id',
        'reactions.type',
      ]);

    if (query && query.trim()) {
      queryBuilder = queryBuilder.andWhere(
        `to_tsvector('english', message.content) @@ plainto_tsquery('english', :query)`,
        { query: query.trim() },
      );
    }

    if (userId) {
      queryBuilder = queryBuilder.andWhere('message.userId = :userId', {
        userId,
      });
    }

    if (dateFrom) {
      queryBuilder = queryBuilder.andWhere('message.createdAt >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }

    if (dateTo) {
      queryBuilder = queryBuilder.andWhere('message.createdAt <= :dateTo', {
        dateTo: new Date(dateTo),
      });
    }

    if (query && query.trim()) {
      queryBuilder = queryBuilder
        .orderBy(
          `ts_rank(to_tsvector('english', message.content), plainto_tsquery('english', :rankQuery))`,
          'DESC',
        )
        .setParameter('rankQuery', query.trim());
      queryBuilder = queryBuilder.addOrderBy('message.createdAt', 'DESC');
    } else {
      queryBuilder = queryBuilder.orderBy('message.createdAt', 'DESC');
    }

    const totalQueryBuilder = queryBuilder.clone();
    const total = await totalQueryBuilder.getCount();

    queryBuilder = queryBuilder.skip(offset).take(limit);

    const messages = await queryBuilder.getMany();

    return {
      messages,
      total,
      count: messages.length,
      offset,
      limit,
      hasMore: offset + messages.length < total,
    };
  }

  async getPopularSearchTerms(limit: number = 10): Promise<string[]> {
    return [
      'hello',
      'meeting',
      'project',
      'update',
      'help',
      'question',
      'urgent',
      'deadline',
      'feedback',
      'review',
    ].slice(0, limit);
  }

  async getSuggestions(
    partialQuery: string,
    limit: number = 5,
  ): Promise<string[]> {
    if (!partialQuery || partialQuery.length < 2) {
      return [];
    }

    const result = await this.messageRepository
      .createQueryBuilder('message')
      .select("DISTINCT regexp_split_to_table(message.content, '\\s+') AS word")
      .where("regexp_split_to_table(message.content, '\\s+') ILIKE :query", {
        query: `${partialQuery}%`,
      })
      .andWhere("LENGTH(regexp_split_to_table(message.content, '\\s+')) > 2")
      .orderBy('word')
      .limit(limit)
      .getRawMany();

    return result.map(row => row.word);
  }

  async createSearchIndex(): Promise<void> {
    await this.messageRepository.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_content_fts 
      ON messages USING gin(to_tsvector('english', content));
    `);
  }

  async dropSearchIndex(): Promise<void> {
    await this.messageRepository.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_message_content_fts;
    `);
  }
}
