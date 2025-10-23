import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/auth/decorators/public.decorator';
import { HealthService } from '@/services/health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2025-10-23T12:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
      },
    },
  })
  async healthCheck() {
    return this.healthService.getBasicHealth();
  }

  @Public()
  @Get('detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Detailed health check with dependencies' })
  @ApiResponse({
    status: 200,
    description: 'Detailed health information',
  })
  async detailedHealthCheck() {
    return this.healthService.getDetailedHealth();
  }

  @Public()
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe for Kubernetes' })
  @ApiResponse({
    status: 200,
    description: 'Service is ready to receive traffic',
  })
  async readinessCheck() {
    return this.healthService.getReadinessCheck();
  }

  @Public()
  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe for Kubernetes' })
  @ApiResponse({
    status: 200,
    description: 'Service is alive',
  })
  async livenessCheck() {
    return this.healthService.getLivenessCheck();
  }
}
