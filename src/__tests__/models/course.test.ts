import mongoose from 'mongoose';
import Course from '@/models/Course';
import Category from '@/models/Category';
import User from '@/models/User';
import { CourseStatus, UserRole } from '@/types';

describe('Course Model', () => {
  let instructor: mongoose.Document;
  let category: mongoose.Document;

  beforeEach(async () => {
    instructor = await User.create({
      name: 'Instructor',
      email: 'instructor@example.com',
      password: 'password123',
      role: UserRole.INSTRUCTOR,
    });

    category = await Category.create({
      name: 'Test Category',
      slug: 'test-category',
    });
  });

  describe('Creation', () => {
    it('should create a course successfully', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        slug: 'test-course',
        instructor: instructor._id,
        category: category._id,
      };

      const course = await Course.create(courseData);

      expect(course).toBeDefined();
      expect(course.title).toBe(courseData.title);
      expect(course.description).toBe(courseData.description);
      expect(course.slug).toBe(courseData.slug);
      expect(course.status).toBe(CourseStatus.DRAFT);
      expect(course.isFree).toBe(true);
      expect(course.price).toBe(0);
    });

    it('should fail without required fields', async () => {
      await expect(Course.create({})).rejects.toThrow();
    });

    it('should fail without instructor', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        slug: 'test-course-2',
        category: category._id,
      };

      await expect(Course.create(courseData)).rejects.toThrow();
    });

    it('should enforce unique slug', async () => {
      const courseData = {
        title: 'Test Course',
        description: 'A test course description',
        slug: 'unique-slug',
        instructor: instructor._id,
        category: category._id,
      };

      await Course.create(courseData);
      await expect(Course.create(courseData)).rejects.toThrow();
    });
  });

  describe('Pricing', () => {
    it('should allow paid courses', async () => {
      const course = await Course.create({
        title: 'Paid Course',
        description: 'A paid course',
        slug: 'paid-course',
        instructor: instructor._id,
        category: category._id,
        isFree: false,
        price: 5000,
      });

      expect(course.isFree).toBe(false);
      expect(course.price).toBe(5000);
    });

    it('should not allow negative price', async () => {
      const courseData = {
        title: 'Invalid Course',
        description: 'A course with negative price',
        slug: 'invalid-price-course',
        instructor: instructor._id,
        category: category._id,
        price: -100,
      };

      await expect(Course.create(courseData)).rejects.toThrow();
    });
  });

  describe('Status', () => {
    it('should default to DRAFT status', async () => {
      const course = await Course.create({
        title: 'Draft Course',
        description: 'A draft course',
        slug: 'draft-course',
        instructor: instructor._id,
        category: category._id,
      });

      expect(course.status).toBe(CourseStatus.DRAFT);
    });

    it('should allow PUBLISHED status', async () => {
      const course = await Course.create({
        title: 'Published Course',
        description: 'A published course',
        slug: 'published-course',
        instructor: instructor._id,
        category: category._id,
        status: CourseStatus.PUBLISHED,
      });

      expect(course.status).toBe(CourseStatus.PUBLISHED);
    });
  });

  describe('Ratings', () => {
    it('should default ratings to 0', async () => {
      const course = await Course.create({
        title: 'Rated Course',
        description: 'A course to be rated',
        slug: 'rated-course',
        instructor: instructor._id,
        category: category._id,
      });

      expect(course.rating).toBe(0);
      expect(course.ratingCount).toBe(0);
    });

    it('should not allow rating above 5', async () => {
      const courseData = {
        title: 'High Rated Course',
        description: 'A course with invalid rating',
        slug: 'high-rated-course',
        instructor: instructor._id,
        category: category._id,
        rating: 6,
      };

      await expect(Course.create(courseData)).rejects.toThrow();
    });
  });
});
