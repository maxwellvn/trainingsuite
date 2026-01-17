import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trainingsuite';

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Import models after connection
    const User = (await import('@/models/User')).default;
    const Category = (await import('@/models/Category')).default;
    const Course = (await import('@/models/Course')).default;
    const Module = (await import('@/models/Module')).default;
    const Lesson = (await import('@/models/Lesson')).default;
    const Forum = (await import('@/models/Forum')).default;
    const SiteConfig = (await import('@/models/SiteConfig')).default;

    // Clear existing data (optional - comment out in production)
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Category.deleteMany({});
    await Course.deleteMany({});
    await Module.deleteMany({});
    await Lesson.deleteMany({});
    await Forum.deleteMany({});
    await SiteConfig.deleteMany({});

    // Create admin user
    console.log('Creating admin user...');
    const hashedPassword = await bcrypt.hash('Admin123!', 12);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@rhapsody.org',
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    });

    // Create instructor
    const instructor = await User.create({
      name: 'Pastor John',
      email: 'instructor@rhapsody.org',
      password: hashedPassword,
      role: 'instructor',
      isVerified: true,
      bio: 'Experienced missions leader with 15 years of ministry experience.',
    });

    // Create regular user
    await User.create({
      name: 'Test User',
      email: 'user@rhapsody.org',
      password: hashedPassword,
      role: 'user',
      isVerified: true,
    });

    // Create categories
    console.log('Creating categories...');
    const categories = await Category.insertMany([
      {
        name: 'Evangelism & Outreach',
        description: 'Learn effective evangelism strategies and outreach techniques',
        slug: 'evangelism-outreach',
        isActive: true,
      },
      {
        name: 'Crusade Organization',
        description: 'Master the art of planning and executing large-scale crusades',
        slug: 'crusade-organization',
        isActive: true,
      },
      {
        name: 'Missions Training',
        description: 'Comprehensive training for international missions',
        slug: 'missions-training',
        isActive: true,
      },
      {
        name: 'Leadership Development',
        description: 'Develop your leadership skills for ministry',
        slug: 'leadership-development',
        isActive: true,
      },
      {
        name: 'Discipleship',
        description: 'Learn how to effectively disciple new believers',
        slug: 'discipleship',
        isActive: true,
      },
    ]);

    // Create courses
    console.log('Creating courses...');
    const course1 = await Course.create({
      title: 'Fundamentals of Crusade Organization',
      description:
        'Learn the essential principles of organizing successful crusades. This comprehensive course covers everything from initial planning to post-event follow-up.',
      slug: 'fundamentals-crusade-organization',
      instructor: instructor._id,
      category: categories[1]._id,
      price: 0,
      isFree: true,
      status: 'published',
      isPublished: true,
      level: 'beginner',
      requirements: [
        'Basic understanding of ministry',
        'Desire to serve in missions',
      ],
      objectives: [
        'Understand the key components of crusade planning',
        'Learn how to coordinate teams effectively',
        'Master logistics management',
        'Develop follow-up strategies',
      ],
      tags: ['crusade', 'evangelism', 'planning'],
    });

    const course2 = await Course.create({
      title: 'Advanced Missions Strategy',
      description:
        'Take your missions work to the next level with advanced strategies for reaching unreached people groups.',
      slug: 'advanced-missions-strategy',
      instructor: instructor._id,
      category: categories[2]._id,
      price: 49.99,
      isFree: false,
      status: 'published',
      isPublished: true,
      level: 'advanced',
      requirements: [
        'Completion of basic missions training',
        'Field experience preferred',
      ],
      objectives: [
        'Develop culturally sensitive approaches',
        'Create sustainable ministry models',
        'Build local partnerships',
      ],
      tags: ['missions', 'strategy', 'advanced'],
    });

    // Create modules and lessons for course 1
    console.log('Creating modules and lessons...');
    const module1 = await Module.create({
      title: 'Introduction to Crusade Planning',
      description: 'Understanding the foundations of successful crusade organization',
      course: course1._id,
      order: 0,
    });

    await Lesson.insertMany([
      {
        title: 'What is a Crusade?',
        description: 'Understanding the purpose and impact of crusades',
        content: '<h2>Introduction</h2><p>A crusade is a large-scale evangelistic event...</p>',
        module: module1._id,
        order: 0,
        isFree: true,
        isPublished: true,
        videoDuration: 600,
      },
      {
        title: 'Key Principles of Organization',
        description: 'Learn the foundational principles that make crusades successful',
        module: module1._id,
        order: 1,
        isFree: true,
        isPublished: true,
        videoDuration: 900,
      },
    ]);

    const module2 = await Module.create({
      title: 'Team Building & Coordination',
      description: 'How to build and manage effective crusade teams',
      course: course1._id,
      order: 1,
    });

    await Lesson.insertMany([
      {
        title: 'Identifying Key Roles',
        description: 'Understanding the essential team positions',
        module: module2._id,
        order: 0,
        isFree: false,
        isPublished: true,
        videoDuration: 720,
      },
      {
        title: 'Training Your Team',
        description: 'Effective methods for team preparation',
        module: module2._id,
        order: 1,
        isFree: false,
        isPublished: true,
        videoDuration: 840,
      },
    ]);

    // Create a general forum
    console.log('Creating forums...');
    await Forum.create({
      title: 'General Discussion',
      description: 'A place to discuss all things related to missions and outreach',
      createdBy: admin._id,
      isGeneral: true,
      isActive: true,
    });

    // Create course-specific forum
    await Forum.create({
      title: 'Crusade Organization Discussion',
      description: 'Discuss strategies and share experiences about crusade organization',
      course: course1._id,
      createdBy: instructor._id,
      isGeneral: false,
      isActive: true,
    });

    // Create site config
    console.log('Creating site configuration...');
    await SiteConfig.create({
      siteName: 'Rhapsody Training Suite',
      siteDescription: 'A comprehensive training platform for missions and outreach.',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      enablePayments: true,
      defaultPaymentProvider: 'stripe',
      enableLiveStreaming: true,
      defaultStreamProvider: 'youtube',
      enableForums: true,
      enableComments: true,
      enableRatings: true,
      enableCertificates: true,
      maintenanceMode: false,
    });

    console.log('Seed completed successfully!');
    console.log('---');
    console.log('Admin login: admin@rhapsody.org / Admin123!');
    console.log('Instructor login: instructor@rhapsody.org / Admin123!');
    console.log('User login: user@rhapsody.org / Admin123!');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
}

seed();
