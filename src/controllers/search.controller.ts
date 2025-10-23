import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Post,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService } from '@/services/search.service';
import { MessageSearchDto } from '@/dto/message-search.dto';
import { MessageSearchResponseDto } from '@/dto/message-search-response.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard, CsrfGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search messages',
    description: 'Search messages using full-text search with optional filters for user, date range, and pagination.',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages found successfully',
    type: MessageSearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid search parameters',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  async searchMessages(
    @Query() searchDto: MessageSearchDto,
  ): Promise<MessageSearchResponseDto> {
    return this.searchService.searchMessages(searchDto);
  }

  @Get('suggestions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get search suggestions',
    description: 'Get autocomplete suggestions based on partial query input.',
  })
  @ApiQuery({
    name: 'q',
    description: 'Partial query for suggestions',
    example: 'hel',
    required: true,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of suggestions to return',
    example: 5,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Suggestions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        suggestions: {
          type: 'array',
          items: { type: 'string' },
          example: ['hello', 'help', 'helicopter'],
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameter',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  async getSuggestions(
    @Query('q') query: string,
    @Query('limit') limit: string = '5',
  ): Promise<{ suggestions: string[] }> {
    const suggestions = await this.searchService.getSuggestions(
      query,
      parseInt(limit, 10),
    );
    return { suggestions };
  }

  @Get('popular')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get popular search terms',
    description: 'Get a list of popular search terms used by users.',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of popular terms to return',
    example: 10,
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Popular search terms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        terms: {
          type: 'array',
          items: { type: 'string' },
          example: ['hello', 'meeting', 'project', 'update'],
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  async getPopularSearchTerms(
    @Query('limit') limit: string = '10',
  ): Promise<{ terms: string[] }> {
    const terms = await this.searchService.getPopularSearchTerms(
      parseInt(limit, 10),
    );
    return { terms };
  }

  @Post('index')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create search index',
    description: 'Create or rebuild the full-text search index for better performance.',
  })
  @ApiResponse({
    status: 201,
    description: 'Search index created successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Search index created successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to create search index',
  })
  async createSearchIndex(): Promise<{ message: string }> {
    await this.searchService.createSearchIndex();
    return { message: 'Search index created successfully' };
  }

  @Delete('index')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Drop search index',
    description: 'Remove the full-text search index.',
  })
  @ApiResponse({
    status: 200,
    description: 'Search index dropped successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Search index dropped successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to drop search index',
  })
  async dropSearchIndex(): Promise<{ message: string }> {
    await this.searchService.dropSearchIndex();
    return { message: 'Search index dropped successfully' };
  }
}