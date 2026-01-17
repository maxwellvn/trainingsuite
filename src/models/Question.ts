import mongoose, { Schema } from 'mongoose';
import { IQuestion } from '@/types';

const questionSchema = new Schema<IQuestion>(
  {
    quiz: {
      type: Schema.Types.ObjectId,
      ref: 'Quiz',
      required: [true, 'Quiz is required'],
    },
    question: {
      type: String,
      required: [true, 'Question text is required'],
      maxlength: [1000, 'Question cannot exceed 1000 characters'],
    },
    options: {
      type: [String],
      required: [true, 'Options are required'],
      validate: {
        validator: function (v: string[]) {
          return v.length >= 2 && v.length <= 6;
        },
        message: 'Options must have between 2 and 6 choices',
      },
    },
    correctAnswer: {
      type: Number,
      required: [true, 'Correct answer is required'],
      min: 0,
    },
    points: {
      type: Number,
      default: 1,
      min: 1,
    },
    explanation: {
      type: String,
      maxlength: [500, 'Explanation cannot exceed 500 characters'],
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
questionSchema.index({ quiz: 1, order: 1 });

const Question = mongoose.models.Question || mongoose.model<IQuestion>('Question', questionSchema);

export default Question;
