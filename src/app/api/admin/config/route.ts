import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import SiteConfig from '@/models/SiteConfig';
import { withAdmin, AuthenticatedRequest, optionalAuth } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updateSiteConfigSchema } from '@/lib/validations/admin';
import { successResponse, handleApiError } from '@/lib/utils/api-response';
import { UserRole } from '@/types';

// GET - Get site configuration
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    let config = await SiteConfig.findOne();

    // Create default config if none exists
    if (!config) {
      config = await SiteConfig.create({
        siteName: 'Rhapsody Training Suite',
        siteDescription: 'A comprehensive training platform for missions and outreach.',
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
    }

    // Only return sensitive settings to admin
    if (request.user?.role !== UserRole.ADMIN) {
      return successResponse({
        siteName: config.siteName,
        siteDescription: config.siteDescription,
        logo: config.logo,
        favicon: config.favicon,
        primaryColor: config.primaryColor,
        secondaryColor: config.secondaryColor,
        socialLinks: config.socialLinks,
        maintenanceMode: config.maintenanceMode,
      });
    }

    return successResponse(config);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update site configuration (admin only)
async function putHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, updateSiteConfigSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    let config = await SiteConfig.findOne();

    if (!config) {
      // Create config with provided data
      config = await SiteConfig.create(validation.data);
    } else {
      // Update existing config
      config = await SiteConfig.findByIdAndUpdate(
        config._id,
        { $set: validation.data },
        { new: true, runValidators: true }
      );
    }

    return successResponse(config, 'Site configuration updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return optionalAuth(request, getHandler);
}

export async function PUT(request: NextRequest) {
  return withAdmin(request, putHandler);
}
