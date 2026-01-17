import mongoose, { Schema } from 'mongoose';
import { ILiveAttendance } from '@/types';

const liveAttendanceSchema = new Schema<ILiveAttendance>(
  {
    session: {
      type: Schema.Types.ObjectId,
      ref: 'LiveSession',
      required: [true, 'Session is required'],
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    leftAt: {
      type: Date,
    },
    duration: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
liveAttendanceSchema.index({ session: 1, user: 1 }, { unique: true });
liveAttendanceSchema.index({ session: 1 });

const LiveAttendance = mongoose.models.LiveAttendance || mongoose.model<ILiveAttendance>('LiveAttendance', liveAttendanceSchema);

export default LiveAttendance;
