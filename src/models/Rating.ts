import mongoose, { Schema } from 'mongoose';
import { IRating } from '@/types';

const ratingSchema = new Schema<IRating>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      maxlength: [2000, 'Review cannot exceed 2000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Unique rating per user per course
ratingSchema.index({ user: 1, course: 1 }, { unique: true });
ratingSchema.index({ course: 1 });

const Rating = mongoose.models.Rating || mongoose.model<IRating>('Rating', ratingSchema);

export default Rating;
