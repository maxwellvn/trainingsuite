import mongoose, { Schema } from 'mongoose';
import { ILesson } from '@/types';

const lessonSchema = new Schema<ILesson>(
  {
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    content: {
      type: String,
      maxlength: [50000, 'Content cannot exceed 50000 characters'],
    },
    videoUrl: {
      type: String,
    },
    videoDuration: {
      type: Number,
      default: 0,
    },
    module: {
      type: Schema.Types.ObjectId,
      ref: 'Module',
      required: [true, 'Module is required'],
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
lessonSchema.index({ module: 1, order: 1 });

const Lesson = mongoose.models.Lesson || mongoose.model<ILesson>('Lesson', lessonSchema);

export default Lesson;
