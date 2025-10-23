import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { MessageService } from '@/services/message.service';
import { CreateMessageDto } from '@/dto/create-message.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('ChatGateway');
  private userSessions = new Map<string, Set<string>>(); // userId -> Set of socketIds
  private socketToUser = new Map<string, string>(); // socketId -> userId
  private typingUsers = new Map<string, Set<string>>(); // roomId -> Set of userIds

  constructor(private messageService: MessageService) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    
    // Extract user information from token in query or headers
    const token = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (token) {
      // In a real implementation, you'd validate the JWT token here
      // For now, we'll accept the userId from the client
      const userId = client.handshake.auth?.userId;
      if (userId) {
        this.associateUserWithSocket(userId, client.id);
        client.userId = userId;
        
        // Join user to their personal room
        client.join(`user:${userId}`);
        
        // Notify others about user presence
        this.server.emit('userOnline', { userId, timestamp: new Date() });
      }
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    if (client.userId) {
      this.removeUserSocket(client.userId, client.id);
      
      // Check if user has no more active connections
      const userSockets = this.userSessions.get(client.userId);
      if (!userSockets || userSockets.size === 0) {
        this.server.emit('userOffline', { userId: client.userId, timestamp: new Date() });
      }
      
      // Remove from typing indicators
      this.typingUsers.forEach((users, roomId) => {
        if (users.has(client.userId)) {
          users.delete(client.userId);
          this.server.to(roomId).emit('userStoppedTyping', { userId: client.userId });
        }
      });
    }
    
    this.socketToUser.delete(client.id);
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    
    client.join(data.roomId);
    this.logger.log(`User ${client.userId} joined room ${data.roomId}`);
    
    // Notify others in the room
    client.to(data.roomId).emit('userJoinedRoom', {
      userId: client.userId,
      roomId: data.roomId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(
    @MessageBody() data: { roomId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;
    
    client.leave(data.roomId);
    this.logger.log(`User ${client.userId} left room ${data.roomId}`);
    
    // Remove from typing indicators for this room
    const typingInRoom = this.typingUsers.get(data.roomId);
    if (typingInRoom && typingInRoom.has(client.userId)) {
      typingInRoom.delete(client.userId);
      client.to(data.roomId).emit('userStoppedTyping', { userId: client.userId });
    }
    
    // Notify others in the room
    client.to(data.roomId).emit('userLeftRoom', {
      userId: client.userId,
      roomId: data.roomId,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() createMessageDto: CreateMessageDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      client.emit('error', { message: 'User not authenticated' });
      return;
    }

    try {
      // Create the message using the existing service
      const message = await this.messageService.createMessage({
        ...createMessageDto,
        authorId: client.userId,
      });

      // Broadcast the new message to all connected clients
      this.server.emit('newMessage', {
        id: message.id,
        content: message.content,
        authorId: message.authorId,
        parentMessageId: message.parentMessageId,
        createdAt: message.createdAt,
        author: message.author,
      });

      // If it's a reply, notify the original message author
      if (message.parentMessageId) {
        const parentMessage = await this.messageService.getMessageById(message.parentMessageId);
        if (parentMessage && parentMessage.authorId !== client.userId) {
          this.notifyUser(parentMessage.authorId, 'messageReply', {
            messageId: message.id,
            content: message.content,
            authorId: client.userId,
            parentMessageId: message.parentMessageId,
          });
        }
      }

      this.logger.log(`Message sent by user ${client.userId}: ${message.content}`);
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { roomId?: string; isTyping: boolean },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) return;

    const roomId = data.roomId || 'general';
    
    if (!this.typingUsers.has(roomId)) {
      this.typingUsers.set(roomId, new Set());
    }
    
    const typingInRoom = this.typingUsers.get(roomId);
    
    if (data.isTyping) {
      typingInRoom.add(client.userId);
      client.to(roomId).emit('userTyping', { userId: client.userId });
    } else {
      typingInRoom.delete(client.userId);
      client.to(roomId).emit('userStoppedTyping', { userId: client.userId });
    }
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: AuthenticatedSocket) {
    const onlineUsers = Array.from(this.userSessions.keys());
    client.emit('onlineUsers', { users: onlineUsers });
  }

  // Helper methods
  private associateUserWithSocket(userId: string, socketId: string) {
    if (!this.userSessions.has(userId)) {
      this.userSessions.set(userId, new Set());
    }
    this.userSessions.get(userId).add(socketId);
    this.socketToUser.set(socketId, userId);
  }

  private removeUserSocket(userId: string, socketId: string) {
    const userSockets = this.userSessions.get(userId);
    if (userSockets) {
      userSockets.delete(socketId);
      if (userSockets.size === 0) {
        this.userSessions.delete(userId);
      }
    }
  }

  private notifyUser(userId: string, event: string, data: any) {
    const userSockets = this.userSessions.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.server.to(socketId).emit(event, data);
      });
    }
  }

  // Public methods for external services
  public broadcastMessageUpdate(messageId: string, content: string, authorId: string) {
    this.server.emit('messageUpdated', {
      messageId,
      content,
      authorId,
      updatedAt: new Date(),
    });
  }

  public broadcastMessageDelete(messageId: string, authorId: string) {
    this.server.emit('messageDeleted', {
      messageId,
      authorId,
      deletedAt: new Date(),
    });
  }
}