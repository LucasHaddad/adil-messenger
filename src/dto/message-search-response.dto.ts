import { ApiProperty } from '@nestjs/swagger';

export class MessageSearchResponseDto {
  @ApiProperty({
    description: 'Array of messages matching the search criteria',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
        content: { type: 'string', example: 'Hello world message' },
        createdAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
        updatedAt: { type: 'string', example: '2023-01-01T00:00:00.000Z' },
        user: {
          type: 'object',
          properties: {
            id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
            username: { type: 'string', example: 'john_doe' },
            email: { type: 'string', example: 'john@example.com' },
          },
        },
        attachmentUrl: { type: 'string', example: '/uploads/file.pdf', nullable: true },
        attachmentName: { type: 'string', example: 'document.pdf', nullable: true },
        attachmentType: { type: 'string', example: 'application/pdf', nullable: true },
        attachmentSize: { type: 'number', example: 1024, nullable: true },
      },
    },
  })
  messages: any[];

  @ApiProperty({
    description: 'Total number of messages matching the search criteria',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Number of results returned in this response',
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: 'Number of results skipped',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: 'Maximum number of results per page',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: 'Whether there are more results available',
    example: true,
  })
  hasMore: boolean;
}