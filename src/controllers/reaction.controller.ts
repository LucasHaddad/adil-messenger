import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { ReactionService } from '@/services/reaction.service';
import { CreateReactionDto } from '@/dto/create-reaction.dto';
import { ReactionResponseDto, MessageReactionsDto, ReactionCountDto } from '@/dto/reaction-response.dto';
import { Reaction } from '@/entities';

@ApiTags('Reactions')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-CSRF-Token',
  description: 'CSRF token for security',
  required: true,
})
@UseGuards(JwtAuthGuard, CsrfGuard)
@Controller('reactions')
export class ReactionController {
  constructor(private readonly reactionService: ReactionService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Add or update a reaction to a message',
    description: 'Add a new reaction or update an existing reaction for a message. If the user already reacted, the reaction type will be updated.',
  })
  @ApiBody({ type: CreateReactionDto })
  @ApiResponse({
    status: 201,
    description: 'Reaction created or updated successfully',
    type: ReactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Message or user not found' })
  async addReaction(
    @Body() createReactionDto: CreateReactionDto,
    @Request() req: any,
  ): Promise<Reaction> {
    // Override userId with authenticated user
    const reactionDto = {
      ...createReactionDto,
      userId: req.user.id,
    };
    return this.reactionService.addReaction(reactionDto);
  }

  @Delete('message/:messageId')
  @ApiOperation({ 
    summary: 'Remove user\'s reaction from a message',
    description: 'Remove the authenticated user\'s reaction from a specific message.',
  })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'Reaction removed successfully',
  })
  @ApiResponse({ status: 404, description: 'Reaction not found' })
  async removeReaction(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    await this.reactionService.removeReaction(messageId, req.user.id);
    return { message: 'Reaction removed successfully' };
  }

  @Get('message/:messageId')
  @ApiOperation({ 
    summary: 'Get all reactions for a message',
    description: 'Get reaction counts grouped by type for a specific message.',
  })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'Message reactions retrieved successfully',
    type: MessageReactionsDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessageReactions(
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ): Promise<MessageReactionsDto> {
    return this.reactionService.getMessageReactions(messageId);
  }

  @Get('message/:messageId/user')
  @ApiOperation({ 
    summary: 'Get user\'s reaction to a message',
    description: 'Get the authenticated user\'s reaction to a specific message.',
  })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'User reaction retrieved successfully',
    type: ReactionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'No reaction found' })
  async getUserReactionToMessage(
    @Param('messageId', ParseUUIDPipe) messageId: string,
    @Request() req: any,
  ): Promise<Reaction | null> {
    return this.reactionService.getUserReaction(messageId, req.user.id);
  }

  @Get('user/my-reactions')
  @ApiOperation({ 
    summary: 'Get user\'s own reactions',
    description: 'Get all reactions made by the authenticated user with pagination.',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'User reactions retrieved successfully',
    type: [ReactionResponseDto],
  })
  async getMyReactions(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
    @Request() req: any,
  ): Promise<{ reactions: Reaction[]; total: number; page: number; limit: number }> {
    return this.reactionService.getUserReactions(req.user.id, page, limit);
  }

  @Get('user/stats')
  @ApiOperation({ 
    summary: 'Get user\'s reaction statistics',
    description: 'Get statistics about reactions given and received by the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'User reaction statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalReactionsGiven: { type: 'number' },
        totalReactionsReceived: { type: 'number' },
        reactionsByType: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              given: { type: 'number' },
              received: { type: 'number' },
            },
          },
        },
      },
    },
  })
  async getMyReactionStats(@Request() req: any) {
    return this.reactionService.getUserReactionStats(req.user.id);
  }

  @Get('trending')
  @ApiOperation({ 
    summary: 'Get trending reactions',
    description: 'Get the most used reaction types in the specified time period.',
  })
  @ApiQuery({ 
    name: 'days', 
    required: false, 
    description: 'Number of days to look back (default: 7)',
    example: 7,
  })
  @ApiResponse({
    status: 200,
    description: 'Trending reactions retrieved successfully',
    type: [ReactionCountDto],
  })
  async getTrendingReactions(
    @Query('days', new ParseIntPipe({ optional: true })) days: number = 7,
  ): Promise<ReactionCountDto[]> {
    return this.reactionService.getTrendingReactions(days);
  }
}