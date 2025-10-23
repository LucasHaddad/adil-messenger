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
import { User } from '@/entities/user.entity';

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

  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column({ nullable: true })
  attachmentName?: string;

  @Column({ nullable: true })
  attachmentType?: string;

  @Column({ nullable: true })
  attachmentSize?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column('uuid')
  authorId: string;

  @Column('uuid', { nullable: true })
  parentMessageId?: string;

  @ManyToOne(() => User, user => user.messages, { eager: true })
  @JoinColumn({ name: 'authorId' })
  author: User;

  @ManyToOne(() => Message, message => message.replies, { nullable: true })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage?: Message;

  @OneToMany(() => Message, message => message.parentMessage)
  replies: Message[];

  reactions?: any[];

  replyCount?: number;
}
