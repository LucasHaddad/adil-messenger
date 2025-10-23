import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from '../src/filters/global-exception.filter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

describe('App E2E Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          logging: false,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    
    // Apply the same configuration as in main.ts to test pipes and filters
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

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  describe('Validation Pipe Tests', () => {
    it('should validate user creation with correct data', async () => {
      const createUserDto = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(createUserDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.username).toBe(createUserDto.username);
      expect(response.body.email).toBe(createUserDto.email);
    });

    it('should reject user creation with invalid email format', async () => {
      const invalidUserDto = {
        username: 'testuser2',
        email: 'invalid-email',
        fullName: 'Test User',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(invalidUserDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation failed');
    });

    it('should reject user creation with missing required fields', async () => {
      const incompleteUserDto = {
        username: 'testuser3',
        // missing email and fullName
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(incompleteUserDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation failed');
    });

    it('should reject user creation with forbidden non-whitelisted properties', async () => {
      const userWithExtraProps = {
        username: 'testuser4',
        email: 'test4@example.com',
        fullName: 'Test User 4',
        hackerField: 'malicious data',
        anotherBadField: 'more bad data',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(userWithExtraProps)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should validate message creation with correct data', async () => {
      // First create a user
      const user = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'messageuser',
          email: 'message@example.com',
          fullName: 'Message User',
        })
        .expect(201);

      const createMessageDto = {
        content: 'This is a test message',
        authorId: user.body.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(createMessageDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(createMessageDto.content);
    });

    it('should reject message creation with empty content', async () => {
      const user = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'messageuser2',
          email: 'message2@example.com',
          fullName: 'Message User 2',
        })
        .expect(201);

      const invalidMessageDto = {
        content: '',
        authorId: user.body.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(invalidMessageDto)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Validation failed');
    });
  });

  describe('Global Exception Filter Tests', () => {
    it('should handle 404 errors with proper format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/nonexistent-endpoint')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('path');
    });

    it('should handle user not found errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/99999999-9999-9999-9999-999999999999')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('not found');
    });

    it('should handle message not found errors', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages/99999999-9999-9999-9999-999999999999')
        .expect(404);

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
    });

    it('should handle authorization errors when deleting others messages', async () => {
      // Create two users
      const user1 = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'user1',
          email: 'user1@example.com',
          fullName: 'User One',
        })
        .expect(201);

      const user2 = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'user2',
          email: 'user2@example.com',
          fullName: 'User Two',
        })
        .expect(201);

      // User1 creates a message
      const message = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send({
          content: 'User1 message',
          authorId: user1.body.id,
        })
        .expect(201);

      // User2 tries to delete User1's message
      const response = await request(app.getHttpServer())
        .delete(`/api/v1/messages/${message.body.id}`)
        .send({ userId: user2.body.id })
        .expect(403);

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Module Integration Tests', () => {
    it('should properly wire UserModule dependencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/users')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should properly wire MessageModule dependencies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/messages')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should handle user and message relationship correctly', async () => {
      // Create a user
      const user = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'relationuser',
          email: 'relation@example.com',
          fullName: 'Relation User',
        })
        .expect(201);

      // Create a message for the user
      const message = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send({
          content: 'Test relationship message',
          authorId: user.body.id,
        })
        .expect(201);

      // Verify the message has the correct author
      const messageResponse = await request(app.getHttpServer())
        .get(`/api/v1/messages/${message.body.id}`)
        .expect(200);

      expect(messageResponse.body.author.id).toBe(user.body.id);
    });

    it('should handle message replies correctly', async () => {
      // Create a user
      const user = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'replyuser',
          email: 'reply@example.com',
          fullName: 'Reply User',
        })
        .expect(201);

      // Create a parent message
      const parentMessage = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send({
          content: 'Parent message',
          authorId: user.body.id,
        })
        .expect(201);

      // Create a reply
      const reply = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send({
          content: 'Reply message',
          authorId: user.body.id,
          parentMessageId: parentMessage.body.id,
        })
        .expect(201);

      // Get replies for the parent message
      const repliesResponse = await request(app.getHttpServer())
        .get(`/api/v1/messages/${parentMessage.body.id}/replies`)
        .expect(200);

      expect(Array.isArray(repliesResponse.body)).toBe(true);
      expect(repliesResponse.body.length).toBe(1);
      expect(repliesResponse.body[0].id).toBe(reply.body.id);
    });
  });

  describe('Data Transformation Tests', () => {
    it('should transform user input correctly', async () => {
      const userInput = {
        username: '  spaceduser  ', // with spaces
        email: '  UPPER@EXAMPLE.COM  ', // uppercase with spaces
        fullName: 'spaced user',
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send(userInput)
        .expect(201);

      // The response should have transformed data
      expect(response.body.username).toBe('spaceduser'); // trimmed
      expect(response.body.email).toBe('upper@example.com'); // lowercase
    });

    it('should handle message content transformation', async () => {
      const user = await request(app.getHttpServer())
        .post('/api/v1/users')
        .send({
          username: 'transformuser',
          email: 'transform@example.com',
          fullName: 'Transform User',
        })
        .expect(201);

      const messageInput = {
        content: '  This is a message with extra spaces  ',
        authorId: user.body.id,
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/messages')
        .send(messageInput)
        .expect(201);

      expect(response.body.content).toBe('This is a message with extra spaces');
    });
  });
});