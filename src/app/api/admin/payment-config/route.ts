import { NextRequest } from 'next/server';
import connectDB from '@/lib/db/connect';
import SiteConfig from '@/models/SiteConfig';
import { withAdmin, AuthenticatedRequest } from '@/middleware/auth';
import { validateBody } from '@/middleware/validate';
import { updatePaymentConfigSchema } from '@/lib/validations/payment';
import { successResponse, handleApiError } from '@/lib/utils/api-response';

// GET - Get payment configuration
async function getHandler(request: AuthenticatedRequest) {
  try {
    await connectDB();

    const config = await SiteConfig.findOne();

    return successResponse({
      enablePayments: config?.enablePayments ?? true,
      defaultPaymentProvider: config?.defaultPaymentProvider ?? 'stripe',
      // Don't expose actual API keys, just show if they're configured
      stripeConfigured: !!process.env.STRIPE_SECRET_KEY,
      paystackConfigured: !!process.env.PAYSTACK_SECRET_KEY,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update payment configuration
async function putHandler(request: AuthenticatedRequest) {
  try {
    const validation = await validateBody(request, updatePaymentConfigSchema);
    if (!validation.success) {
      return validation.response;
    }

    await connectDB();

    let config = await SiteConfig.findOne();

    const updateData: Record<string, unknown> = {};
    if (validation.data.enablePayments !== undefined) {
      updateData.enablePayments = validation.data.enablePayments;
    }
    if (validation.data.defaultPaymentProvider) {
      updateData.defaultPaymentProvider = validation.data.defaultPaymentProvider;
    }

    if (!config) {
      config = await SiteConfig.create(updateData);
    } else {
      config = await SiteConfig.findByIdAndUpdate(
        config._id,
        { $set: updateData },
        { new: true }
      );
    }

    return successResponse(
      {
        enablePayments: config?.enablePayments,
        defaultPaymentProvider: config?.defaultPaymentProvider,
      },
      'Payment configuration updated successfully'
    );
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  return withAdmin(request, getHandler);
}

export async function PUT(request: NextRequest) {
  return withAdmin(request, putHandler);
}
