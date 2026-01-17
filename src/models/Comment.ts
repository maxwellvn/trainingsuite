import mongoose, { Schema } from 'mongoose';
import { IComment } from '@/types';

const commentSchema = new Schema<IComment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [5000, 'Comment cannot exceed 5000 characters'],
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'ForumPost',
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
    parent: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ lesson: 1, createdAt: 1 });
commentSchema.index({ user: 1 });
commentSchema.index({ parent: 1 });

const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
