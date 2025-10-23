import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { RateLimitHeadersInterceptor } from '@/interceptors/rate-limit-headers.interceptor';
import { of } from 'rxjs';

describe('RateLimitHeadersInterceptor', () => {
  let interceptor: RateLimitHeadersInterceptor;
  let mockResponse: any;
  let mockRequest: any;
  let mockContext: ExecutionContext;
  let mockCallHandler: CallHandler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimitHeadersInterceptor],
    }).compile();

    interceptor = module.get<RateLimitHeadersInterceptor>(RateLimitHeadersInterceptor);

    mockResponse = {
      setHeader: jest.fn(),
    };

    mockRequest = {};

    mockContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as ExecutionContext;

    mockCallHandler = {
      handle: () => of('test response'),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should add rate limit headers when rateLimit data exists', (done) => {
    mockRequest.rateLimit = {
      limit: 100,
      remaining: 95,
      resetTime: Date.now() + 60000,
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    result$.subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 95);
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        mockRequest.rateLimit.resetTime
      );
      expect(mockResponse.setHeader).not.toHaveBeenCalledWith('Retry-After', expect.anything());
      done();
    });
  });

  it('should add Retry-After header when rate limit exceeded', (done) => {
    const resetTime = Date.now() + 30000; // 30 seconds in the future
    mockRequest.rateLimit = {
      limit: 100,
      remaining: 0,
      resetTime,
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    result$.subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 100);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Reset', resetTime);
      
      // Should set Retry-After header with seconds until reset
      const expectedRetryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expectedRetryAfter);
      done();
    });
  });

  it('should not add headers when rateLimit data does not exist', (done) => {
    // mockRequest.rateLimit is undefined

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    result$.subscribe(() => {
      expect(mockResponse.setHeader).not.toHaveBeenCalled();
      done();
    });
  });

  it('should handle zero remaining correctly', (done) => {
    const resetTime = Date.now() + 45000;
    mockRequest.rateLimit = {
      limit: 50,
      remaining: 0,
      resetTime,
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    result$.subscribe(() => {
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 0);
      
      const expectedRetryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expectedRetryAfter);
      done();
    });
  });

  it('should pass through the original response', (done) => {
    mockRequest.rateLimit = {
      limit: 100,
      remaining: 95,
      resetTime: Date.now() + 60000,
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    result$.subscribe((response) => {
      expect(response).toBe('test response');
      done();
    });
  });

  it('should handle edge case where resetTime is in the past', (done) => {
    const resetTime = Date.now() - 1000; // 1 second in the past
    mockRequest.rateLimit = {
      limit: 100,
      remaining: 0,
      resetTime,
    };

    const result$ = interceptor.intercept(mockContext, mockCallHandler);

    result$.subscribe(() => {
      // Should still set headers but Retry-After should be 0 or 1
      const expectedRetryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Retry-After', expectedRetryAfter);
      done();
    });
  });
});