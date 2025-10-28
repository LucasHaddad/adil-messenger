import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from '@/controllers/auth.controller';
import { AuthService } from '@/services/auth.service';
import { LoginDto } from '@/dto/login.dto';
import { RegisterDto } from '@/dto/register.dto';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthResponse = {
    accessToken: 'jwt-token',
    csrfToken: 'csrf-token',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      fullName: 'Test User',
    },
    tokenType: 'Bearer',
    expiresIn: 3600,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            generateCsrfToken: jest.fn(),
            refreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      fullName: 'Test User',
    };

    it('should successfully register a user', async () => {
      authService.register.mockResolvedValue(mockAuthResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should propagate ConflictException from service', async () => {
      authService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login a user', async () => {
      const mockSession = {};
      authService.login.mockResolvedValue(mockAuthResponse);

      const result = await controller.login(loginDto, mockSession);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(mockSession).toEqual({ csrfToken: 'csrf-token' });
      expect(result).toEqual(mockAuthResponse);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const mockSession = {};
      authService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(controller.login(loginDto, mockSession)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockSession = { csrfToken: 'csrf-token' };
      const logoutResponse = { message: 'Successfully logged out' };

      authService.logout.mockResolvedValue(logoutResponse);

      const result = await controller.logout(mockRequest, mockSession);

      expect(authService.logout).toHaveBeenCalledWith('user-123');
      expect(mockSession.csrfToken).toBeNull();
      expect(result).toEqual(logoutResponse);
    });
  });

  describe('getCsrfToken', () => {
    it('should generate and return CSRF token', async () => {
      const mockSession = {};
      authService.generateCsrfToken.mockResolvedValue('new-csrf-token');

      const result = await controller.getCsrfToken(mockSession);

      expect(authService.generateCsrfToken).toHaveBeenCalled();
      expect(mockSession).toEqual({ csrfToken: 'new-csrf-token' });
      expect(result).toEqual({ csrfToken: 'new-csrf-token' });
    });
  });

  describe('getProfile', () => {
    it('should return user profile without sensitive data', async () => {
      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          fullName: 'Test User',
          password: 'hashedpassword',
          currentSessionId: 'session-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const result = await controller.getProfile(mockRequest);

      expect(result).toEqual({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        fullName: 'Test User',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
      expect(result).not.toHaveProperty('password');
      expect(result).not.toHaveProperty('currentSessionId');
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens for authenticated user', async () => {
      const mockRequest = { user: { id: 'user-123' } };
      const mockSession = {};

      authService.refreshToken.mockResolvedValue(mockAuthResponse);

      const result = await controller.refreshToken(mockRequest, mockSession);

      expect(authService.refreshToken).toHaveBeenCalledWith({ id: 'user-123' });
      expect(mockSession).toEqual({ csrfToken: 'csrf-token' });
      expect(result).toEqual(mockAuthResponse);
    });
  });
});
