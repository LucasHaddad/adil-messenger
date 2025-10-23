import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const startTime = Date.now();
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const url = request.url;

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        if (duration > 1000) {
          this.logger.warn(
            `Slow request detected: ${method} ${url} took ${duration}ms`,
          );
        } else if (duration > 500) {
          this.logger.log(`Request: ${method} ${url} took ${duration}ms`);
        }

        this.recordMetrics(method, url, duration);
      }),
    );
  }

  private recordMetrics(method: string, url: string, duration: number): void {
    if (duration > 100) {
      this.logger.debug(`Performance metric: ${method} ${url} - ${duration}ms`);
    }
  }
}
