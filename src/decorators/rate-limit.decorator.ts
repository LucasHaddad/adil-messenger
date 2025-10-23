import { SetMetadata } from '@nestjs/common';

export const THROTTLER_LIMIT = 'throttler:limit';
export const THROTTLER_TTL = 'throttler:ttl';

export const RateLimit = (limit: number, ttl: number) =>
  SetMetadata('throttler', { limit, ttl });

// Predefined rate limit decorators for common use cases
export const AuthRateLimit = () => RateLimit(5, 60); // 5 requests per minute for auth endpoints
export const UploadRateLimit = () => RateLimit(10, 60); // 10 uploads per minute
export const SearchRateLimit = () => RateLimit(30, 60); // 30 searches per minute
export const ReadRateLimit = () => RateLimit(100, 60); // 100 reads per minute
export const WriteRateLimit = () => RateLimit(50, 60); // 50 writes per minute