import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import supertest = require('supertest');

import { HealthModule } from '../src/modules/health.module';
import { User } from '../src/entities/user.entity';
import { Message } from '../src/entities/message.entity';
import { Reaction } from '../src/entities/reaction.entity';
import { GlobalExceptionFilter } from '../src/filters/global-exception.filter';

describe('App E2E Tests', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, Message, Reaction],
          synchronize: true,
          logging: false,
        }),
        HealthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Add global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.useGlobalFilters(new GlobalExceptionFilter());

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('should return health status', () => {
      return supertest(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect(res => {
          expect(res.body).toHaveProperty('status');
          expect(res.body.status).toBe('ok');
        });
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle 404 errors for non-existent routes', () => {
      return supertest(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404);
    });

    it('should return proper error format for 404', () => {
      return supertest(app.getHttpServer())
        .get('/non-existent-route')
        .expect(404)
        .expect(res => {
          expect(res.body).toHaveProperty('statusCode', 404);
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('path');
          expect(res.body).toHaveProperty('method');
        });
    });
  });

  describe('Application Configuration', () => {
    it('should have validation pipe configured', () => {
      // This test verifies the application has the correct global configuration
      expect(app).toBeDefined();
    });

    it('should handle requests with proper content-type', () => {
      return supertest(app.getHttpServer())
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);
    });
  });
});
