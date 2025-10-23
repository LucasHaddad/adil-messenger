import { Test, TestingModule } from '@nestjs/testing';
import { MessageController } from '@/controllers/message.controller';
import { MessageService } from '@/services/message.service';
import { FileUploadService } from '@/services/file-upload.service';
import { CreateMessageDto, UpdateMessageDto } from '@/dto';
import { 
  createMockMessage,
  testUser1, 
  testUser2,
  testMessage1,
  testMessage2,
  TEST_ERRORS 
} from '@/test/test-utils';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('MessageController', () => {
  let controller: MessageController;
  let messageService: jest.Mocked<MessageService>;

  beforeEach(async () => {
    const mockMessageService = {
      createMessage: jest.fn(),
      getMessages: jest.fn(),
      getMessageById: jest.fn(),
      getReplies: jest.fn(),
      getConversationThread: jest.fn(),
      updateMessage: jest.fn(),
      deleteMessage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessageController],
      providers: [
        {
          provide: MessageService,
          useValue: mockMessageService,
        },
        {
          provide: FileUploadService,
          useValue: {
            uploadFile: jest.fn(),
            validateFileForMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MessageController>(MessageController);
    messageService = module.get(MessageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    const createMessageDto: CreateMessageDto = {
      content: 'Test message content',
      authorId: testUser1.id,
    };

    it('should create a new message successfully', async () => {
      const expectedMessage = createMockMessage(createMessageDto);
      messageService.createMessage.mockResolvedValue(expectedMessage);

      const result = await controller.createMessage(createMessageDto);

      expect(messageService.createMessage).toHaveBeenCalledWith(createMessageDto);
      expect(result).toEqual(expectedMessage);
    });

    it('should create a reply message successfully', async () => {
      const replyDto: CreateMessageDto = {
        ...createMessageDto,
        parentMessageId: testMessage1.id,
      };
      const expectedReply = createMockMessage(replyDto);
      
      messageService.createMessage.mockResolvedValue(expectedReply);

      const result = await controller.createMessage(replyDto);

      expect(messageService.createMessage).toHaveBeenCalledWith(replyDto);
      expect(result).toEqual(expectedReply);
    });

    it('should propagate service errors', async () => {
      const error = new NotFoundException('Author not found');
      messageService.createMessage.mockRejectedValue(error);

      await expect(controller.createMessage(createMessageDto)).rejects.toThrow(error);
    });
  });

  describe('getMessages', () => {
    it('should return paginated messages with default parameters', async () => {
      const expectedResult = {
        messages: [testMessage1],
        total: 1,
        page: 1,
        limit: 20,
      };
      messageService.getMessages.mockResolvedValue(expectedResult);

      const result = await controller.getMessages();

      expect(messageService.getMessages).toHaveBeenCalledWith(1, 20);
      expect(result).toEqual(expectedResult);
    });

    it('should return paginated messages with custom parameters', async () => {
      const page = 2;
      const limit = 10;
      const expectedResult = {
        messages: [testMessage1],
        total: 1,
        page,
        limit,
      };
      messageService.getMessages.mockResolvedValue(expectedResult);

      const result = await controller.getMessages(page, limit);

      expect(messageService.getMessages).toHaveBeenCalledWith(page, limit);
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      messageService.getMessages.mockRejectedValue(error);

      await expect(controller.getMessages()).rejects.toThrow(error);
    });
  });

  describe('getMessageById', () => {
    it('should return message by ID successfully', async () => {
      messageService.getMessageById.mockResolvedValue(testMessage1);

      const result = await controller.getMessageById(testMessage1.id);

      expect(messageService.getMessageById).toHaveBeenCalledWith(testMessage1.id);
      expect(result).toEqual(testMessage1);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND);
      messageService.getMessageById.mockRejectedValue(error);

      await expect(controller.getMessageById('nonexistent-id')).rejects.toThrow(error);
    });
  });

  describe('getReplies', () => {
    it('should return replies with default pagination', async () => {
      const expectedResult = {
        replies: [testMessage2],
        total: 1,
        page: 1,
        limit: 10,
      };
      messageService.getReplies.mockResolvedValue(expectedResult);

      const result = await controller.getReplies(testMessage1.id);

      expect(messageService.getReplies).toHaveBeenCalledWith(testMessage1.id, 1, 10);
      expect(result).toEqual(expectedResult);
    });

    it('should return replies with custom pagination', async () => {
      const page = 2;
      const limit = 5;
      const expectedResult = {
        replies: [testMessage2],
        total: 1,
        page,
        limit,
      };
      messageService.getReplies.mockResolvedValue(expectedResult);

      const result = await controller.getReplies(testMessage1.id, page, limit);

      expect(messageService.getReplies).toHaveBeenCalledWith(testMessage1.id, page, limit);
      expect(result).toEqual(expectedResult);
    });

    it('should propagate service errors', async () => {
      const error = new NotFoundException('Parent message not found');
      messageService.getReplies.mockRejectedValue(error);

      await expect(controller.getReplies('nonexistent-id')).rejects.toThrow(error);
    });
  });

  describe('getConversationThread', () => {
    it('should return conversation thread successfully', async () => {
      const threadMessage = {
        ...testMessage1,
        replies: [testMessage2],
      };
      messageService.getConversationThread.mockResolvedValue(threadMessage);

      const result = await controller.getConversationThread(testMessage1.id);

      expect(messageService.getConversationThread).toHaveBeenCalledWith(testMessage1.id);
      expect(result).toEqual(threadMessage);
    });

    it('should propagate service errors', async () => {
      const error = new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND);
      messageService.getConversationThread.mockRejectedValue(error);

      await expect(controller.getConversationThread('nonexistent-id')).rejects.toThrow(error);
    });
  });

  describe('updateMessage', () => {
    const updateMessageDto: UpdateMessageDto = {
      content: 'Updated content',
    };

    it('should update message successfully', async () => {
      const updatedMessage = {
        ...testMessage1,
        content: updateMessageDto.content,
        isEdited: true,
      };
      messageService.updateMessage.mockResolvedValue(updatedMessage);

      const result = await controller.updateMessage(testMessage1.id, updateMessageDto, testUser1.id);

      expect(messageService.updateMessage).toHaveBeenCalledWith(
        testMessage1.id,
        updateMessageDto,
        testUser1.id
      );
      expect(result).toEqual(updatedMessage);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND);
      messageService.updateMessage.mockRejectedValue(error);

      await expect(
        controller.updateMessage('nonexistent-id', updateMessageDto, testUser1.id)
      ).rejects.toThrow(error);
    });

    it('should propagate ForbiddenException from service', async () => {
      const error = new ForbiddenException(TEST_ERRORS.FORBIDDEN_EDIT);
      messageService.updateMessage.mockRejectedValue(error);

      await expect(
        controller.updateMessage(testMessage1.id, updateMessageDto, testUser2.id)
      ).rejects.toThrow(error);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      messageService.deleteMessage.mockResolvedValue(undefined);

      const result = await controller.deleteMessage(testMessage1.id, testUser1.id);

      expect(messageService.deleteMessage).toHaveBeenCalledWith(testMessage1.id, testUser1.id);
      expect(result).toBeUndefined();
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND);
      messageService.deleteMessage.mockRejectedValue(error);

      await expect(
        controller.deleteMessage('nonexistent-id', testUser1.id)
      ).rejects.toThrow(error);
    });

    it('should propagate ForbiddenException from service', async () => {
      const error = new ForbiddenException(TEST_ERRORS.FORBIDDEN_DELETE);
      messageService.deleteMessage.mockRejectedValue(error);

      await expect(
        controller.deleteMessage(testMessage1.id, testUser2.id)
      ).rejects.toThrow(error);
    });
  });

  // Edge cases and parameter validation
  describe('Edge Cases', () => {
    it('should handle invalid UUID format in getMessageById', async () => {
      // Note: In a real application, this would be caught by the ParseUUIDPipe
      // but here we're testing the controller logic directly
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format');
      messageService.getMessageById.mockRejectedValue(error);

      await expect(controller.getMessageById(invalidId)).rejects.toThrow(error);
    });

    it('should handle invalid pagination parameters', async () => {
      const negativePage = -1;
      const negativeLimit = -10;
      
      // The service should handle these gracefully or the pipes should catch them
      messageService.getMessages.mockResolvedValue({
        messages: [],
        total: 0,
        page: negativePage,
        limit: negativeLimit,
      });

      const result = await controller.getMessages(negativePage, negativeLimit);

      expect(messageService.getMessages).toHaveBeenCalledWith(negativePage, negativeLimit);
      expect(result).toBeDefined();
    });

    it('should handle empty update DTO', async () => {
      const emptyUpdateDto: UpdateMessageDto = {
        content: '',
      };
      const updatedMessage = {
        ...testMessage1,
        content: '',
        isEdited: true,
      };
      
      messageService.updateMessage.mockResolvedValue(updatedMessage);

      const result = await controller.updateMessage(testMessage1.id, emptyUpdateDto, testUser1.id);

      expect(result.content).toBe('');
    });

    it('should handle concurrent requests gracefully', async () => {
      // Simulate concurrent updates
      const updateDto: UpdateMessageDto = { content: 'Concurrent update' };
      const concurrencyError = new Error('Concurrent modification detected');
      
      messageService.updateMessage.mockRejectedValue(concurrencyError);

      await expect(
        controller.updateMessage(testMessage1.id, updateDto, testUser1.id)
      ).rejects.toThrow(concurrencyError);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      messageService.getMessages.mockRejectedValue(timeoutError);

      await expect(controller.getMessages()).rejects.toThrow(timeoutError);
    });
  });
});