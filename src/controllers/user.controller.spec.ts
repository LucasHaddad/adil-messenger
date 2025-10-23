import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from '@/controllers/user.controller';
import { UserService } from '@/services/user.service';
import { 
  testUser1, 
  testUser2,
  TEST_ERRORS,
  createMockUser,
} from '@/test/test-utils';
import { NotFoundException } from '@nestjs/common';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockUserService = {
      getUsers: jest.fn(),
      getUserById: jest.fn(),
      getUserByUsername: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users successfully', async () => {
      const users = [testUser1, testUser2];
      userService.getUsers.mockResolvedValue(users);

      const result = await controller.getUsers();

      expect(userService.getUsers).toHaveBeenCalledWith();
      expect(result).toEqual(users);
    });

    it('should return empty array when no users exist', async () => {
      userService.getUsers.mockResolvedValue([]);

      const result = await controller.getUsers();

      expect(result).toEqual([]);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      userService.getUsers.mockRejectedValue(error);

      await expect(controller.getUsers()).rejects.toThrow(error);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID successfully', async () => {
      userService.getUserById.mockResolvedValue(testUser1);

      const result = await controller.getUserById(testUser1.id);

      expect(userService.getUserById).toHaveBeenCalledWith(testUser1.id);
      expect(result).toEqual(testUser1);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException(TEST_ERRORS.USER_NOT_FOUND);
      userService.getUserById.mockRejectedValue(error);

      await expect(controller.getUserById('nonexistent-id')).rejects.toThrow(error);
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection lost');
      userService.getUserById.mockRejectedValue(dbError);

      await expect(controller.getUserById(testUser1.id)).rejects.toThrow(dbError);
    });
  });

  describe('getUserByUsername', () => {
    it('should return user by username successfully', async () => {
      userService.getUserByUsername.mockResolvedValue(testUser1);

      const result = await controller.getUserByUsername(testUser1.username);

      expect(userService.getUserByUsername).toHaveBeenCalledWith(testUser1.username);
      expect(result).toEqual(testUser1);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new NotFoundException(TEST_ERRORS.USER_NOT_FOUND);
      userService.getUserByUsername.mockRejectedValue(error);

      await expect(controller.getUserByUsername('nonexistent')).rejects.toThrow(error);
    });

    it('should handle special characters in username', async () => {
      const specialUsername = 'user@#$%';
      const userWithSpecialChars = createMockUser({ ...testUser1, username: specialUsername });
      userService.getUserByUsername.mockResolvedValue(userWithSpecialChars);

      const result = await controller.getUserByUsername(specialUsername);

      expect(userService.getUserByUsername).toHaveBeenCalledWith(specialUsername);
      expect(result).toEqual(userWithSpecialChars);
    });

    it('should handle empty username', async () => {
      const error = new NotFoundException(TEST_ERRORS.USER_NOT_FOUND);
      userService.getUserByUsername.mockRejectedValue(error);

      await expect(controller.getUserByUsername('')).rejects.toThrow(error);
      expect(userService.getUserByUsername).toHaveBeenCalledWith('');
    });
  });

  // Edge cases and error handling
  describe('Edge Cases', () => {
    it('should handle invalid UUID format in getUserById', async () => {
      // Note: In a real application, this would be caught by the ParseUUIDPipe
      // but here we're testing the controller logic directly
      const invalidId = 'invalid-uuid';
      const error = new Error('Invalid UUID format');
      userService.getUserById.mockRejectedValue(error);

      await expect(controller.getUserById(invalidId)).rejects.toThrow(error);
    });

    it('should handle null/undefined parameters gracefully', async () => {
      const error = new Error('Invalid parameter');
      userService.getUserById.mockRejectedValue(error);

      await expect(controller.getUserById(null as any)).rejects.toThrow(error);
      await expect(controller.getUserById(undefined as any)).rejects.toThrow(error);
    });

    it('should handle service timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      userService.getUsers.mockRejectedValue(timeoutError);

      await expect(controller.getUsers()).rejects.toThrow(timeoutError);
    });

    it('should handle very long usernames', async () => {
      const longUsername = 'a'.repeat(1000);
      const error = new NotFoundException(TEST_ERRORS.USER_NOT_FOUND);
      userService.getUserByUsername.mockRejectedValue(error);

      await expect(controller.getUserByUsername(longUsername)).rejects.toThrow(error);
      expect(userService.getUserByUsername).toHaveBeenCalledWith(longUsername);
    });

    it('should handle Unicode characters in username', async () => {
      const unicodeUsername = '用户名测试';
      const unicodeUser = createMockUser({ ...testUser1, username: unicodeUsername });
      userService.getUserByUsername.mockResolvedValue(unicodeUser);

      const result = await controller.getUserByUsername(unicodeUsername);

      expect(result.username).toBe(unicodeUsername);
    });
  });
});