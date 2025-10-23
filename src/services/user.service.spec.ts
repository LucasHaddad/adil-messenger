import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from '../entities';
import { CreateUserDto } from '../dto';
import { 
  createMockRepository, 
  createMockUser, 
  testUser1, 
  testUser2,
  TEST_ERRORS 
} from '../test/test-utils';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const mockUserRepository = createMockRepository<User>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      username: 'newuser',
      email: 'newuser@example.com',
      fullName: 'New User',
    };

    it('should create a new user successfully', async () => {
      const expectedUser = createMockUser(createUserDto);

      userRepository.findOne.mockResolvedValue(null); // no existing user
      userRepository.create.mockReturnValue(expectedUser);
      userRepository.save.mockResolvedValue(expectedUser);

      const result = await service.createUser(createUserDto);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      });
      expect(userRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(userRepository.save).toHaveBeenCalledWith(expectedUser);
      expect(result).toEqual(expectedUser);
    });

    it('should throw ConflictException when username already exists', async () => {
      const existingUser = createMockUser({ username: createUserDto.username });
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new ConflictException(TEST_ERRORS.USERNAME_EXISTS)
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      });
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = createMockUser({ email: createUserDto.email });
      userRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.createUser(createUserDto)).rejects.toThrow(
        new ConflictException(TEST_ERRORS.EMAIL_EXISTS)
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: [
          { username: createUserDto.username },
          { email: createUserDto.email },
        ],
      });
      expect(userRepository.create).not.toHaveBeenCalled();
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('should handle repository create error', async () => {
      const dbError = new Error('Database error');
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation(() => {
        throw dbError;
      });

      await expect(service.createUser(createUserDto)).rejects.toThrow(dbError);
    });

    it('should handle repository save error', async () => {
      const expectedUser = createMockUser(createUserDto);
      const dbError = new Error('Save failed');
      
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(expectedUser);
      userRepository.save.mockRejectedValue(dbError);

      await expect(service.createUser(createUserDto)).rejects.toThrow(dbError);
    });
  });

  describe('getUsers', () => {
    it('should return all users ordered by creation date', async () => {
      const users = [testUser1, testUser2];
      userRepository.find.mockResolvedValue(users);

      const result = await service.getUsers();

      expect(userRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(users);
    });

    it('should return empty array when no users exist', async () => {
      userRepository.find.mockResolvedValue([]);

      const result = await service.getUsers();

      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      userRepository.find.mockRejectedValue(dbError);

      await expect(service.getUsers()).rejects.toThrow(dbError);
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(testUser1);

      const result = await service.getUserById(testUser1.id);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: testUser1.id },
      });
      expect(result).toEqual(testUser1);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById('nonexistent-id')).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.USER_NOT_FOUND)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      userRepository.findOne.mockRejectedValue(dbError);

      await expect(service.getUserById(testUser1.id)).rejects.toThrow(dbError);
    });
  });

  describe('getUserByUsername', () => {
    it('should return user when found', async () => {
      userRepository.findOne.mockResolvedValue(testUser1);

      const result = await service.getUserByUsername(testUser1.username);

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: testUser1.username },
      });
      expect(result).toEqual(testUser1);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserByUsername('nonexistent')).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.USER_NOT_FOUND)
      );
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database error');
      userRepository.findOne.mockRejectedValue(dbError);

      await expect(service.getUserByUsername(testUser1.username)).rejects.toThrow(dbError);
    });

    it('should handle empty username', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserByUsername('')).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.USER_NOT_FOUND)
      );

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { username: '' },
      });
    });

    it('should handle special characters in username', async () => {
      const specialUsername = 'user@#$%';
      const userWithSpecialChars = createMockUser({ username: specialUsername });
      userRepository.findOne.mockResolvedValue(userWithSpecialChars);

      const result = await service.getUserByUsername(specialUsername);

      expect(result).toEqual(userWithSpecialChars);
    });
  });

  // Edge cases and integration scenarios
  describe('Edge Cases', () => {
    it('should handle null values gracefully', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(null as any)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.USER_NOT_FOUND)
      );
    });

    it('should handle undefined values gracefully', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserById(undefined as any)).rejects.toThrow(
        new NotFoundException(TEST_ERRORS.USER_NOT_FOUND)
      );
    });

    it('should create user with minimal valid data', async () => {
      const minimalUser: CreateUserDto = {
        username: 'a',
        email: 'a@b.c',
        fullName: 'A',
      };
      const expectedUser = createMockUser(minimalUser);

      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockReturnValue(expectedUser);
      userRepository.save.mockResolvedValue(expectedUser);

      const result = await service.createUser(minimalUser);

      expect(result).toEqual(expectedUser);
    });
  });
});