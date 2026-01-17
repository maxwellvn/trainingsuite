import mongoose, { Schema } from 'mongoose';
import { ICertificate } from '@/types';

const certificateSchema = new Schema<ICertificate>(
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
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    certificateUrl: {
      type: String,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique certificate per user per course
// (certificateNumber already indexed via unique: true)
certificateSchema.index({ user: 1, course: 1 }, { unique: true });

const Certificate = mongoose.models.Certificate || mongoose.model<ICertificate>('Certificate', certificateSchema);

export default Certificate;
