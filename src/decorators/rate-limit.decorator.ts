import { SetMetadata } from '@nestjs/common';

export const THROTTLER_LIMIT = 'throttler:limit';
export const THROTTLER_TTL = 'throttler:ttl';

export const RateLimit = (limit: number, ttl: number) =>
  SetMetadata('throttler', { limit, ttl });

export const AuthRateLimit = () => RateLimit(5, 60);
export const UploadRateLimit = () => RateLimit(10, 60);
export const SearchRateLimit = () => RateLimit(30, 60);
export const ReadRateLimit = () => RateLimit(100, 60);
export const WriteRateLimit = () => RateLimit(50, 60);
