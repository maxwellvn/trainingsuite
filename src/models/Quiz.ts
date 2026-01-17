import mongoose, { Schema } from 'mongoose';
import { IQuiz } from '@/types';

const quizSchema = new Schema<IQuiz>(
  {
    title: {
      type: String,
      required: [true, 'Quiz title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson is required'],
    },
    passingScore: {
      type: Number,
      required: true,
      default: 70,
      min: 0,
      max: 100,
    },
    timeLimit: {
      type: Number,
      min: 1,
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
quizSchema.index({ lesson: 1 });

const Quiz = mongoose.models.Quiz || mongoose.model<IQuiz>('Quiz', quizSchema);

export default Quiz;
