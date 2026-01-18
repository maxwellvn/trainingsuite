import { Types } from 'mongoose';

// Enums
export enum UserRole {
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  USER = 'user',
}

export enum CourseStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum EnrollmentStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  REFUNDED = 'refunded',
}

export enum LiveSessionStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  ENDED = 'ended',
  CANCELLED = 'cancelled',
}

export enum NotificationType {
  COURSE_ENROLLED = 'course_enrolled',
  COURSE_COMPLETED = 'course_completed',
  CERTIFICATE_ISSUED = 'certificate_issued',
  LIVE_SESSION_REMINDER = 'live_session_reminder',
  LIVE_SESSION_STARTED = 'live_session_started',
  NEW_ANNOUNCEMENT = 'new_announcement',
  NEW_COURSE_CONTENT = 'new_course_content',
  PAYMENT_SUCCESS = 'payment_success',
  FORUM_REPLY = 'forum_reply',
  COMMENT_REPLY = 'comment_reply',
}

// User Types
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  bio?: string;
  title?: string;
  phone?: string;
  isVerified: boolean;
  verificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Category Types
export interface ICategory {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Course Types
export interface ICourse {
  _id: Types.ObjectId;
  title: string;
  description: string;
  slug: string;
  thumbnail?: string;
  previewVideo?: string;
  instructor: Types.ObjectId;
  category: Types.ObjectId;
  price: number;
  isFree: boolean;
  status: CourseStatus;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // in minutes
  enrollmentCount: number;
  rating: number;
  ratingCount: number;
  requirements?: string[];
  objectives?: string[];
  tags?: string[];
  isPublished: boolean;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Module Types
export interface IModule {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  course: Types.ObjectId;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Lesson Types
export interface ILesson {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  content?: string;
  type: 'video' | 'text';
  videoUrl?: string;
  videoDuration?: number; // in seconds
  module: Types.ObjectId;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Material Types
export interface IMaterial {
  _id: Types.ObjectId;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  lesson: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Enrollment Types
export interface IEnrollment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  status: EnrollmentStatus;
  progress: number; // percentage
  completedLessons: Types.ObjectId[];
  startedAt: Date;
  completedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Certificate Types
export interface ICertificate {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  certificateNumber: string;
  certificateUrl?: string;
  issuedAt: Date;
  createdAt: Date;
}

// Forum Types
export interface IForum {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  course?: Types.ObjectId;
  createdBy: Types.ObjectId;
  isGeneral: boolean;
  isActive: boolean;
  postCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IForumPost {
  _id: Types.ObjectId;
  forum: Types.ObjectId;
  user: Types.ObjectId;
  title: string;
  content: string;
  isPinned: boolean;
  isLocked: boolean;
  viewCount: number;
  commentCount: number;
  likes: number;
  likedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Comment Types
export interface IComment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  content: string;
  post?: Types.ObjectId;
  lesson?: Types.ObjectId;
  parent?: Types.ObjectId;
  isEdited: boolean;
  likes: number;
  likedBy: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Rating Types
export interface IRating {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  rating: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Live Session Types
export interface ILiveSession {
  _id: Types.ObjectId;
  title: string;
  description?: string;
  course?: Types.ObjectId;
  instructor: Types.ObjectId;
  streamUrl?: string;
  streamProvider?: 'youtube' | 'vimeo' | 'custom';
  scheduledAt: Date;
  duration?: number; // in minutes
  status: LiveSessionStatus;
  thumbnail?: string;
  recordingUrl?: string;
  maxAttendees?: number;
  attendeeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILiveAttendance {
  _id: Types.ObjectId;
  session: Types.ObjectId;
  user: Types.ObjectId;
  joinedAt: Date;
  leftAt?: Date;
  duration: number; // in seconds
}

// Payment Types
export interface IPayment {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  course: Types.ObjectId;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: string;
  provider: 'stripe' | 'paystack';
  transactionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Site Config Types
export interface ISiteConfig {
  _id: Types.ObjectId;
  siteName: string;
  siteDescription?: string;
  logo?: string;
  favicon?: string;
  primaryColor?: string;
  secondaryColor?: string;
  enablePayments: boolean;
  defaultPaymentProvider: 'stripe' | 'paystack';
  enableLiveStreaming: boolean;
  defaultStreamProvider: 'youtube' | 'vimeo' | 'custom';
  enableForums: boolean;
  enableComments: boolean;
  enableRatings: boolean;
  enableCertificates: boolean;
  maintenanceMode: boolean;
  contactEmail?: string;
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Announcement Types
export interface IAnnouncement {
  _id: Types.ObjectId;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  isActive: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Notification Types
export interface INotification {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}
