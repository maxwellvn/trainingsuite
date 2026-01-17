import User from '@/models/User';
import { UserRole } from '@/types';

describe('User Model', () => {
  describe('Creation', () => {
    it('should create a user successfully with valid data', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: UserRole.USER,
      };

      const user = await User.create(userData);

      expect(user).toBeDefined();
      expect(user.name).toBe(userData.name);
      expect(user.email).toBe(userData.email);
      expect(user.role).toBe(UserRole.USER);
      expect(user.isVerified).toBe(false);
    });

    it('should hash password before saving', async () => {
      const userData = {
        name: 'Test User',
        email: 'test2@example.com',
        password: 'password123',
      };

      const user = await User.create(userData);
      const userWithPassword = await User.findById(user._id).select('+password');

      expect(userWithPassword?.password).not.toBe('password123');
      expect(userWithPassword?.password).toMatch(/^\$2[ab]\$/);
    });

    it('should fail without required fields', async () => {
      await expect(User.create({})).rejects.toThrow();
    });

    it('should fail with invalid email format', async () => {
      const userData = {
        name: 'Test User',
        email: 'invalid-email',
        password: 'password123',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should fail with short password', async () => {
      const userData = {
        name: 'Test User',
        email: 'test3@example.com',
        password: 'short',
      };

      await expect(User.create(userData)).rejects.toThrow();
    });

    it('should enforce unique email', async () => {
      const userData = {
        name: 'Test User',
        email: 'unique@example.com',
        password: 'password123',
      };

      await User.create(userData);
      await expect(User.create(userData)).rejects.toThrow();
    });
  });

  describe('Password Comparison', () => {
    it('should return true for correct password', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'compare@example.com',
        password: 'password123',
      });

      const userWithPassword = await User.findById(user._id).select('+password');
      const isMatch = await userWithPassword?.comparePassword('password123');

      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'compare2@example.com',
        password: 'password123',
      });

      const userWithPassword = await User.findById(user._id).select('+password');
      const isMatch = await userWithPassword?.comparePassword('wrongpassword');

      expect(isMatch).toBe(false);
    });
  });

  describe('Roles', () => {
    it('should default to USER role', async () => {
      const user = await User.create({
        name: 'Test User',
        email: 'role@example.com',
        password: 'password123',
      });

      expect(user.role).toBe(UserRole.USER);
    });

    it('should allow ADMIN role', async () => {
      const user = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        role: UserRole.ADMIN,
      });

      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('should allow INSTRUCTOR role', async () => {
      const user = await User.create({
        name: 'Instructor User',
        email: 'instructor@example.com',
        password: 'password123',
        role: UserRole.INSTRUCTOR,
      });

      expect(user.role).toBe(UserRole.INSTRUCTOR);
    });
  });
});
