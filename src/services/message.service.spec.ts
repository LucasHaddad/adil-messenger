import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessageService } from '@/services/message.service';
import { Message, User } from '@/entities';
import { CreateMessageDto, UpdateMessageDto } from '@/dto';
import { 
  createMockRepository, 
  createMockMessage, 
  createMockUser,
  testUser1, 
  testUser2,
  testMessage1,
  testMessage2,
  TEST_ERRORS 
} from '@/test/test-utils';

describe('MessageService', () => {
  let service: MessageService;
  let messageRepository: jest.Mocked<Repository<Message>>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockMessageRepository = createMockRepository<Message>();
    const mockUserRepository = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    messageRepository = module.get(getRepositoryToken(Message));
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createMessage', () => {
    const createMessageDto: CreateMessageDto = {
      content: 'Test message content',
      authorId: testUser1.id,
    };

    it('should create a top-level message successfully', async () => {
      const expectedMessage = createMockMessage(createMessageDto);

      userRepository.findOne.mockResolvedValue(testUser1);
      messageRepository.create.mockReturnValue(expectedMessage);
      messageRepository.save.mockResolvedValue(expectedMessage);

      const result = await service.createMessage(createMessageDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: createMessageDto.authorId },
      });
      expect(messageRepository.create).toHaveBeenCalledWith({
        content: createMessageDto.content,
        authorId: createMessageDto.authorId,
        parentMessageId: undefined,
      });
      expect(messageRepository.save).toHaveBeenCalledWith(expectedMessage);
      expect(result).toEqual(expectedMessage);
    });

    it('should create a reply message successfully', async () => {
      const replyDto: CreateMessageDto = {
        ...createMessageDto,
        parentMessageId: testMessage1.id,
      };
      const expectedReply = createMockMessage(replyDto);

      userRepository.findOne.mockResolvedValue(testUser1);
      messageRepository.findOne.mockResolvedValue(testMessage1);
      messageRepository.create.mockReturnValue(expectedReply);
      messageRepository.save.mockResolvedValue(expectedReply);

      const result = await service.createMessage(replyDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: replyDto.authorId },
      });
      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: replyDto.parentMessageId, isDeleted: false },
      });
      expect(messageRepository.create).toHaveBeenCalledWith({
        content: replyDto.content,
        authorId: replyDto.authorId,
        parentMessageId: replyDto.parentMessageId,
      });
      expect(result).toEqual(expectedReply);
    });

    it('should throw NotFoundException when author not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.createMessage(createMessageDto)).rejects.toThrow(
        new NotFoundException('Author not found')
      );

      expect(messageRepository.create).not.toHaveBeenCalled();
      expect(messageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when parent message not found', async () => {
      const replyDto: CreateMessageDto = {
        ...createMessageDto,
        parentMessageId: 'nonexistent-parent-id',
      };

      userRepository.findOne.mockResolvedValue(testUser1);
      messageRepository.findOne.mockResolvedValue(null);

      await expect(service.createMessage(replyDto)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.PARENT_NOT_FOUND)
      );

      expect(messageRepository.create).not.toHaveBeenCalled();
      expect(messageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when parent message is deleted', async () => {
      const replyDto: CreateMessageDto = {
        ...createMessageDto,
        parentMessageId: testMessage1.id,
      };
      const deletedParent = createMockMessage({ ...testMessage1, isDeleted: true });

      userRepository.findOne.mockResolvedValue(testUser1);
      messageRepository.findOne.mockResolvedValue(null); // deleted message won't be found

      await expect(service.createMessage(replyDto)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.PARENT_NOT_FOUND)
      );
    });
  });

  describe('getMessages', () => {
    it('should return paginated top-level messages with reply counts', async () => {
      const messages = [testMessage1];
      const totalCount = 1;
      const replyCount = 2;

      messageRepository.findAndCount.mockResolvedValue([messages, totalCount]);
      messageRepository.count.mockResolvedValue(replyCount);

      const result = await service.getMessages(1, 20);

      expect(messageRepository.findAndCount).toHaveBeenCalledWith({
        where: { isDeleted: false, parentMessageId: null },
        relations: ['author'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(messageRepository.count).toHaveBeenCalledWith({
        where: { parentMessageId: testMessage1.id, isDeleted: false },
      });
      expect(result).toEqual({
        messages: [{ ...testMessage1, replyCount }],
        total: totalCount,
        page: 1,
        limit: 20,
      });
    });

    it('should return replies when parentMessageId is provided', async () => {
      const replies = [testMessage2];
      const totalCount = 1;

      messageRepository.findAndCount.mockResolvedValue([replies, totalCount]);
      messageRepository.count.mockResolvedValue(0);

      const result = await service.getMessages(1, 10, testMessage1.id);

      expect(messageRepository.findAndCount).toHaveBeenCalledWith({
        where: { isDeleted: false, parentMessageId: testMessage1.id },
        relations: ['author'],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 10,
      });
      expect(result).toEqual({
        messages: [{ ...testMessage2, replyCount: 0 }],
        total: totalCount,
        page: 1,
        limit: 10,
      });
    });

    it('should handle pagination correctly', async () => {
      const page = 2;
      const limit = 5;
      const expectedSkip = (page - 1) * limit;

      messageRepository.findAndCount.mockResolvedValue([[], 0]);

      await service.getMessages(page, limit);

      expect(messageRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: expectedSkip,
          take: limit,
        })
      );
    });

    it('should return empty result when no messages found', async () => {
      messageRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getMessages();

      expect(result).toEqual({
        messages: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    });
  });

  describe('getMessageById', () => {
    it('should return message with reply count when found', async () => {
      const replyCount = 3;
      messageRepository.findOne.mockResolvedValue(testMessage1);
      messageRepository.count.mockResolvedValue(replyCount);

      const result = await service.getMessageById(testMessage1.id);

      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: testMessage1.id, isDeleted: false },
        relations: ['author'],
      });
      expect(messageRepository.count).toHaveBeenCalledWith({
        where: { parentMessageId: testMessage1.id, isDeleted: false },
      });
      expect(result).toEqual({ ...testMessage1, replyCount });
    });

    it('should throw NotFoundException when message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(service.getMessageById('nonexistent-id')).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );

      expect(messageRepository.count).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when message is deleted', async () => {
      messageRepository.findOne.mockResolvedValue(null); // deleted messages won't be found

      await expect(service.getMessageById(testMessage1.id)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );
    });
  });

  describe('getReplies', () => {
    it('should return replies for existing message', async () => {
      const replies = [testMessage2];
      const totalCount = 1;

      messageRepository.findOne.mockResolvedValue(testMessage1); // parent exists
      messageRepository.findAndCount.mockResolvedValue([replies, totalCount]);
      messageRepository.count.mockResolvedValue(0);

      const result = await service.getReplies(testMessage1.id, 1, 10);

      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: testMessage1.id, isDeleted: false },
      });
      expect(result).toEqual({
        replies: [{ ...testMessage2, replyCount: 0 }],
        total: totalCount,
        page: 1,
        limit: 10,
      });
    });

    it('should throw NotFoundException when parent message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(service.getReplies('nonexistent-id')).rejects.toThrow(
        new NotFoundException('Parent message not found')
      );
    });
  });

  describe('updateMessage', () => {
    const updateMessageDto: UpdateMessageDto = {
      content: 'Updated message content',
    };

    it('should update message successfully by author', async () => {
      const updatedMessage = { ...testMessage1, ...updateMessageDto, isEdited: true };
      
      messageRepository.findOne.mockResolvedValue(testMessage1);
      messageRepository.save.mockResolvedValue(updatedMessage);
      messageRepository.count.mockResolvedValue(0);

      const result = await service.updateMessage(testMessage1.id, updateMessageDto, testUser1.id);

      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: testMessage1.id, isDeleted: false },
        relations: ['author'],
      });
      expect(messageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          content: updateMessageDto.content,
          isEdited: true,
        })
      );
      expect(result).toEqual({ ...updatedMessage, replyCount: 0 });
    });

    it('should throw NotFoundException when message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateMessage('nonexistent-id', updateMessageDto, testUser1.id)
      ).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );

      expect(messageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      messageRepository.findOne.mockResolvedValue(testMessage1);

      await expect(
        service.updateMessage(testMessage1.id, updateMessageDto, testUser2.id)
      ).rejects.toThrow(
        new ForbiddenException(TEST_ERRORS.FORBIDDEN_EDIT)
      );

      expect(messageRepository.save).not.toHaveBeenCalled();
    });

    it('should handle database save errors', async () => {
      const saveError = new Error('Save failed');
      
      messageRepository.findOne.mockResolvedValue(testMessage1);
      messageRepository.save.mockRejectedValue(saveError);

      await expect(
        service.updateMessage(testMessage1.id, updateMessageDto, testUser1.id)
      ).rejects.toThrow(saveError);
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message successfully by author', async () => {
      messageRepository.findOne.mockResolvedValue(testMessage1);
      messageRepository.save.mockResolvedValue({
        ...testMessage1,
        isDeleted: true,
        deletedAt: expect.any(Date),
      });

      await service.deleteMessage(testMessage1.id, testUser1.id);

      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: testMessage1.id, isDeleted: false },
      });
      expect(messageRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          isDeleted: true,
          deletedAt: expect.any(Date),
        })
      );
    });

    it('should throw NotFoundException when message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteMessage('nonexistent-id', testUser1.id)
      ).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );

      expect(messageRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      messageRepository.findOne.mockResolvedValue(testMessage1);

      await expect(
        service.deleteMessage(testMessage1.id, testUser2.id)
      ).rejects.toThrow(
        new ForbiddenException(TEST_ERRORS.FORBIDDEN_DELETE)
      );

      expect(messageRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getConversationThread', () => {
    it('should return message with all replies', async () => {
      const replies = [testMessage2];
      
      // Mock getMessageById call
      messageRepository.findOne.mockResolvedValueOnce(testMessage1);
      messageRepository.count
        .mockResolvedValueOnce(1) // reply count for main message
        .mockResolvedValueOnce(0); // reply count for each reply
      
      // Mock replies fetch
      messageRepository.find.mockResolvedValue(replies);

      const result = await service.getConversationThread(testMessage1.id);

      expect(messageRepository.findOne).toHaveBeenCalledWith({
        where: { id: testMessage1.id, isDeleted: false },
        relations: ['author'],
      });
      expect(messageRepository.find).toHaveBeenCalledWith({
        where: { parentMessageId: testMessage1.id, isDeleted: false },
        relations: ['author'],
        order: { createdAt: 'ASC' },
      });
      expect(result).toEqual({
        ...testMessage1,
        replyCount: 1,
        replies: [{ ...testMessage2, replyCount: 0 }],
      });
    });

    it('should throw NotFoundException when message not found', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(service.getConversationThread('nonexistent-id')).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );
    });
  });

  // Edge cases and integration scenarios
  describe('Edge Cases', () => {
    it('should handle empty content in createMessage', async () => {
      const emptyContentDto: CreateMessageDto = {
        content: '',
        authorId: testUser1.id,
      };
      const expectedMessage = createMockMessage(emptyContentDto);

      userRepository.findOne.mockResolvedValue(testUser1);
      messageRepository.create.mockReturnValue(expectedMessage);
      messageRepository.save.mockResolvedValue(expectedMessage);

      const result = await service.createMessage(emptyContentDto);

      expect(result).toEqual(expectedMessage);
    });

    it('should handle very long content in createMessage', async () => {
      const longContent = 'a'.repeat(2000);
      const longContentDto: CreateMessageDto = {
        content: longContent,
        authorId: testUser1.id,
      };
      const expectedMessage = createMockMessage(longContentDto);

      userRepository.findOne.mockResolvedValue(testUser1);
      messageRepository.create.mockReturnValue(expectedMessage);
      messageRepository.save.mockResolvedValue(expectedMessage);

      const result = await service.createMessage(longContentDto);

      expect(result.content).toBe(longContent);
    });

    it('should handle null/undefined values gracefully', async () => {
      messageRepository.findOne.mockResolvedValue(null);

      await expect(service.getMessageById(null as any)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );

      await expect(service.getMessageById(undefined as any)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.MESSAGE_NOT_FOUND)
      );
    });

    it('should handle database connection errors', async () => {
      const dbError = new Error('Database connection lost');
      messageRepository.findAndCount.mockRejectedValue(dbError);

      await expect(service.getMessages()).rejects.toThrow(dbError);
    });

    it('should handle large page numbers', async () => {
      const largePage = 999999;
      const limit = 20;
      
      messageRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getMessages(largePage, limit);

      expect(messageRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: (largePage - 1) * limit,
          take: limit,
        })
      );
      expect(result.messages).toEqual([]);
    });

    it('should handle concurrent updates gracefully', async () => {
      const updateDto: UpdateMessageDto = { content: 'Concurrent update' };
      
      // Simulate a message that exists when found but fails to save due to concurrent modification
      messageRepository.findOne.mockResolvedValue(testMessage1);
      messageRepository.save.mockRejectedValue(new Error('Concurrent modification'));

      await expect(
        service.updateMessage(testMessage1.id, updateDto, testUser1.id)
      ).rejects.toThrow('Concurrent modification');
    });
  });
});