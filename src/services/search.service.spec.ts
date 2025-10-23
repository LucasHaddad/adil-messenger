import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SearchService } from "@/services/search.service";
import { Message } from "@/entities/message.entity";
import { MessageSearchDto } from "@/dto/message-search.dto";

describe("SearchService", () => {
  let service: SearchService;
  let messageRepository: Repository<Message>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    clone: jest.fn(),
    getCount: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
  };

  const mockMessageRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    query: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Message),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    messageRepository = module.get<Repository<Message>>(
      getRepositoryToken(Message),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation
    mockQueryBuilder.clone.mockReturnValue({
      ...mockQueryBuilder,
      getCount: jest.fn(),
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("searchMessages", () => {
    it("should search messages with query", async () => {
      const searchDto: MessageSearchDto = {
        query: "hello world",
        limit: 10,
        offset: 0,
      };

      const mockMessages = [
        {
          id: "1",
          content: "Hello world",
          createdAt: new Date(),
          user: { id: "1", username: "user1", email: "user1@example.com" },
        },
      ];

      // Set up the clone mock to return a separate object with its own getCount
      const clonedQueryBuilder = {
        ...mockQueryBuilder,
        getCount: jest.fn().mockResolvedValue(1),
      };
      mockQueryBuilder.clone.mockReturnValue(clonedQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue(mockMessages);

      const result = await service.searchMessages(searchDto);

      expect(result).toEqual({
        messages: mockMessages,
        total: 1,
        count: 1,
        offset: 0,
        limit: 10,
        hasMore: false,
      });

      expect(mockMessageRepository.createQueryBuilder).toHaveBeenCalledWith(
        "message",
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        `to_tsvector('english', message.content) @@ plainto_tsquery('english', :query)`,
        { query: "hello world" },
      );
    });

    it("should search messages with user filter", async () => {
      const searchDto: MessageSearchDto = {
        userId: "user-123",
        limit: 10,
        offset: 0,
      };

      const clonedQueryBuilder = {
        ...mockQueryBuilder,
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockQueryBuilder.clone.mockReturnValue(clonedQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchMessages(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "message.userId = :userId",
        {
          userId: "user-123",
        },
      );
    });

    it("should search messages with date range filter", async () => {
      const searchDto: MessageSearchDto = {
        dateFrom: "2023-01-01T00:00:00.000Z",
        dateTo: "2023-12-31T23:59:59.999Z",
        limit: 10,
        offset: 0,
      };

      const clonedQueryBuilder = {
        ...mockQueryBuilder,
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockQueryBuilder.clone.mockReturnValue(clonedQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchMessages(searchDto);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "message.createdAt >= :dateFrom",
        {
          dateFrom: new Date("2023-01-01T00:00:00.000Z"),
        },
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        "message.createdAt <= :dateTo",
        {
          dateTo: new Date("2023-12-31T23:59:59.999Z"),
        },
      );
    });

    it("should apply pagination correctly", async () => {
      const searchDto: MessageSearchDto = {
        limit: 5,
        offset: 10,
      };

      const clonedQueryBuilder = {
        ...mockQueryBuilder,
        getCount: jest.fn().mockResolvedValue(25),
      };
      mockQueryBuilder.clone.mockReturnValue(clonedQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.searchMessages(searchDto);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(10);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(result.hasMore).toBe(true);
    });

    it("should order by relevance when query is provided", async () => {
      const searchDto: MessageSearchDto = {
        query: "test",
        limit: 10,
        offset: 0,
      };

      const clonedQueryBuilder = {
        ...mockQueryBuilder,
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockQueryBuilder.clone.mockReturnValue(clonedQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchMessages(searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        `ts_rank(to_tsvector('english', message.content), plainto_tsquery('english', :rankQuery))`,
        "DESC",
      );
      expect(mockQueryBuilder.addOrderBy).toHaveBeenCalledWith(
        "message.createdAt",
        "DESC",
      );
      expect(mockQueryBuilder.setParameter).toHaveBeenCalledWith(
        "rankQuery",
        "test",
      );
    });

    it("should order by date when no query is provided", async () => {
      const searchDto: MessageSearchDto = {
        limit: 10,
        offset: 0,
      };

      const clonedQueryBuilder = {
        ...mockQueryBuilder,
        getCount: jest.fn().mockResolvedValue(0),
      };
      mockQueryBuilder.clone.mockReturnValue(clonedQueryBuilder);
      mockQueryBuilder.getMany.mockResolvedValue([]);

      await service.searchMessages(searchDto);

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        "message.createdAt",
        "DESC",
      );
    });
  });

  describe("getPopularSearchTerms", () => {
    it("should return popular search terms", async () => {
      const result = await service.getPopularSearchTerms(5);

      expect(result).toEqual(["hello", "meeting", "project", "update", "help"]);
      expect(result).toHaveLength(5);
    });

    it("should return default number of terms when no limit specified", async () => {
      const result = await service.getPopularSearchTerms();

      expect(result).toHaveLength(10);
    });
  });

  describe("getSuggestions", () => {
    it("should return suggestions for partial query", async () => {
      const mockSuggestions = [
        { word: "hello" },
        { word: "help" },
        { word: "helicopter" },
      ];

      mockQueryBuilder.getRawMany.mockResolvedValue(mockSuggestions);

      const result = await service.getSuggestions("hel", 3);

      expect(result).toEqual(["hello", "help", "helicopter"]);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        "DISTINCT regexp_split_to_table(message.content, '\\s+') AS word",
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        "regexp_split_to_table(message.content, '\\s+') ILIKE :query",
        { query: "hel%" },
      );
    });

    it("should return empty array for short queries", async () => {
      const result = await service.getSuggestions("h");

      expect(result).toEqual([]);
    });

    it("should return empty array for empty queries", async () => {
      const result = await service.getSuggestions("");

      expect(result).toEqual([]);
    });
  });

  describe("createSearchIndex", () => {
    it("should create search index", async () => {
      await service.createSearchIndex();

      expect(mockMessageRepository.query).toHaveBeenCalledWith(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_content_fts 
      ON messages USING gin(to_tsvector('english', content));
    `);
    });
  });

  describe("dropSearchIndex", () => {
    it("should drop search index", async () => {
      await service.dropSearchIndex();

      expect(mockMessageRepository.query).toHaveBeenCalledWith(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_message_content_fts;
    `);
    });
  });
});
