import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

export enum ReactionType {
  LIKE = 'like',
  DISLIKE = 'dislike',
  HEART = 'heart',
  LAUGH = 'laugh',
  ANGRY = 'angry',
  SURPRISED = 'surprised',
  SAD = 'sad',
  THUMBS_UP = 'thumbs_up',
  THUMBS_DOWN = 'thumbs_down',
  FIRE = 'fire',
}

@Entity('reactions')
@Unique(['userId', 'messageId'])
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ReactionType,
    default: ReactionType.LIKE,
  })
  type: ReactionType;

  @CreateDateColumn()
  createdAt: Date;

  @Column('uuid')
  userId: string;

  @Column('uuid')
  messageId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Message, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
