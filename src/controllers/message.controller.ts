import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiHeader,
  ApiConsumes,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { MessageService } from '@/services/message.service';
import { FileUploadService, UploadedFile as CustomUploadedFile } from '@/services/file-upload.service';
import { CreateMessageDto, UpdateMessageDto, MessageResponseDto } from '@/dto';
import { Message } from '@/entities';

interface MulterFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('Messages')
@ApiBearerAuth()
@ApiHeader({
  name: 'X-CSRF-Token',
  description: 'CSRF token for security',
  required: true,
})
@Controller('messages')
@Throttle({ read: { limit: 100, ttl: 60000 }, write: { limit: 50, ttl: 60000 } }) // Different limits for read vs write
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Post()
  @Throttle({ write: { limit: 30, ttl: 60000 } }) // Stricter limit for message creation
  @ApiOperation({ summary: 'Send a new message or reply to an existing message' })
  @ApiBody({ type: CreateMessageDto })
  @ApiResponse({
    status: 201,
    description: 'Message created successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 404, description: 'Author or parent message not found' })
  async createMessage(@Body() createMessageDto: CreateMessageDto): Promise<Message> {
    return this.messageService.createMessage(createMessageDto);
  }

  @Post('with-attachment')
  @UseInterceptors(FileInterceptor('file'))
  @Throttle({ write: { limit: 20, ttl: 60000 } }) // Even stricter for file attachments
  @ApiOperation({ summary: 'Send a message with file attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Message with file attachment',
    schema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Message content',
          maxLength: 2000,
        },
        authorId: {
          type: 'string',
          description: 'Author UUID',
        },
        parentMessageId: {
          type: 'string',
          description: 'Parent message UUID (optional)',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'File attachment (optional)',
        },
      },
      required: ['content', 'authorId'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Message with attachment created successfully',
    type: MessageResponseDto,
  })
  async createMessageWithAttachment(
    @Body() createMessageDto: CreateMessageDto,
    @UploadedFile() file?: MulterFile,
  ): Promise<Message> {
    let messageDto = { ...createMessageDto };

    // If a file is uploaded, process it
    if (file) {
      const customFile: CustomUploadedFile = {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer,
      };

      const fileResult = await this.fileUploadService.uploadFile(customFile);
      
      messageDto = {
        ...messageDto,
        attachmentUrl: fileResult.url,
        attachmentName: fileResult.originalName,
        attachmentType: fileResult.mimeType,
        attachmentSize: fileResult.size,
      };
    }

    return this.messageService.createMessage(messageDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages with pagination' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: [MessageResponseDto],
  })
  async getMessages(
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 20,
  ): Promise<{ messages: Message[]; total: number; page: number; limit: number }> {
    return this.messageService.getMessages(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific message by ID' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'Message retrieved successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getMessageById(@Param('id', ParseUUIDPipe) id: string): Promise<Message> {
    return this.messageService.getMessageById(id);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'Get replies for a specific message' })
  @ApiParam({ name: 'id', description: 'Parent message UUID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  @ApiResponse({
    status: 200,
    description: 'Replies retrieved successfully',
    type: [MessageResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Parent message not found' })
  async getReplies(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ): Promise<{ replies: Message[]; total: number; page: number; limit: number }> {
    return this.messageService.getReplies(id, page, limit);
  }

  @Get(':id/thread')
  @ApiOperation({ summary: 'Get conversation thread starting from a message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation thread retrieved successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getConversationThread(@Param('id', ParseUUIDPipe) id: string): Promise<Message> {
    return this.messageService.getConversationThread(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit a message (only by the author)' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiBody({ type: UpdateMessageDto })
  @ApiQuery({ name: 'authorId', description: 'ID of the user making the request' })
  @ApiResponse({
    status: 200,
    description: 'Message updated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request - validation failed' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the message author' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async updateMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateMessageDto: UpdateMessageDto,
    @Query('authorId', ParseUUIDPipe) authorId: string,
  ): Promise<Message> {
    return this.messageService.updateMessage(id, updateMessageDto, authorId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message (only by the author)' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  @ApiQuery({ name: 'authorId', description: 'ID of the user making the request' })
  @ApiResponse({ status: 204, description: 'Message deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - not the message author' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('authorId', ParseUUIDPipe) authorId: string,
  ): Promise<void> {
    return this.messageService.deleteMessage(id, authorId);
  }
}