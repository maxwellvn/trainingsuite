import mongoose, { Schema } from 'mongoose';
import { IForum } from '@/types';

const forumSchema = new Schema<IForum>(
  {
    title: {
      type: String,
      required: [true, 'Forum title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    isGeneral: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
forumSchema.index({ course: 1 });
forumSchema.index({ isGeneral: 1 });
forumSchema.index({ isActive: 1 });

const Forum = mongoose.models.Forum || mongoose.model<IForum>('Forum', forumSchema);

export default Forum;
