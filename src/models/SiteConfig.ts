import mongoose, { Schema } from 'mongoose';
import { ISiteConfig } from '@/types';

const siteConfigSchema = new Schema<ISiteConfig>(
  {
    siteName: {
      type: String,
      required: true,
      default: 'Rhapsody Training Suite',
    },
    siteDescription: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    logo: {
      type: String,
    },
    favicon: {
      type: String,
    },
    primaryColor: {
      type: String,
      default: '#3B82F6',
    },
    secondaryColor: {
      type: String,
      default: '#10B981',
    },
    enablePayments: {
      type: Boolean,
      default: true,
    },
    defaultPaymentProvider: {
      type: String,
      enum: ['stripe', 'paystack'],
      default: 'stripe',
    },
    enableLiveStreaming: {
      type: Boolean,
      default: true,
    },
    defaultStreamProvider: {
      type: String,
      enum: ['youtube', 'vimeo', 'custom'],
      default: 'youtube',
    },
    enableForums: {
      type: Boolean,
      default: true,
    },
    enableComments: {
      type: Boolean,
      default: true,
    },
    enableRatings: {
      type: Boolean,
      default: true,
    },
    enableCertificates: {
      type: Boolean,
      default: true,
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
    contactEmail: {
      type: String,
    },
    socialLinks: {
      facebook: String,
      twitter: String,
      instagram: String,
      youtube: String,
    },
  },
  {
    timestamps: true,
  }
);

const SiteConfig = mongoose.models.SiteConfig || mongoose.model<ISiteConfig>('SiteConfig', siteConfigSchema);

export default SiteConfig;
