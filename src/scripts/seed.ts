import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Import models
import User from '../models/User';
import Category from '../models/Category';
import Course from '../models/Course';
import Module from '../models/Module';
import Lesson from '../models/Lesson';
import Material from '../models/Material';
import Forum from '../models/Forum';
import ForumPost from '../models/ForumPost';
import SiteConfig from '../models/SiteConfig';
import Announcement from '../models/Announcement';
import { UserRole, CourseStatus } from '../types';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set');
  process.exit(1);
}

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI as string);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

async function clearDatabase() {
  console.log('Clearing existing data...');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Course.deleteMany({}),
    Module.deleteMany({}),
    Lesson.deleteMany({}),
    Material.deleteMany({}),
    Forum.deleteMany({}),
    ForumPost.deleteMany({}),
    SiteConfig.deleteMany({}),
    Announcement.deleteMany({}),
  ]);
  console.log('Database cleared');
}

async function seedUsers() {
  console.log('Seeding users...');

  const hashedPassword = await bcrypt.hash('password123', 12);

  const users = await User.insertMany([
    {
      name: 'Admin User',
      email: 'admin@rhapsody.org',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      bio: 'System administrator for Rhapsody Training Suite',
    },
    {
      name: 'Pastor John',
      email: 'instructor@rhapsody.org',
      password: hashedPassword,
      role: UserRole.INSTRUCTOR,
      isVerified: true,
      bio: 'Experienced minister with 15 years in crusade organization and outreach',
    },
    {
      name: 'Sister Mary',
      email: 'instructor2@rhapsody.org',
      password: hashedPassword,
      role: UserRole.INSTRUCTOR,
      isVerified: true,
      bio: 'Youth ministry leader and training facilitator',
    },
    {
      name: 'Brother James',
      email: 'user@rhapsody.org',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      bio: 'Cell group leader learning to organize outreaches',
    },
    {
      name: 'Sister Grace',
      email: 'user2@rhapsody.org',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      bio: 'New member eager to learn about ministry',
    },
  ]);

  console.log(`Created ${users.length} users`);
  return users;
}

async function seedCategories() {
  console.log('Seeding categories...');

  const categories = await Category.insertMany([
    {
      name: 'Crusade Organization',
      slug: 'crusade-organization',
      description: 'Learn how to plan, organize, and execute successful crusades',
      icon: 'megaphone',
    },
    {
      name: 'Outreach Ministry',
      slug: 'outreach-ministry',
      description: 'Strategies and techniques for effective community outreach',
      icon: 'users',
    },
    {
      name: 'Cell Ministry',
      slug: 'cell-ministry',
      description: 'Building and growing cell groups in your community',
      icon: 'home',
    },
    {
      name: 'Youth Ministry',
      slug: 'youth-ministry',
      description: 'Engaging and discipling the next generation',
      icon: 'star',
    },
    {
      name: 'Leadership Development',
      slug: 'leadership-development',
      description: 'Developing leadership skills for ministry',
      icon: 'award',
    },
  ]);

  console.log(`Created ${categories.length} categories`);
  return categories;
}

