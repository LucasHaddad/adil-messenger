import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { User } from '@/entities/user.entity';
import { LoginDto } from '@/dto/login.dto';
import { RegisterDto } from '@/dto/register.dto';
import { AuthResponseDto } from '@/dto/auth-response.dto';
import { JwtPayload } from '@/strategies/jwt.strategy';
import { SecurityLoggerService } from '@/services/security-logger.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private securityLogger: SecurityLoggerService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (user && (await user.validatePassword(password))) {
      return user;
    }

    return null;
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, username, password, fullName } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: [{ email }, { username }],
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      if (existingUser.username === username) {
        throw new ConflictException('Username already taken');
      }
    }

    const user = this.userRepository.create({
      email,
      username,
      fullName,
      password,
    });

    await this.userRepository.save(user);

    return this.generateAuthResponse(user);
  }

  async login(
    loginDto: LoginDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);

    if (!user) {
      this.securityLogger.logFailedLogin(email, ip || 'unknown', userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.securityLogger.logSuccessfulLogin(
      user.id,
      user.email,
      ip || 'unknown',
      userAgent,
    );
    return this.generateAuthResponse(user);
  }

  async logout(userId: string): Promise<{ message: string }> {
    await this.userRepository.update(userId, { currentSessionId: null });
    return { message: 'Successfully logged out' };
  }

  async generateCsrfToken(): Promise<string> {
    return randomBytes(32).toString('hex');
  }

  private async generateAuthResponse(user: User): Promise<AuthResponseDto> {
    const sessionId = randomBytes(32).toString('hex');
    const csrfToken = await this.generateCsrfToken();

    await this.userRepository.update(user.id, { currentSessionId: sessionId });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      csrfToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
      },
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }

  async refreshToken(user: User): Promise<AuthResponseDto> {
    return this.generateAuthResponse(user);
  }
}
