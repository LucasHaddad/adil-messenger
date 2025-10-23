import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/entities/user.entity';
import { Message } from '@/entities/message.entity';

export interface HealthStatus {
  status: 'ok' | 'error' | 'degraded';
  timestamp: string;
  uptime: number;
}

export interface DetailedHealthStatus extends HealthStatus {
  version: string;
  environment: string;
  dependencies: {
    database: { status: 'ok' | 'error'; responseTime?: number };
    memory: { used: number; total: number; percentage: number };
    disk: { used: number; total: number; percentage: number };
  };
  metrics: {
    totalUsers: number;
    totalMessages: number;
    activeConnections: number;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();
  private static activeConnections = new Set<string>();

  constructor(
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  // Static methods for connection tracking
  static addConnection(socketId: string): void {
    this.activeConnections.add(socketId);
  }

  static removeConnection(socketId: string): void {
    this.activeConnections.delete(socketId);
  }

  static getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  async getBasicHealth(): Promise<HealthStatus> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  async getDetailedHealth(): Promise<DetailedHealthStatus> {
    const basicHealth = await this.getBasicHealth();

    try {
      const databaseHealth = await this.checkDatabaseHealth();
      const memoryUsage = process.memoryUsage();
      const totalUsers = await this.userRepository.count();
      const totalMessages = await this.messageRepository.count();

      return {
        ...basicHealth,
        version: process.env.npm_package_version || '1.0.0',
        environment: this.configService.get('NODE_ENV', 'development'),
        dependencies: {
          database: databaseHealth,
          memory: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            percentage: Math.round(
              (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
            ),
          },
          disk: await this.getDiskUsage(),
        },
        metrics: {
          totalUsers,
          totalMessages,
          activeConnections: HealthService.getActiveConnectionCount(),
        },
      };
    } catch (error) {
      this.logger.error('Health check failed', error);
      return {
        ...basicHealth,
        status: 'error',
        version: process.env.npm_package_version || '1.0.0',
        environment: this.configService.get('NODE_ENV', 'development'),
        dependencies: {
          database: { status: 'error' },
          memory: { used: 0, total: 0, percentage: 0 },
          disk: { used: 0, total: 0, percentage: 0 },
        },
        metrics: {
          totalUsers: 0,
          totalMessages: 0,
          activeConnections: 0,
        },
      };
    }
  }

  async getReadinessCheck(): Promise<{ status: string; ready: boolean }> {
    try {
      const dbHealth = await this.checkDatabaseHealth();
      const ready = dbHealth.status === 'ok';

      return {
        status: ready ? 'ready' : 'not-ready',
        ready,
      };
    } catch {
      return {
        status: 'not-ready',
        ready: false,
      };
    }
  }

  async getLivenessCheck(): Promise<{ status: string; alive: boolean }> {
    // Basic liveness check - if the service can respond, it's alive
    return {
      status: 'alive',
      alive: true,
    };
  }

  private async checkDatabaseHealth(): Promise<{
    status: 'ok' | 'error';
    responseTime?: number;
  }> {
    try {
      const startTime = Date.now();
      await this.userRepository.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'ok',
        responseTime,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'error' };
    }
  }

  private async getDiskUsage(): Promise<{
    used: number;
    total: number;
    percentage: number;
  }> {
    try {
      // This is a simplified version - in production I would use an APM (newrelic, datadog, dynatrace, elastic apm).
      const fs = await import('fs');
      const stats = await fs.promises.stat('./');
      const used = stats.blocks * 512;
      return {
        used,
        total: stats.size,
        percentage: Math.round((used / stats.size) * 100),
      };
    } catch {
      return {
        used: 0,
        total: 0,
        percentage: 0,
      };
    }
  }
}
