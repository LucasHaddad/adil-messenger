import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'abc123xyz789',
    description: 'CSRF token for subsequent requests',
  })
  csrfToken: string;

  @ApiProperty({
    example: {
      id: 1,
      email: 'john.doe@example.com',
      username: 'johndoe',
      fullName: 'John Doe',
    },
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    username: string;
    fullName: string;
  };

  @ApiProperty({
    example: 'Bearer',
    description: 'Token type',
  })
  tokenType: string;

  @ApiProperty({
    example: 3600,
    description: 'Token expiration time in seconds',
  })
  expiresIn: number;
}

export class CsrfTokenDto {
  @ApiProperty({
    example: 'abc123xyz789',
    description: 'CSRF token',
  })
  csrfToken: string;
}

export class LogoutResponseDto {
  @ApiProperty({
    example: 'Successfully logged out',
    description: 'Logout confirmation message',
  })
  message: string;
}