async function seedCourses(
  users: mongoose.Document[],
  categories: mongoose.Document[]
) {
  console.log('Seeding courses...');

  const instructor = users.find((u: any) => u.role === UserRole.INSTRUCTOR);
  const crusadeCategory = categories.find((c: any) => c.slug === 'crusade-organization');
  const outreachCategory = categories.find((c: any) => c.slug === 'outreach-ministry');

  const courses = await Course.insertMany([
    {
      title: 'Crusade Planning Fundamentals',
      slug: 'crusade-planning-fundamentals',
      description:
        'A comprehensive course on planning and executing successful crusades. Learn the essential steps from venue selection to follow-up strategies.',
      thumbnail: '/images/courses/crusade-planning.jpg',
      instructor: instructor?._id,
      category: crusadeCategory?._id,
      status: CourseStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
      isPaid: false,
      price: 0,
      tags: ['crusade', 'planning', 'evangelism'],
      features: [
        'Step-by-step planning guide',
        'Venue selection criteria',
        'Team coordination strategies',
        'Follow-up best practices',
      ],
    },
    {
      title: 'Advanced Outreach Strategies',
      slug: 'advanced-outreach-strategies',
      description:
        'Take your outreach ministry to the next level with proven strategies for community engagement and soul winning.',
      thumbnail: '/images/courses/outreach.jpg',
      instructor: instructor?._id,
      category: outreachCategory?._id,
      status: CourseStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
      isPaid: true,
      price: 2500,
      currency: 'NGN',
      tags: ['outreach', 'evangelism', 'community'],
      features: [
        'Community mapping techniques',
        'Door-to-door evangelism',
        'Social media outreach',
        'Partnership building',
      ],
    },
    {
      title: 'Cell Group Leadership',
      slug: 'cell-group-leadership',
      description:
        'Learn how to lead effective cell groups that grow and multiply.',
      thumbnail: '/images/courses/cell-leadership.jpg',
      instructor: users.find((u: any) => u.email === 'instructor2@rhapsody.org')?._id,
      category: categories.find((c: any) => c.slug === 'cell-ministry')?._id,
      status: CourseStatus.PUBLISHED,
      isPublished: true,
      publishedAt: new Date(),
      isPaid: false,
      price: 0,
      tags: ['cell group', 'leadership', 'discipleship'],
      features: [
        'Cell meeting structure',
        'Member care strategies',
        'Multiplication principles',
        'Leadership development',
      ],
    },
  ]);

  console.log(`Created ${courses.length} courses`);
  return courses;
}

async function seedModulesAndLessons(courses: mongoose.Document[]) {
  console.log('Seeding modules and lessons...');

  const crusadeCourse = courses.find(
    (c: any) => c.slug === 'crusade-planning-fundamentals'
  );

  if (!crusadeCourse) return { modules: [], lessons: [] };

  const modules = await Module.insertMany([
    {
      title: 'Introduction to Crusade Planning',
      description: 'Understanding the fundamentals of crusade organization',
      course: crusadeCourse._id,
      order: 0,
      isPublished: true,
    },
    {
      title: 'Pre-Crusade Preparation',
      description: 'Essential steps to take before the crusade',
      course: crusadeCourse._id,
      order: 1,
      isPublished: true,
    },
    {
      title: 'During the Crusade',
      description: 'Managing activities during the crusade event',
      course: crusadeCourse._id,
      order: 2,
      isPublished: true,
    },
    {
      title: 'Post-Crusade Follow-up',
      description: 'Ensuring lasting impact after the crusade',
      course: crusadeCourse._id,
      order: 3,
      isPublished: true,
    },
  ]);

  // Update course with modules
  await Course.findByIdAndUpdate(crusadeCourse._id, {
    modules: modules.map((m) => m._id),
  });

  const lessons = await Lesson.insertMany([
    // Module 1 lessons
    {
      title: 'What is a Crusade?',
      description: 'Understanding the purpose and impact of crusades',
      module: modules[0]._id,
      order: 0,
      content:
        'A crusade is a large-scale evangelistic event designed to reach many souls with the gospel of Jesus Christ...',
      videoUrl: 'https://example.com/videos/lesson1.mp4',
      duration: 1800,
      isPublished: true,
    },
    {
      title: 'The Vision Behind Every Crusade',
      description: 'Casting and communicating the vision',
      module: modules[0]._id,
      order: 1,
      content:
        'Every successful crusade starts with a clear vision from God. Learn how to receive and communicate this vision...',
      duration: 2400,
      isPublished: true,
    },
    // Module 2 lessons
    {
      title: 'Venue Selection',
      description: 'How to choose the right venue for your crusade',
      module: modules[1]._id,
      order: 0,
      content:
        'Selecting the right venue is crucial for crusade success. Consider factors like accessibility, capacity, and cost...',
      duration: 2100,
      isPublished: true,
    },
    {
      title: 'Building Your Team',
      description: 'Assembling and organizing your crusade team',
      module: modules[1]._id,
      order: 1,
      content:
        'A crusade requires many committed workers. Learn how to recruit, train, and organize your team...',
      duration: 2700,
      isPublished: true,
    },
    {
      title: 'Publicity and Promotion',
      description: 'Getting the word out effectively',
      module: modules[1]._id,
      order: 2,
      content:
        'Effective publicity is essential for drawing crowds. Explore various promotion strategies...',
      duration: 1800,
      isPublished: true,
    },
  ]);

  // Update modules with lessons
  await Module.findByIdAndUpdate(modules[0]._id, {
    lessons: [lessons[0]._id, lessons[1]._id],
  });
  await Module.findByIdAndUpdate(modules[1]._id, {
    lessons: [lessons[2]._id, lessons[3]._id, lessons[4]._id],
  });

  console.log(`Created ${modules.length} modules and ${lessons.length} lessons`);
  return { modules, lessons };
}

