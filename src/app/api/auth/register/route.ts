import { NextRequest } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations/auth';
import { validateBody } from '@/middleware/validate';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response';
import { sendEmail, getVerificationEmailTemplate } from '@/lib/utils/email';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, registerSchema);
    if (!validation.success) {
      return validation.response;
    }

    const { name, email, password } = validation.data;

    await connectDB();

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return errorResponse('An account with this email already exists', 409);
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      verificationToken,
      isVerified: false,
    });

    // Send verification email
    try {
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`;
      await sendEmail({
        to: email,
        subject: 'Verify your email - Rhapsody Training Suite',
        html: getVerificationEmailTemplate(name, verificationUrl),
      });
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }

    return successResponse(
      {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      'Registration successful. Please check your email to verify your account.',
      201
    );
  } catch (error) {
    return handleApiError(error);
  }
}
