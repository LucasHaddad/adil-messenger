import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<User> {
    const { sub: userId, sessionId } = payload;

    const user = await this.userRepository.findOne({
      where: { 
        id: userId,
        currentSessionId: sessionId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token or session expired');
    }

    return user;
  }
}