import mongoose, { Schema } from 'mongoose';
import { IMaterial } from '@/types';

const materialSchema = new Schema<IMaterial>(
  {
    title: {
      type: String,
      required: [true, 'Material title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    fileType: {
      type: String,
      required: [true, 'File type is required'],
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson is required'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
materialSchema.index({ lesson: 1 });

const Material = mongoose.models.Material || mongoose.model<IMaterial>('Material', materialSchema);

export default Material;
