import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@/entities";

export class ReactionResponseDto {
  @ApiProperty({
    description: "Reaction UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  id: string;

  @ApiProperty({
    description: "The type of reaction",
    enum: ReactionType,
    example: ReactionType.LIKE,
  })
  type: ReactionType;

  @ApiProperty({
    description: "The ID of the user who added the reaction",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  userId: string;

  @ApiProperty({
    description: "The ID of the message being reacted to",
    example: "123e4567-e89b-12d3-a456-426614174002",
  })
  messageId: string;

  @ApiProperty({
    description: "When the reaction was created",
    example: "2023-10-23T10:30:00Z",
  })
  createdAt: Date;
}

export class ReactionCountDto {
  @ApiProperty({
    description: "The type of reaction",
    enum: ReactionType,
    example: ReactionType.LIKE,
  })
  type: ReactionType;

  @ApiProperty({
    description: "Number of reactions of this type",
    example: 5,
  })
  count: number;
}

export class MessageReactionsDto {
  @ApiProperty({
    description: "The message ID",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  messageId: string;

  @ApiProperty({
    description: "Reaction counts by type",
    type: [ReactionCountDto],
  })
  reactions: ReactionCountDto[];

  @ApiProperty({
    description: "Total number of reactions",
    example: 15,
  })
  totalReactions: number;
}
