import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from '@/services/health.service';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '@/entities/user.entity';
import { Message } from '@/entities/message.entity';

describe('HealthController', () => {
  let controller: HealthController;

  const mockUserRepository = {
    count: jest.fn().mockResolvedValue(5),
    query: jest.fn().mockResolvedValue([]),
  };

  const mockMessageRepository = {
    count: jest.fn().mockResolvedValue(25),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        NODE_ENV: 'test',
        npm_package_version: '1.0.0',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return basic health status', async () => {
      const result = await controller.healthCheck();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result.status).toBe('ok');
    });
  });

  describe('detailedHealthCheck', () => {
    it('should return detailed health with metrics', async () => {
      const result = await controller.detailedHealthCheck();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('metrics');

      // Test that our implemented metrics work
      expect(result.metrics).toHaveProperty('totalUsers');
      expect(result.metrics).toHaveProperty('totalMessages');
      expect(result.metrics).toHaveProperty('activeConnections');

      expect(result.metrics.totalUsers).toBe(5);
      expect(result.metrics.totalMessages).toBe(25);
      expect(typeof result.metrics.activeConnections).toBe('number');
    });

    it('should track active connections correctly', async () => {
      // Simulate adding connections
      HealthService.addConnection('socket-1');
      HealthService.addConnection('socket-2');

      const result = await controller.detailedHealthCheck();
      expect(result.metrics.activeConnections).toBe(2);

      // Remove one connection
      HealthService.removeConnection('socket-1');
      
      const result2 = await controller.detailedHealthCheck();
      expect(result2.metrics.activeConnections).toBe(1);

      // Clean up
      HealthService.removeConnection('socket-2');
    });
  });

  describe('readinessCheck', () => {
    it('should return readiness status', async () => {
      const result = await controller.readinessCheck();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('ready');
    });
  });

  describe('livenessCheck', () => {
    it('should return liveness status', async () => {
      const result = await controller.livenessCheck();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('alive');
      expect(result.alive).toBe(true);
    });
  });
});