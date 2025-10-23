import {
  Injectable,
  PipeTransform,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { SecurityLoggerService } from '@/services/security-logger.service';

@Injectable()
export class InputSanitizationPipe implements PipeTransform {
  constructor(private securityLogger: SecurityLoggerService) {}

  transform(value: any, _metadata: ArgumentMetadata) {
    if (!value) return value;

    const sanitizedValue = this.sanitizeInput(value);

    if (this.containsPotentialXSS(value)) {
      this.securityLogger.logXSSAttempt(
        JSON.stringify(value),
        'unknown',
        'input-validation',
      );
      throw new BadRequestException(
        'Input contains potentially dangerous content',
      );
    }

    if (this.containsPotentialSQLInjection(value)) {
      this.securityLogger.logSQLInjectionAttempt(
        JSON.stringify(value),
        'unknown',
        'input-validation',
      );
      throw new BadRequestException(
        'Input contains potentially dangerous content',
      );
    }

    return sanitizedValue;
  }

  private sanitizeInput(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeString(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeInput(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        sanitized[key] = this.sanitizeInput(value);
      }
      return sanitized;
    }

    return input;
  }

  private sanitizeString(str: string): string {
    if (!str || typeof str !== 'string') return str;

    str = str.replace(/\0/g, '');

    str = str.normalize('NFC');

    str = str.trim();

    return str;
  }

  private containsPotentialXSS(input: any): boolean {
    if (typeof input !== 'string') {
      if (typeof input === 'object') {
        return Object.values(input).some(value =>
          this.containsPotentialXSS(value),
        );
      }
      return false;
    }

    const xssPatterns = [
      /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /<img[\s\S]*?onerror[\s\S]*?>/gi,
      /<svg[\s\S]*?onload[\s\S]*?>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  }

  private containsPotentialSQLInjection(input: any): boolean {
    if (typeof input !== 'string') {
      if (typeof input === 'object') {
        return Object.values(input).some(value =>
          this.containsPotentialSQLInjection(value),
        );
      }
      return false;
    }

    const sqlPatterns = [
      /['"]/gi,
      /union\s+select/gi,
      /insert\s+into/gi,
      /delete\s+from/gi,
      /update\s+set/gi,
      /drop\s+table/gi,
      /create\s+table/gi,
      /alter\s+table/gi,
      /exec\s+/gi,
      /execute\s+/gi,
      /--/gi,
      /\/\*/gi,
      /\*\//gi,
    ];

    const lowerInput = input.toLowerCase();
    return sqlPatterns.some(pattern => pattern.test(lowerInput));
  }
}
