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
import { ReactionType } from '@/enums';

@Entity('reactions')
@Unique(['userId', 'messageId'])
export class Reaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'text',
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
