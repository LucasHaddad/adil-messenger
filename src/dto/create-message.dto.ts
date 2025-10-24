import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateMessageDto {
  @ApiProperty({
    description: 'The content of the message (1-2000 characters)',
    example: 'Hello, this is my first message!',
    maxLength: 2000,
    minLength: 1,
  })
  @IsString({ message: 'Message content must be a string' })
  @IsNotEmpty({ message: 'Message content is required' })
  @MinLength(1, {
    message: 'Message content must be at least 1 character long',
  })
  @MaxLength(2000, {
    message: 'Message content must not exceed 2000 characters',
  })
  @Transform(({ value }) => value?.trim())
  @Matches(
    /^(?!.*<script|.*javascript:|.*vbscript:|.*onload=|.*onerror=).*$/i,
    {
      message: 'Message content contains potentially dangerous content',
    },
  )
  content: string;

  @ApiProperty({
    description:
      'The ID of the user sending the message (automatically populated from JWT)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Author ID must be a string' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'Author ID must be a valid UUID',
  })
  authorId?: string;

  @ApiProperty({
    description: 'The ID of the parent message if this is a reply',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Parent message ID must be a string' })
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, {
    message: 'Parent message ID must be a valid UUID',
  })
  parentMessageId?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;

  @IsOptional()
  @IsString()
  attachmentName?: string;

  @IsOptional()
  @IsString()
  attachmentType?: string;

  @IsOptional()
  attachmentSize?: number;
}
