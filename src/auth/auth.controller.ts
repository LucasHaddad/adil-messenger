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
import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { CsrfGuard } from '@/auth/guards/csrf.guard';
import { Public, SkipCsrf } from '@/auth/decorators/public.decorator';
import { LoginDto } from '@/dto/login.dto';
import { RegisterDto } from '@/dto/register.dto';
import { AuthResponseDto, CsrfTokenDto, LogoutResponseDto } from '@/dto/auth-response.dto';

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(CsrfGuard)
@Throttle({ auth: { limit: 5, ttl: 60000 } }) // 5 auth requests per minute
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @SkipCsrf()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already exists',
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Session() session: Record<string, any>,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(registerDto);
    session.csrfToken = result.csrfToken;
    return result;
  }

  @Public()
  @SkipCsrf()
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
  async getCsrfToken(@Session() session: Record<string, any>): Promise<CsrfTokenDto> {
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
    const { password, currentSessionId, ...userProfile } = req.user;
    return userProfile;
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