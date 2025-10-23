import { IsEnum, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { ReactionType } from "@/entities";

export class CreateReactionDto {
  @ApiProperty({
    description: "The type of reaction",
    enum: ReactionType,
    example: ReactionType.LIKE,
  })
  @IsEnum(ReactionType)
  type: ReactionType;

  @ApiProperty({
    description: "The ID of the message to react to",
    example: "123e4567-e89b-12d3-a456-426614174000",
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: "The ID of the user adding the reaction",
    example: "123e4567-e89b-12d3-a456-426614174001",
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
