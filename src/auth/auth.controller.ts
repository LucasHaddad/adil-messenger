import {
  Controller,
  Post,
  Body,
  Get,
  Request,
  UseGuards,
  Session,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import * as _ from 'lodash';
import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { Public, SkipCsrf } from '@/auth/decorators/public.decorator';
import { LoginDto } from '@/dto/login.dto';
import { RegisterDto } from '@/dto/register.dto';
import {
  AuthResponseDto,
  CsrfTokenDto,
  LogoutResponseDto,
} from '@/dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(CsrfGuard)
@Throttle({ auth: { limit: 5, ttl: 60000 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(
    @Body() loginDto: LoginDto,
    @Session() session: Record<string, any>,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);
    session.csrfToken = result.csrfToken;
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-CSRF-Token',
    description: 'CSRF token for security',
    required: true,
  })
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
    type: LogoutResponseDto,
  })
  async logout(
    @Request() req,
    @Session() session: Record<string, any>,
  ): Promise<LogoutResponseDto> {
    session.csrfToken = null;
    return this.authService.logout(req.user.id);
  }

  @Public()
  @SkipCsrf()
  @Get('csrf-token')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({
    status: 200,
    description: 'CSRF token generated',
    type: CsrfTokenDto,
  })
  async getCsrfToken(
    @Session() session: Record<string, any>,
  ): Promise<CsrfTokenDto> {
    const csrfToken = await this.authService.generateCsrfToken();
    session.csrfToken = csrfToken;
    return { csrfToken };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
  })
  async getProfile(@Request() req) {
    return _.omit(req.user, ['password', 'currentSessionId']);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'X-CSRF-Token',
    description: 'CSRF token for security',
    required: true,
  })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  async refreshToken(
    @Request() req,
    @Session() session: Record<string, any>,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.refreshToken(req.user);
    session.csrfToken = result.csrfToken;
    return result;
  }
}