async function seedForums(courses: mongoose.Document[], users: mongoose.Document[]) {
  console.log('Seeding forums...');

  const course = courses[0];
  const admin = users.find((u: any) => u.role === UserRole.ADMIN);
  const user = users.find((u: any) => u.role === UserRole.USER);

  const forum = await Forum.create({
    course: course._id,
    title: 'Crusade Planning Discussion',
    description: 'Discuss crusade planning topics with fellow students',
    isLocked: false,
    createdBy: admin?._id,
  });

  const post = await ForumPost.create({
    forum: forum._id,
    user: user?._id,
    title: 'Tips for first-time crusade organizers',
    content:
      'Hello everyone! I\'m organizing my first crusade and would love to hear tips from those who have done it before. What are the most important things to consider?',
    isPinned: false,
    isLocked: false,
    viewCount: 15,
  });

  await Forum.findByIdAndUpdate(forum._id, { postCount: 1 });

  console.log('Created 1 forum with 1 post');
  return [forum];
}

async function seedSiteConfig() {
  console.log('Seeding site configuration...');

  await SiteConfig.create({
    siteName: 'Rhapsody Training Suite',
    siteDescription:
      'Training platform for crusade organization, outreach ministry, and leadership development',
    contactEmail: 'info@rhapsody.org',
    supportEmail: 'support@rhapsody.org',
    logoUrl: '/images/logo.png',
    socialLinks: {
      facebook: 'https://facebook.com/rhapsody',
      twitter: 'https://twitter.com/rhapsody',
      instagram: 'https://instagram.com/rhapsody',
      youtube: 'https://youtube.com/rhapsody',
    },
    paymentSettings: {
      isPaymentEnabled: true,
      defaultCurrency: 'NGN',
      providers: ['paystack', 'flutterwave'],
    },
    liveStreamSettings: {
      isEnabled: true,
      defaultProvider: 'youtube',
      providers: ['youtube', 'vimeo', 'custom'],
    },
    emailSettings: {
      fromName: 'Rhapsody Training',
      fromEmail: 'noreply@rhapsody.org',
    },
    features: {
      enableForums: true,
      enableRatings: true,
      enableCertificates: true,
      enableLiveStreaming: true,
    },
    theme: {
      primaryColor: '#4F46E5',
      secondaryColor: '#10B981',
    },
  });

  console.log('Site configuration created');
}

async function seedAnnouncements(users: mongoose.Document[]) {
  console.log('Seeding announcements...');

  const admin = users.find((u: any) => u.role === UserRole.ADMIN);

  await Announcement.insertMany([
    {
      title: 'Welcome to Rhapsody Training Suite!',
      content:
        'We are excited to launch our new training platform. Explore our courses and start your journey to becoming an effective ministry worker.',
      createdBy: admin?._id,
      isActive: true,
      priority: 'high',
    },
    {
      title: 'New Course: Advanced Outreach Strategies',
      content:
        'We just released a new course on advanced outreach strategies. Check it out and take your ministry to the next level!',
      createdBy: admin?._id,
      isActive: true,
      priority: 'medium',
    },
  ]);

  console.log('Created 2 announcements');
}

async function seed() {
  await connectDB();

  const shouldClear = process.argv.includes('--clear');
  if (shouldClear) {
    await clearDatabase();
  }

  try {
    const users = await seedUsers();
    const categories = await seedCategories();
    const courses = await seedCourses(users, categories);
    const { lessons } = await seedModulesAndLessons(courses);
    await seedForums(courses, users);
    await seedSiteConfig();
    await seedAnnouncements(users);

    console.log('\n========================================');
    console.log('Database seeded successfully!');
    console.log('========================================');
    console.log('\nTest accounts:');
    console.log('Admin: admin@rhapsody.org / password123');
    console.log('Instructor: instructor@rhapsody.org / password123');
    console.log('User: user@rhapsody.org / password123');
    console.log('========================================\n');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

seed();
