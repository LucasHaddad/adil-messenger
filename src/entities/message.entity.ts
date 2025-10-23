import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Foreign Keys
  @Column('uuid')
  authorId: string;

  @Column('uuid', { nullable: true })
  parentMessageId?: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  // Self-referencing relationship for replies
  @ManyToOne(() => Message, (message) => message.replies, { nullable: true })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage?: Message;

  @OneToMany(() => Message, (message) => message.parentMessage)
  replies: Message[];

  // Virtual property to count replies
  replyCount?: number;
}