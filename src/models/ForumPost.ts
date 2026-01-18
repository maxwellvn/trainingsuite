import mongoose, { Schema } from 'mongoose';
import { IForumPost } from '@/types';

const forumPostSchema = new Schema<IForumPost>(
  {
    forum: {
      type: Schema.Types.ObjectId,
      ref: 'Forum',
      required: [true, 'Forum is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    title: {
      type: String,
      required: [true, 'Post title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      maxlength: [10000, 'Content cannot exceed 10000 characters'],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
  },
  {
    timestamps: true,
  }
);

// Indexes
forumPostSchema.index({ forum: 1, createdAt: -1 });
forumPostSchema.index({ user: 1 });
forumPostSchema.index({ isPinned: -1, createdAt: -1 });

const ForumPost = mongoose.models.ForumPost || mongoose.model<IForumPost>('ForumPost', forumPostSchema);

export default ForumPost;
