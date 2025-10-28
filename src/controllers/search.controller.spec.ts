import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from '@/controllers/search.controller';
import { SearchService } from '@/services/search.service';
import { MessageSearchDto } from '@/dto/message-search.dto';
import { MessageSearchResponseDto } from '@/dto/message-search-response.dto';

describe('SearchController', () => {
  let controller: SearchController;
  let searchService: SearchService;

  const mockSearchService = {
    searchMessages: jest.fn(),
    getSuggestions: jest.fn(),
    getPopularSearchTerms: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get<SearchService>(SearchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('searchMessages', () => {
    it('should return search results', async () => {
      const searchDto: MessageSearchDto = {
        query: 'test message',
        limit: 10,
        offset: 0,
      };

      const expectedResult: MessageSearchResponseDto = {
        messages: [
          {
            id: '1',
            content: 'Test message content',
            createdAt: new Date(),
            updatedAt: new Date(),
            user: {
              id: '1',
              username: 'testuser',
              email: 'test@example.com',
            },
            attachmentUrl: null,
            attachmentName: null,
            attachmentType: null,
            attachmentSize: null,
          },
        ],
        total: 1,
        count: 1,
        offset: 0,
        limit: 10,
        hasMore: false,
      };

      mockSearchService.searchMessages.mockResolvedValue(expectedResult);

      const result = await controller.searchMessages(searchDto);

      expect(result).toEqual(expectedResult);
      expect(searchService.searchMessages).toHaveBeenCalledWith(searchDto);
    });

    it('should handle empty search results', async () => {
      const searchDto: MessageSearchDto = {
        query: 'nonexistent',
        limit: 10,
        offset: 0,
      };

      const expectedResult: MessageSearchResponseDto = {
        messages: [],
        total: 0,
        count: 0,
        offset: 0,
        limit: 10,
        hasMore: false,
      };

      mockSearchService.searchMessages.mockResolvedValue(expectedResult);

      const result = await controller.searchMessages(searchDto);

      expect(result).toEqual(expectedResult);
      expect(searchService.searchMessages).toHaveBeenCalledWith(searchDto);
    });
  });

  describe('getSuggestions', () => {
    it('should return search suggestions', async () => {
      const mockSuggestions = ['hello', 'help', 'helicopter'];
      mockSearchService.getSuggestions.mockResolvedValue(mockSuggestions);

      const result = await controller.getSuggestions('hel', '3');

      expect(result).toEqual({ suggestions: mockSuggestions });
      expect(searchService.getSuggestions).toHaveBeenCalledWith('hel', 3);
    });

    it('should use default limit when not provided', async () => {
      const mockSuggestions = ['hello', 'help'];
      mockSearchService.getSuggestions.mockResolvedValue(mockSuggestions);

      const result = await controller.getSuggestions('hel');

      expect(result).toEqual({ suggestions: mockSuggestions });
      expect(searchService.getSuggestions).toHaveBeenCalledWith('hel', 5);
    });

    it('should handle empty suggestions', async () => {
      mockSearchService.getSuggestions.mockResolvedValue([]);

      const result = await controller.getSuggestions('xyz');

      expect(result).toEqual({ suggestions: [] });
      expect(searchService.getSuggestions).toHaveBeenCalledWith('xyz', 5);
    });
  });

  describe('getPopularSearchTerms', () => {
    it('should return popular search terms', async () => {
      const mockTerms = ['hello', 'meeting', 'project', 'update'];
      mockSearchService.getPopularSearchTerms.mockResolvedValue(mockTerms);

      const result = await controller.getPopularSearchTerms('4');

      expect(result).toEqual({ terms: mockTerms });
      expect(searchService.getPopularSearchTerms).toHaveBeenCalledWith(4);
    });

    it('should use default limit when not provided', async () => {
      const mockTerms = ['hello', 'meeting', 'project'];
      mockSearchService.getPopularSearchTerms.mockResolvedValue(mockTerms);

      const result = await controller.getPopularSearchTerms();

      expect(result).toEqual({ terms: mockTerms });
      expect(searchService.getPopularSearchTerms).toHaveBeenCalledWith(10);
    });
  });
});
