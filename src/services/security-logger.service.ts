import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SecurityLoggerService {
  private readonly logger = new Logger(SecurityLoggerService.name);

  constructor(private configService: ConfigService) {}

  logFailedLogin(email: string, ip: string, userAgent?: string): void {
    this.logger.warn(
      `Failed login attempt for email: ${email} from IP: ${ip}`,
      {
        email,
        ip,
        userAgent,
        event: 'FAILED_LOGIN',
        timestamp: new Date().toISOString(),
      },
    );
  }

  logSuccessfulLogin(
    userId: string,
    email: string,
    ip: string,
    userAgent?: string,
  ): void {
    this.logger.log(
      `Successful login for user: ${userId} (${email}) from IP: ${ip}`,
      {
        userId,
        email,
        ip,
        userAgent,
        event: 'SUCCESSFUL_LOGIN',
        timestamp: new Date().toISOString(),
      },
    );
  }

  logSuspiciousActivity(activity: string, details: any, ip?: string): void {
    this.logger.warn(`Suspicious activity detected: ${activity}`, {
      activity,
      details,
      ip,
      event: 'SUSPICIOUS_ACTIVITY',
      timestamp: new Date().toISOString(),
    });
  }

  logUnauthorizedAccess(resource: string, userId?: string, ip?: string): void {
    this.logger.warn(`Unauthorized access attempt to: ${resource}`, {
      resource,
      userId,
      ip,
      event: 'UNAUTHORIZED_ACCESS',
      timestamp: new Date().toISOString(),
    });
  }

  logRateLimitExceeded(ip: string, endpoint: string): void {
    this.logger.warn(
      `Rate limit exceeded for IP: ${ip} on endpoint: ${endpoint}`,
      {
        ip,
        endpoint,
        event: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
      },
    );
  }

  logUnauthorizedCORSAttempt(origin: string): void {
    this.logger.warn(`Unauthorized CORS attempt from origin: ${origin}`, {
      origin,
      event: 'UNAUTHORIZED_CORS',
      timestamp: new Date().toISOString(),
    });
  }

  logSQLInjectionAttempt(query: string, ip: string, endpoint: string): void {
    this.logger.error(`Potential SQL injection attempt from IP: ${ip}`, {
      query: query.substring(0, 200),
      ip,
      endpoint,
      event: 'SQL_INJECTION_ATTEMPT',
      timestamp: new Date().toISOString(),
    });
  }

  logXSSAttempt(payload: string, ip: string, endpoint: string): void {
    this.logger.error(`Potential XSS attempt from IP: ${ip}`, {
      payload: payload.substring(0, 200),
      ip,
      endpoint,
      event: 'XSS_ATTEMPT',
      timestamp: new Date().toISOString(),
    });
  }

  logCSRFAttempt(ip: string, endpoint: string, providedToken?: string): void {
    this.logger.error(`CSRF attack attempt from IP: ${ip}`, {
      ip,
      endpoint,
      providedToken: providedToken ? 'PROVIDED' : 'MISSING',
      event: 'CSRF_ATTEMPT',
      timestamp: new Date().toISOString(),
    });
  }
}
