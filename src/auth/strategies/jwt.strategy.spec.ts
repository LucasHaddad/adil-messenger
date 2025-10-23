import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { User } from '@/entities/user.entity';
import { createMockUser } from '@/test/test-utils';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockUser = createMockUser({
    id: 'user-123',
    currentSessionId: 'session-123',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should return user if valid token and session', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        sessionId: 'session-123',
      };

      userRepository.findOne.mockResolvedValue(mockUser as any);

      const result = await strategy.validate(payload);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'user-123',
          currentSessionId: 'session-123',
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = {
        sub: 'nonexistent-user',
        email: 'test@example.com',
        sessionId: 'session-123',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(payload)).rejects.toThrow(
        'Invalid token or session expired',
      );
    });

    it('should throw UnauthorizedException if session mismatch', async () => {
      const payload = {
        sub: 'user-123',
        email: 'test@example.com',
        sessionId: 'wrong-session',
      };

      userRepository.findOne.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});