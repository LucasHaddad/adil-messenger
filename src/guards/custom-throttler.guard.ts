import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ExecutionContext } from '@nestjs/common';

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.sub || req.user?.id;
    if (userId) {
      return Promise.resolve(`user-${userId}`);
    }
    return Promise.resolve(req.ip);
  }

  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const request = context.switchToHttp().getRequest();
    const route = request.route?.path || request.url;

    let routeType = 'default';

    if (route.includes('/auth/')) {
      routeType = 'auth';
    } else if (route.includes('/search/')) {
      routeType = 'search';
    } else if (route.includes('/files/upload')) {
      routeType = 'upload';
    } else if (request.method === 'GET') {
      routeType = 'read';
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      routeType = 'write';
    }

    return `${name}-${routeType}-${suffix}`;
  }
}
