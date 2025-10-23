import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Response } from 'express';

@Injectable()
export class RateLimitHeadersInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(() => {
        // Add rate limit headers if they exist on the request
        if (request.rateLimit) {
          const { limit, remaining, resetTime } = request.rateLimit;
          
          response.setHeader('X-RateLimit-Limit', limit);
          response.setHeader('X-RateLimit-Remaining', remaining);
          response.setHeader('X-RateLimit-Reset', resetTime);
          
          // Add retry-after header if rate limit exceeded
          if (remaining === 0) {
            const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
            response.setHeader('Retry-After', retryAfter);
          }
        }
      }),
    );
  }
}