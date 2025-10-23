import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '@/auth/auth.service';
import { User } from '@/entities/user.entity';
import { LoginDto } from '@/dto/login.dto';
import { RegisterDto } from '@/dto/register.dto';
import { createMockUser } from '@/test/test-utils';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = createMockUser({
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User',
    password: 'hashedpassword',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user if credentials are valid', async () => {
      const mockUserWithMethods = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(true),
      };
      userRepository.findOne.mockResolvedValue(mockUserWithMethods as any);

      const result = await service.validateUser('test@example.com', 'password');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(mockUserWithMethods.validatePassword).toHaveBeenCalledWith('password');
      expect(result).toEqual(mockUserWithMethods);
    });

    it('should return null if user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null if password is invalid', async () => {
      const mockUserWithMethods = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(false),
      };
      userRepository.findOne.mockResolvedValue(mockUserWithMethods as any);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'new@example.com',
      username: 'newuser',
      password: 'password123',
      fullName: 'New User',
    };

    it('should successfully register a new user', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(mockUser as any);
      userRepository.save.mockResolvedValue(mockUser as any);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.register(registerDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [{ email: registerDto.email }, { username: registerDto.username }],
      });
      expect(userRepository.create).toHaveBeenCalledWith({
        email: registerDto.email,
        username: registerDto.username,
        fullName: registerDto.fullName,
        password: registerDto.password,
      });
      expect(userRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual({
        accessToken: 'jwt-token',
        csrfToken: expect.any(String),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullName: mockUser.fullName,
        },
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      const existingUser = createMockUser({ email: registerDto.email });
      userRepository.findOne.mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Email already registered',
      );
    });

    it('should throw ConflictException if username already exists', async () => {
      const existingUser = createMockUser({ username: registerDto.username });
      userRepository.findOne.mockResolvedValue(existingUser as any);

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        'Username already taken',
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      const mockUserWithMethods = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(true),
      };
      userRepository.findOne.mockResolvedValue(mockUserWithMethods as any);
      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      jwtService.sign.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);

      expect(result).toEqual({
        accessToken: 'jwt-token',
        csrfToken: expect.any(String),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullName: mockUser.fullName,
        },
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      const mockUserWithMethods = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(false),
      };
      userRepository.findOne.mockResolvedValue(mockUserWithMethods as any);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 } as any);

      const result = await service.logout('user-123');

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        currentSessionId: null,
      });
      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });

  describe('generateCsrfToken', () => {
    it('should generate a CSRF token', async () => {
      const token = await service.generateCsrfToken();

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens for user', async () => {
      userRepository.update.mockResolvedValue({ affected: 1 } as any);
      jwtService.sign.mockReturnValue('new-jwt-token');

      const result = await service.refreshToken(mockUser as any);

      expect(result).toEqual({
        accessToken: 'new-jwt-token',
        csrfToken: expect.any(String),
        user: {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          fullName: mockUser.fullName,
        },
        tokenType: 'Bearer',
        expiresIn: 3600,
      });
    });
  });
});