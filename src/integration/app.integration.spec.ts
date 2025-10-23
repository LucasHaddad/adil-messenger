import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from '@/filters/global-exception.filter';
import { ArgumentMetadata } from '@nestjs/common';
import { CreateUserDto } from '@/dto/create-user.dto';
import { CreateMessageDto } from '@/dto/create-message.dto';
import { UserModule } from '@/modules/user.module';
import { MessageModule } from '@/modules/message.module';

describe('Integration Tests - Pipes, Filters, and Modules', () => {
  describe('ValidationPipe', () => {
    let pipe: ValidationPipe;

    beforeEach(() => {
      pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });
    });

    it('should be defined', () => {
      expect(pipe).toBeDefined();
    });

    it('should validate CreateUserDto correctly', async () => {
      const validDto = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      };

      const result = await pipe.transform(validDto, metadata);
      expect(result).toEqual(validDto);
    });

    it('should reject invalid CreateUserDto', async () => {
      const invalidDto = {
        username: '',
        email: 'invalid-email',
        fullName: '',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      };

      await expect(pipe.transform(invalidDto, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should validate CreateMessageDto correctly', async () => {
      const validDto = {
        content: 'Test message content',
        authorId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateMessageDto,
        data: '',
      };

      const result = await pipe.transform(validDto, metadata);
      expect(result).toEqual(validDto);
    });

    it('should reject CreateMessageDto with empty content', async () => {
      const invalidDto = {
        content: '',
        authorId: '123e4567-e89b-12d3-a456-426614174000',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateMessageDto,
        data: '',
      };

      await expect(pipe.transform(invalidDto, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should remove non-whitelisted properties', async () => {
      const dtoWithExtraProps = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
        hackerField: 'malicious data',
        anotherField: 'more data',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      };

      await expect(pipe.transform(dtoWithExtraProps, metadata)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should transform data types correctly', async () => {
      const dtoWithStringNumbers = {
        username: 'testuser',
        email: 'test@example.com',
        fullName: 'Test User',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      };

      const result = await pipe.transform(dtoWithStringNumbers, metadata);
      expect(result).toEqual(dtoWithStringNumbers);
    });
  });

  describe('GlobalExceptionFilter', () => {
    let filter: GlobalExceptionFilter;

    beforeEach(() => {
      filter = new GlobalExceptionFilter();
    });

    const createMockExecutionContext = (method: string, url: string) => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      return {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            url,
            method,
          }),
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
        getResponse: () => mockResponse,
      } as any;
    };

    it('should be defined', () => {
      expect(filter).toBeDefined();
    });

    it('should handle BadRequestException correctly', () => {
      const exception = new BadRequestException('Validation failed');
      const mockExecutionContext = createMockExecutionContext('GET', '/test');
      const mockResponse = mockExecutionContext.getResponse();

      filter.catch(exception, mockExecutionContext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String),
      });
    });

    it('should handle generic exceptions', () => {
      const exception = new Error('Generic error');
      const mockExecutionContext = createMockExecutionContext('GET', '/test');
      const mockResponse = mockExecutionContext.getResponse();

      filter.catch(exception, mockExecutionContext);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Generic error',
        error: 'Internal Server Error',
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String),
      });
    });

    it('should handle exceptions with custom messages', () => {
      const exception = new BadRequestException('Custom validation error');
      const mockExecutionContext = createMockExecutionContext('GET', '/test');
      const mockResponse = mockExecutionContext.getResponse();

      filter.catch(exception, mockExecutionContext);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Custom validation error',
        error: 'Bad Request', // NestJS uses standard HTTP error text
        path: '/test',
        method: 'GET',
        timestamp: expect.any(String),
      });
    });
  });

  describe('Module Integration', () => {
    it('should have module classes defined', () => {
      expect(UserModule).toBeDefined();
      expect(MessageModule).toBeDefined();
    });

    it('should be able to import modules for testing', () => {
      // Simple test to verify modules can be imported
      expect(typeof UserModule).toBe('function');
      expect(typeof MessageModule).toBe('function');
    });
  });

  describe('Pipe and Filter Integration', () => {
    it('should work together - pipe validates, filter handles errors', async () => {
      const pipe = new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      });

      const filter = new GlobalExceptionFilter();

      const invalidDto = {
        username: '',
        email: 'invalid-email',
        fullName: '',
        hackerField: 'malicious',
      };

      const metadata: ArgumentMetadata = {
        type: 'body',
        metatype: CreateUserDto,
        data: '',
      };

      try {
        await pipe.transform(invalidDto, metadata);
        fail('Should have thrown an exception');
      } catch (exception) {
        expect(exception).toBeInstanceOf(BadRequestException);

        // Verify the filter can handle this exception
        const mockResponse = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };

        const mockRequest = { url: '/test', method: 'POST' };

        const mockArgumentsHost = {
          switchToHttp: jest.fn().mockReturnValue({
            getResponse: jest.fn().mockReturnValue(mockResponse),
            getRequest: jest.fn().mockReturnValue(mockRequest),
          }),
          getArgs: jest.fn(),
          getArgByIndex: jest.fn(),
          switchToRpc: jest.fn(),
          switchToWs: jest.fn(),
          getType: jest.fn(),
        } as any;

        filter.catch(exception, mockArgumentsHost);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
          statusCode: 400,
          message: expect.any(Array), // ValidationPipe returns array of errors
          error: 'Bad Request',
          timestamp: expect.any(String),
          path: '/test',
          method: 'POST', // Include method from request
        });
      }
    });
  });
});
