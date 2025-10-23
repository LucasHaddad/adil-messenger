import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/filters/global-exception.filter';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply the same configuration as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.setGlobalPrefix('api/v1');

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/api/v1/users (POST)', () => {
    it('should create a new user', () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/api/v1/users')
        .send(createUserDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.username).toBe(createUserDto.username);
          expect(res.body.email).toBe(createUserDto.email);
          expect(res.body.fullName).toBe(createUserDto.fullName);
        });
    });

    it('should validate required fields', () => {
      const invalidUserDto = {
        username: '',
        // Missing email and fullName
      };

      return request(app.getHttpServer())
        .post('/api/v1/users')
        .send(invalidUserDto)
        .expect(400);
    });

    it('should validate email format', () => {
      const invalidEmailDto = {
        username: 'testuser',
        email: 'invalid-email',
        fullName: 'Test User',
      };

      return request(app.getHttpServer())
        .post('/api/v1/users')
        .send(invalidEmailDto)
        .expect(400);
    });
  });

  describe('/api/v1/users (GET)', () => {
    it('should return all users', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('/api/v1/messages (POST)', () => {
    let userId: string;

    beforeEach(async () => {
      // Create a user first
      const createUserDto = {
        username: `user_${Date.now()}`,
        email: `user_${Date.now()}@example.com`,
        fullName: 'Test User',
      };

      const userResponse = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(createUserDto);

      userId = userResponse.body.id;
    });

    it('should create a new message', () => {
      const createMessageDto = {
        content: 'Test message content',
        authorId: userId,
      };

      return request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(createMessageDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.content).toBe(createMessageDto.content);
          expect(res.body.authorId).toBe(createMessageDto.authorId);
          expect(res.body.isEdited).toBe(false);
          expect(res.body.isDeleted).toBe(false);
        });
    });

    it('should validate message content is not empty', () => {
      const invalidMessageDto = {
        content: '',
        authorId: userId,
      };

      return request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(invalidMessageDto)
        .expect(400);
    });

    it('should validate author exists', () => {
      const invalidAuthorDto = {
        content: 'Test message',
        authorId: '00000000-0000-0000-0000-000000000000',
      };

      return request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(invalidAuthorDto)
        .expect(404);
    });
  });

  describe('/api/v1/messages (GET)', () => {
    it('should return paginated messages', () => {
      return request(app.getHttpServer())
        .get('/api/v1/messages')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('messages');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('page');
          expect(res.body).toHaveProperty('limit');
          expect(Array.isArray(res.body.messages)).toBe(true);
        });
    });

    it('should handle pagination parameters', () => {
      return request(app.getHttpServer())
        .get('/api/v1/messages?page=2&limit=5')
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(2);
          expect(res.body.limit).toBe(5);
        });
    });
  });

  describe('Message workflow (e2e)', () => {
    let userId: string;
    let messageId: string;

    beforeEach(async () => {
      // Create a user
      const createUserDto = {
        username: `workflow_user_${Date.now()}`,
        email: `workflow_${Date.now()}@example.com`,
        fullName: 'Workflow Test User',
      };

      const userResponse = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(createUserDto);

      userId = userResponse.body.id;

      // Create a message
      const createMessageDto = {
        content: 'Original message content',
        authorId: userId,
      };

      const messageResponse = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(createMessageDto);

      messageId = messageResponse.body.id;
    });

    it('should complete full message lifecycle', async () => {
      // 1. Get the message
      await request(app.getHttpServer())
        .get(`/api/v1/messages/${messageId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(messageId);
          expect(res.body.content).toBe('Original message content');
        });

      // 2. Update the message
      const updateDto = {
        content: 'Updated message content',
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/messages/${messageId}?authorId=${userId}`)
        .send(updateDto)
        .expect(200)
        .expect((res) => {
          expect(res.body.content).toBe('Updated message content');
          expect(res.body.isEdited).toBe(true);
        });

      // 3. Create a reply
      const replyDto = {
        content: 'This is a reply',
        authorId: userId,
        parentMessageId: messageId,
      };

      const replyResponse = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(replyDto)
        .expect(201);

      const replyId = replyResponse.body.id;

      // 4. Get replies
      await request(app.getHttpServer())
        .get(`/api/v1/messages/${messageId}/replies`)
        .expect(200)
        .expect((res) => {
          expect(res.body.replies).toHaveLength(1);
          expect(res.body.replies[0].id).toBe(replyId);
        });

      // 5. Get conversation thread
      await request(app.getHttpServer())
        .get(`/api/v1/messages/${messageId}/thread`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(messageId);
          expect(res.body.replies).toHaveLength(1);
        });

      // 6. Delete the reply
      await request(app.getHttpServer())
        .delete(`/api/v1/messages/${replyId}?authorId=${userId}`)
        .expect(204);

      // 7. Delete the original message
      await request(app.getHttpServer())
        .delete(`/api/v1/messages/${messageId}?authorId=${userId}`)
        .expect(204);

      // 8. Verify message is deleted (should return 404)
      await request(app.getHttpServer())
        .get(`/api/v1/messages/${messageId}`)
        .expect(404);
    });

    it('should prevent unauthorized operations', async () => {
      // Create another user
      const anotherUserDto = {
        username: `another_user_${Date.now()}`,
        email: `another_${Date.now()}@example.com`,
        fullName: 'Another User',
      };

      const anotherUserResponse = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(anotherUserDto);

      const anotherUserId = anotherUserResponse.body.id;

      // Try to update message as different user
      const updateDto = {
        content: 'Unauthorized update',
      };

      await request(app.getHttpServer())
        .patch(`/api/v1/messages/${messageId}?authorId=${anotherUserId}`)
        .send(updateDto)
        .expect(403);

      // Try to delete message as different user
      await request(app.getHttpServer())
        .delete(`/api/v1/messages/${messageId}?authorId=${anotherUserId}`)
        .expect(403);
    });
  });

  describe('Error handling (e2e)', () => {
    it('should handle non-existent resources', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(app.getHttpServer())
        .get(`/api/v1/messages/${nonExistentId}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/api/v1/users/${nonExistentId}`)
        .expect(404);
    });

    it('should handle invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/messages/invalid-uuid')
        .expect(400);

      await request(app.getHttpServer())
        .get('/api/v1/users/invalid-uuid')
        .expect(400);
    });

    it('should handle malformed JSON', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/users')
        .send('{ malformed json }')
        .expect(400);
    });
  });
});