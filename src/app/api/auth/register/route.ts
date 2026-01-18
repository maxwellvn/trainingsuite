import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db/connect';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations/auth';
import { validateBody } from '@/middleware/validate';
import { errorResponse, handleApiError } from '@/lib/utils/api-response';
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

    // Send verification email (don't wait, don't fail registration if email fails)
    sendEmail({
      to: email,
      subject: 'Verify your email - Rhapsody Training Suite',
      html: getVerificationEmailTemplate(name, `${process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL}/verify-email?token=${verificationToken}`),
    }).catch((emailError) => {
      console.error('Failed to send verification email:', emailError);
    });

    // Create JWT token (same as login)
    const token = jwt.sign(
      {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isVerified: user.isVerified,
      },
      process.env.AUTH_SECRET!,
      { expiresIn: '30d' }
    );

    const userData = {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      avatar: user.avatar,
      bio: user.bio,
      phone: user.phone,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Registration successful. A verification email has been sent to your email address.',
      data: { user: userData, token },
    }, { status: 201 });

    // Set HTTP-only cookie for the token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
