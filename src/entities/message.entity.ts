import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { User } from "@/entities/user.entity";

@Entity("messages")
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("text")
  content: string;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ nullable: true })
  deletedAt?: Date;

  // File attachment fields
  @Column({ nullable: true })
  attachmentUrl?: string;

  @Column({ nullable: true })
  attachmentName?: string;

  @Column({ nullable: true })
  attachmentType?: string; // mime type

  @Column({ nullable: true })
  attachmentSize?: number; // in bytes

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Foreign Keys
  @Column("uuid")
  authorId: string;

  @Column("uuid", { nullable: true })
  parentMessageId?: string;

  // Relationships
  @ManyToOne(() => User, (user) => user.messages, { eager: true })
  @JoinColumn({ name: "authorId" })
  author: User;

  // Self-referencing relationship for replies
  @ManyToOne(() => Message, (message) => message.replies, { nullable: true })
  @JoinColumn({ name: "parentMessageId" })
  parentMessage?: Message;

  @OneToMany(() => Message, (message) => message.parentMessage)
  replies: Message[];

  // Reactions relationship - will be properly typed when Reaction is imported
  reactions?: any[];

  // Virtual property to count replies
  replyCount?: number;
}
