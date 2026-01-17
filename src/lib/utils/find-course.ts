import mongoose from 'mongoose';
import Course from '@/models/Course';

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
