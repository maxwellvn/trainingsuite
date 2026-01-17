import mongoose, { Schema } from 'mongoose';
import { ILiveSession, LiveSessionStatus } from '@/types';

const liveSessionSchema = new Schema<ILiveSession>(
  {
    title: {
      type: String,
      required: [true, 'Session title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    streamUrl: {
      type: String,
    },
    streamProvider: {
      type: String,
      enum: ['youtube', 'vimeo', 'custom'],
      default: 'youtube',
    },
    scheduledAt: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    duration: {
      type: Number,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(LiveSessionStatus),
      default: LiveSessionStatus.SCHEDULED,
    },
    thumbnail: {
      type: String,
    },
    recordingUrl: {
      type: String,
    },
    maxAttendees: {
      type: Number,
    },
    attendeeCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
liveSessionSchema.index({ scheduledAt: 1 });
liveSessionSchema.index({ status: 1 });
liveSessionSchema.index({ course: 1 });
liveSessionSchema.index({ instructor: 1 });

const LiveSession = mongoose.models.LiveSession || mongoose.model<ILiveSession>('LiveSession', liveSessionSchema);

export default LiveSession;
