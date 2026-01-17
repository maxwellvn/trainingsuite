import { registerSchema, loginSchema, updateProfileSchema } from '@/lib/validations/auth';

describe('Auth Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const data = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject short name', () => {
      const data = {
        name: 'T',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email', () => {
      const data = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const data = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Short1',
        confirmPassword: 'Short1',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase', () => {
      const data = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        confirmPassword: 'password123',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject mismatched passwords', () => {
      const data = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password456',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing fields', () => {
      const data = {};

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const data = {
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const data = {
        email: 'test@example.com',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'not-an-email',
        password: 'password123',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('updateProfileSchema', () => {
    it('should validate partial update data', () => {
      const data = {
        name: 'Updated Name',
      };

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should allow empty object (no updates)', () => {
      const data = {};

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should validate bio update', () => {
      const data = {
        bio: 'This is my bio',
      };

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject too long bio', () => {
      const data = {
        bio: 'a'.repeat(501),
      };

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should validate avatar URL', () => {
      const data = {
        avatar: 'https://example.com/avatar.jpg',
      };

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should reject invalid avatar URL', () => {
      const data = {
        avatar: 'not-a-url',
      };

      const result = updateProfileSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });
});
