import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { MessageService } from '@/services/message.service';
import { Server, Socket } from 'socket.io';
import { Message } from '@/entities';

// Mock Socket.IO
const mockServer = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
} as unknown as Server;

const mockSocket = {
  id: 'socket-1',
  userId: 'user-1',
  sessionId: 'session-1',
  join: jest.fn(),
  leave: jest.fn(),
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  handshake: {
    auth: { userId: 'user-1', token: 'valid-token' },
    headers: {},
  },
} as unknown as Socket;

const mockMessageService = {
  createMessage: jest.fn(),
  getMessageById: jest.fn(),
};

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let messageService: MessageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatGateway,
        {
          provide: MessageService,
          useValue: {
            createMessage: jest.fn(),
            getMessages: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('afterInit', () => {
    it('should log initialization', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log');
      gateway.afterInit(mockServer);
      expect(loggerSpy).toHaveBeenCalledWith('WebSocket Gateway initialized');
    });
  });

  describe('handleConnection', () => {
    it('should handle client connection with authentication', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket);

      expect(loggerSpy).toHaveBeenCalledWith('Client connected: socket-1');
      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('userOnline', {
        userId: 'user-1',
        timestamp: expect.any(Date),
      });
    });

    it('should handle client connection without authentication', () => {
      const unauthenticatedSocket = {
        ...mockSocket,
        handshake: { auth: {}, headers: {} },
      } as unknown as Socket;

      gateway.handleConnection(unauthenticatedSocket);

      expect(unauthenticatedSocket.join).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalledWith(
        'userOnline',
        expect.any(Object),
      );
    });
  });

  describe('handleDisconnect', () => {
    beforeEach(() => {
      // Set up connection first
      gateway.handleConnection(mockSocket);
      jest.clearAllMocks();
    });

    it('should handle client disconnection', () => {
      const loggerSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket);

      expect(loggerSpy).toHaveBeenCalledWith('Client disconnected: socket-1');
      expect(mockServer.emit).toHaveBeenCalledWith('userOffline', {
        userId: 'user-1',
        timestamp: expect.any(Date),
      });
    });
  });

  describe('handleJoinRoom', () => {
    beforeEach(() => {
      gateway.handleConnection(mockSocket);
      jest.clearAllMocks();
    });

    it('should handle joining a room', () => {
      const roomData = { roomId: 'room-1' };

      gateway.handleJoinRoom(roomData, mockSocket);

      expect(mockSocket.join).toHaveBeenCalledWith('room-1');
      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });

    it('should not join room if user not authenticated', () => {
      const unauthenticatedSocket = {
        ...mockSocket,
        userId: undefined,
      } as unknown as Socket;
      const roomData = { roomId: 'room-1' };

      gateway.handleJoinRoom(roomData, unauthenticatedSocket);

      expect(unauthenticatedSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveRoom', () => {
    beforeEach(() => {
      gateway.handleConnection(mockSocket);
      jest.clearAllMocks();
    });

    it('should handle leaving a room', () => {
      const roomData = { roomId: 'room-1' };

      gateway.handleLeaveRoom(roomData, mockSocket);

      expect(mockSocket.leave).toHaveBeenCalledWith('room-1');
      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });
  });

  describe('handleMessage', () => {
    const mockMessage = {
      id: 'message-1',
      content: 'Test message',
      authorId: 'user-1',
      parentMessageId: null,
      createdAt: new Date(),
      author: { id: 'user-1', email: 'test@example.com' },
    } as Message;

    beforeEach(() => {
      gateway.handleConnection(mockSocket);
      jest.clearAllMocks();
    });

    it('should handle sending a message', async () => {
      const createMessageDto = {
        content: 'Test message',
        authorId: 'user-1',
      };

      mockMessageService.createMessage.mockResolvedValue(mockMessage);

      await gateway.handleMessage(createMessageDto, mockSocket);

      expect(mockMessageService.createMessage).toHaveBeenCalledWith({
        ...createMessageDto,
        authorId: 'user-1',
      });

      expect(mockServer.emit).toHaveBeenCalledWith('newMessage', {
        id: mockMessage.id,
        content: mockMessage.content,
        authorId: mockMessage.authorId,
        parentMessageId: mockMessage.parentMessageId,
        createdAt: mockMessage.createdAt,
        author: mockMessage.author,
      });
    });

    it('should handle message reply and notify parent author', async () => {
      const replyMessage = {
        ...mockMessage,
        id: 'reply-1',
        parentMessageId: 'parent-1',
        content: 'This is a reply',
      };

      const parentMessage = {
        id: 'parent-1',
        authorId: 'user-2',
        content: 'Original message',
      } as Message;

      const createMessageDto = {
        content: 'This is a reply',
        authorId: 'user-1',
        parentMessageId: 'parent-1',
      };

      mockMessageService.createMessage.mockResolvedValue(replyMessage);
      mockMessageService.getMessageById.mockResolvedValue(parentMessage);

      await gateway.handleMessage(createMessageDto, mockSocket);

      expect(mockMessageService.createMessage).toHaveBeenCalledWith({
        ...createMessageDto,
        authorId: 'user-1',
      });

      expect(mockMessageService.getMessageById).toHaveBeenCalledWith(
        'parent-1',
      );
      expect(mockServer.emit).toHaveBeenCalledWith(
        'newMessage',
        expect.any(Object),
      );
    });

    it('should handle error when sending message', async () => {
      const createMessageDto = {
        content: 'Test message',
        authorId: 'user-1',
      };

      mockMessageService.createMessage.mockRejectedValue(
        new Error('Database error'),
      );

      await gateway.handleMessage(createMessageDto, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('error', {
        message: 'Failed to send message',
      });
    });

    it('should reject message from unauthenticated user', async () => {
      const unauthenticatedSocket = {
        ...mockSocket,
        userId: undefined,
      } as unknown as Socket;
      const createMessageDto = {
        content: 'Test message',
        authorId: 'user-1',
      };

      await gateway.handleMessage(createMessageDto, unauthenticatedSocket);

      expect(unauthenticatedSocket.emit).toHaveBeenCalledWith('error', {
        message: 'User not authenticated',
      });
      expect(mockMessageService.createMessage).not.toHaveBeenCalled();
    });
  });

  describe('handleTyping', () => {
    beforeEach(() => {
      gateway.handleConnection(mockSocket);
      jest.clearAllMocks();
    });

    it('should handle typing indicator', () => {
      const typingData = { roomId: 'room-1', isTyping: true };

      gateway.handleTyping(typingData, mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });

    it('should handle stop typing indicator', () => {
      const typingData = { roomId: 'room-1', isTyping: false };

      gateway.handleTyping(typingData, mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('room-1');
    });

    it('should use default room when roomId not provided', () => {
      const typingData = { isTyping: true };

      gateway.handleTyping(typingData, mockSocket);

      expect(mockSocket.to).toHaveBeenCalledWith('general');
    });
  });

  describe('handleGetOnlineUsers', () => {
    beforeEach(() => {
      gateway.handleConnection(mockSocket);
      jest.clearAllMocks();
    });

    it('should return list of online users', () => {
      gateway.handleGetOnlineUsers(mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('onlineUsers', {
        users: ['user-1'],
      });
    });
  });

  describe('broadcastMessageUpdate', () => {
    it('should broadcast message update', () => {
      gateway.broadcastMessageUpdate('message-1', 'Updated content', 'user-1');

      expect(mockServer.emit).toHaveBeenCalledWith('messageUpdated', {
        messageId: 'message-1',
        content: 'Updated content',
        authorId: 'user-1',
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('broadcastMessageDelete', () => {
    it('should broadcast message deletion', () => {
      gateway.broadcastMessageDelete('message-1', 'user-1');

      expect(mockServer.emit).toHaveBeenCalledWith('messageDeleted', {
        messageId: 'message-1',
        authorId: 'user-1',
        deletedAt: expect.any(Date),
      });
    });
  });
});
