import { Repository } from 'typeorm';
import { User, Message } from '@/entities';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  password: 'hashedpassword',
  currentSessionId: null,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  messages: [],
  hashPassword: async function () {
    /* mock */
  },
  validatePassword: async function () {
    return true;
  },
  ...overrides,
});

export const createMockMessage = (
  overrides: Partial<Message> = {},
): Message => ({
  id: 'message-123',
  content: 'Test message content',
  isEdited: false,
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  authorId: 'user-123',
  parentMessageId: null,
  author: createMockUser(),
  parentMessage: null,
  replies: [],
  replyCount: 0,
  ...overrides,
});

export const createMockRepository = <T = any>(): Partial<Repository<T>> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  count: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  remove: jest.fn(),
  createQueryBuilder: jest.fn(),
});

export const createTestingModuleWithMocks = () => {
  const mockUserRepository = createMockRepository<User>();
  const mockMessageRepository = createMockRepository<Message>();

  return {
    mockUserRepository,
    mockMessageRepository,
    getTestingModule: () => ({
      get: jest.fn(token => {
        if (token === 'UserRepository') return mockUserRepository;
        if (token === 'MessageRepository') return mockMessageRepository;
        return null;
      }),
    }),
  };
};

export const testUser1 = createMockUser({
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
  fullName: 'Alice Johnson',
});

export const testUser2 = createMockUser({
  id: 'user-2',
  username: 'bob',
  email: 'bob@example.com',
  fullName: 'Bob Smith',
});

export const testMessage1 = createMockMessage({
  id: 'message-1',
  content: 'Hello world!',
  authorId: testUser1.id,
  author: testUser1,
});

export const testMessage2 = createMockMessage({
  id: 'message-2',
  content: 'This is a reply',
  authorId: testUser2.id,
  author: testUser2,
  parentMessageId: testMessage1.id,
});

export const TEST_ERRORS = {
  USER_NOT_FOUND: 'User not found',
  MESSAGE_NOT_FOUND: 'Message not found',
  USERNAME_EXISTS: 'Username already exists',
  EMAIL_EXISTS: 'Email already exists',
  FORBIDDEN_EDIT: 'You can only edit your own messages',
  FORBIDDEN_DELETE: 'You can only delete your own messages',
  PARENT_NOT_FOUND: 'Parent message not found or has been deleted',
} as const;
