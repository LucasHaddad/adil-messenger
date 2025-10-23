import { ApiProperty } from '@nestjs/swagger';
import { User } from '@/entities/user.entity';

export class MessageResponseDto {
  @ApiProperty({ description: 'Unique identifier of the message' })
  id: string;

  @ApiProperty({ description: 'Content of the message' })
  content: string;

  @ApiProperty({ description: 'Whether the message has been edited' })
  isEdited: boolean;

  @ApiProperty({ description: 'Whether the message has been deleted' })
  isDeleted: boolean;

  @ApiProperty({ description: 'When the message was created' })
  createdAt: Date;

  @ApiProperty({ description: 'When the message was last updated' })
  updatedAt: Date;

  @ApiProperty({ description: 'Author of the message', type: () => User })
  author: User;

  @ApiProperty({
    description: 'ID of the parent message if this is a reply',
    required: false,
  })
  parentMessageId?: string;

  @ApiProperty({ description: 'Number of replies to this message' })
  replyCount: number;
}
