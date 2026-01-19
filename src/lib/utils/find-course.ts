import mongoose from 'mongoose';
import Course from '@/models/Course';
import Module from '@/models/Module';
import Lesson from '@/models/Lesson';

/**
 * Find a course by either MongoDB ObjectId or slug
 * @param idOrSlug - Either a valid MongoDB ObjectId or a course slug
 * @returns Mongoose query that can be chained with .populate() etc.
 */
export function findCourseByIdOrSlug(idOrSlug: string) {
  const isValidObjectId = mongoose.Types.ObjectId.isValid(idOrSlug) &&
    idOrSlug.length === 24; // Extra check since isValid can return true for short strings

  if (isValidObjectId) {
    return Course.findById(idOrSlug);
  }

  return Course.findOne({ slug: idOrSlug });
}

/**
 * Get the course ObjectId from either an ID string or slug
 * Useful when you need the actual ObjectId for queries
 * @param idOrSlug - Either a valid MongoDB ObjectId or a course slug
 * @returns The course document or null
 */
export async function getCourseById(idOrSlug: string) {
  return findCourseByIdOrSlug(idOrSlug);
}

/**
 * Recalculate and update course duration from all lesson videoDurations
 * @param courseId - The course ObjectId
 * @returns The updated duration in seconds
 */
export async function recalculateCourseDuration(courseId: mongoose.Types.ObjectId | string): Promise<number> {
  // Get all modules for this course
  const modules = await Module.find({ course: courseId });
  const moduleIds = modules.map(m => m._id);

  // Sum all lesson videoDurations (in seconds)
  const result = await Lesson.aggregate([
    { $match: { module: { $in: moduleIds } } },
    { $group: { _id: null, totalDuration: { $sum: '$videoDuration' } } }
  ]);

  const totalDuration = result[0]?.totalDuration || 0;

  // Update the course duration
  await Course.findByIdAndUpdate(courseId, { duration: totalDuration });

  return totalDuration;
}
