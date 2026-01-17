import {
  createCourseSchema,
  createModuleSchema,
  createLessonSchema,
  createCategorySchema
} from '@/lib/validations/course';

describe('Course Validation Schemas', () => {
  describe('createCourseSchema', () => {
    it('should validate correct course data', () => {
      const data = {
        title: 'Test Course',
        description: 'A comprehensive test course for learning new skills',
        category: '507f1f77bcf86cd799439011',
      };

      const result = createCourseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short title', () => {
      const data = {
        title: 'Te',
        description: 'A comprehensive test course for learning',
        category: '507f1f77bcf86cd799439011',
      };

      const result = createCourseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short description', () => {
      const data = {
        title: 'Test Course',
        description: 'Short',
        category: '507f1f77bcf86cd799439011',
      };

      const result = createCourseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate with optional fields', () => {
      const data = {
        title: 'Test Course',
        description: 'A comprehensive test course for learning new skills',
        category: '507f1f77bcf86cd799439011',
        price: 5000,
        level: 'intermediate',
        tags: ['test', 'course'],
      };

      const result = createCourseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative price', () => {
      const data = {
        title: 'Test Course',
        description: 'A comprehensive test course for learning new skills',
        category: '507f1f77bcf86cd799439011',
        price: -100,
      };

      const result = createCourseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createModuleSchema', () => {
    it('should validate correct module data', () => {
      const data = {
        title: 'Test Module',
        description: 'A test module description',
      };

      const result = createModuleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short title', () => {
      const data = {
        title: 'T',
      };

      const result = createModuleSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow optional description', () => {
      const data = {
        title: 'Test Module',
      };

      const result = createModuleSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('createLessonSchema', () => {
    it('should validate correct lesson data', () => {
      const data = {
        title: 'Test Lesson',
        content: 'This is the lesson content',
      };

      const result = createLessonSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate with video URL', () => {
      const data = {
        title: 'Video Lesson',
        content: 'This is the lesson content',
        videoUrl: 'https://youtube.com/watch?v=123',
        videoDuration: 3600,
      };

      const result = createLessonSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject negative video duration', () => {
      const data = {
        title: 'Test Lesson',
        content: 'This is the lesson content',
        videoDuration: -100,
      };

      const result = createLessonSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('createCategorySchema', () => {
    it('should validate correct category data', () => {
      const data = {
        name: 'Test Category',
        description: 'A test category description',
      };

      const result = createCategorySchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const data = {
        name: 'T',
      };

      const result = createCategorySchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should allow optional fields', () => {
      const data = {
        name: 'Test Category',
      };

      const result = createCategorySchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});
