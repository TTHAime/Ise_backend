import { VerificationCodeType } from '@prisma/client';
import { prisma } from '../libs/prisma';
import { compareValue, hashValue } from '../utils/bcrypt';
import { addDays, addHours, addYears, subMinutes } from 'date-fns';
import appAssert from '../utils/appAssert';
import {
  BAD_GATEWAY,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
} from '../libs/http';
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from '../utils/jwt';
import { sendMail } from '../utils/sendmail';
import {
  getPasswordResetTemplate,
  getVerifyEmailTemplate,
} from '../utils/emailTemplate';
import { config } from '../libs/config';
import { selectUserWithoutPassword } from '../utils/omitPassword';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { setDefaultCategories } from './category.service';

/** 24 hours in ms – used to decide when to extend session/refresh token. */
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type CreateAccountParams = {
  email: string;
  password: string;
  userAgent?: string;
};

export const createAccount = async (data: CreateAccountParams) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  appAssert(!existingUser, CONFLICT, 'Email already in use');

  // Hashes password.
  const passwordHash = await hashValue(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
    },
    select: selectUserWithoutPassword,
  });

  const verificationCode = await prisma.verificationCode.create({
    data: {
      userId: user.id,
      type: VerificationCodeType.EmailVerification,
      expiresAt: addYears(new Date(), 1),
    },
  });

  // Creates an email verification code and sends an email
  const url = `${config.APP_ORIGIN}/email/verify/${verificationCode.id}`;
  try {
    await sendMail({
      to: user.email,
      ...getVerifyEmailTemplate(url),
    });
    console.log('Verification email sent successfully');
  } catch (error) {
    console.error('Failed to send verification email:', error);
  }

  // initial session + tokens
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      userAgent: data.userAgent,
    },
  });

  const refreshToken = signToken(
    { sessionId: session.id },
    refreshTokenSignOptions
  );

  const accessToken = signToken({ userId: user.id, sessionId: session.id });

  return {
    user: user,
    accessToken,
    refreshToken,
  };
};

export type LoginParams = {
  email: string;
  password: string;
  userAgent?: string;
};

export const loginUser = async ({
  email,
  password,
  userAgent,
}: LoginParams) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  appAssert(user, UNAUTHORIZED, 'Invalid email or password');
  appAssert(user.passwordHash, UNAUTHORIZED, 'Invalid email or password');

  const isPasswordValid = await compareValue(password, user.passwordHash);
  appAssert(isPasswordValid, UNAUTHORIZED, 'Invalid email or password');

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      userAgent,
    },
  });
  const sessionInfo = {
    sessionId: session.id,
  };
  const refreshToken = signToken(sessionInfo, refreshTokenSignOptions);
  const accessToken = signToken({ userId: user.id, ...sessionInfo });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      verified: user.verified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    accessToken,
    refreshToken,
  };
};

export const refreshUserAccessToken = async (refreshToken: string) => {
  //Validates refresh token and session.
  const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
    secret: refreshTokenSignOptions.secret,
  });
  appAssert(payload, UNAUTHORIZED, 'Invalid refresh token');

  const { sessionId } = payload;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });
  const now = Date.now();
  appAssert(
    session && session.expiresAt.getTime() > now,
    UNAUTHORIZED,
    'Session expired'
  );
  // refresh the session if it expires in the next 24 hours
  const sessionNeedRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;
  if (sessionNeedRefresh) {
    await prisma.session.updateMany({
      where: {
        id: session.id,
        expiresAt: { lte: new Date(now + ONE_DAY_MS) },
      },
      data: { expiresAt: addDays(now, 30) },
    });
  }

  const newRefreshToken = sessionNeedRefresh
    ? signToken(
        {
          sessionId: session.id,
        },
        refreshTokenSignOptions
      )
    : undefined;

  const accessToken = signToken({
    userId: session.userId,
    sessionId: session.id,
  });

  return {
    accessToken,
    newRefreshToken,
  };
};
export const verifyEmail = async (code: string) => {
  // Verify email using a verification code
  const validCode = await prisma.verificationCode.findFirst({
    where: {
      id: code,
      type: VerificationCodeType.EmailVerification,
      expiresAt: {
        gt: new Date(), //not expired
      },
    },
  });
  appAssert(validCode, NOT_FOUND, 'Invalid or expired verification code');

  const updatedUser = await prisma.user.update({
    where: { id: validCode.userId },
    data: { verified: true },
    select: { id: true, email: true, verified: true },
  });
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, 'Failed to verify email');

  await prisma.verificationCode.delete({
    where: { id: validCode.id },
  });

  return {
    updatedUser,
  };
};

/**
 * Send a password reset email with a short-lived verification code.
 * - Rate-limited: at most ~2 codes per 5 minutes (count <= 1).
 * - Returns messageId and reset URL for logging/tests.
 */
export const sendPasswordResetEmail = async (email: string) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  appAssert(user, NOT_FOUND, 'User not found');

  const fiveMinAgo = subMinutes(new Date(), 5);
  const count = await prisma.verificationCode.count({
    where: {
      userId: user.id,
      type: 'PasswordReset',
      createdAt: { gt: fiveMinAgo },
    },
  });
  appAssert(
    count <= 1,
    TOO_MANY_REQUESTS,
    'Too many request, please try again later'
  );

  const expiresAt = addHours(new Date(), 1);
  const verificationCode = await prisma.verificationCode.create({
    data: {
      userId: user.id,
      type: 'PasswordReset',
      expiresAt: expiresAt,
    },
  });

  const url = `${config.APP_ORIGIN}/password/reset?code=${verificationCode.id}&exp=${expiresAt.getTime()}`;

  try {
    const data = await sendMail({
      to: user.email,
      ...getPasswordResetTemplate(url),
    });

    appAssert(data?.messageId, INTERNAL_SERVER_ERROR, 'Failed to send email');

    return {
      url,
      emailId: data.messageId,
    };
  } catch (error) {
    appAssert(
      false,
      INTERNAL_SERVER_ERROR,
      `Email sending failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
};

type ResetPasswordParams = {
  password: string;
  verificationCode: string;
};

/**
 * Reset password with a valid verification code.
 * - Hashes new password, updates user, deletes the code.
 * - Revokes all existing sessions for the user (forces re-login).
 */
export const resetPassword = async ({
  password,
  verificationCode,
}: ResetPasswordParams) => {
  const validCode = await prisma.verificationCode.findFirst({
    where: {
      id: verificationCode,
      type: VerificationCodeType.PasswordReset,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
  appAssert(validCode, NOT_FOUND, 'Invalid or expired verification code');

  const passwordHash = await hashValue(password);

  const updatedUser = await prisma.user.update({
    where: { id: validCode.userId },
    data: { passwordHash },
    select: selectUserWithoutPassword,
  });
  appAssert(updatedUser, INTERNAL_SERVER_ERROR, 'Failed to reset password');

  await prisma.verificationCode.delete({
    where: { id: validCode.id },
  });

  await prisma.session.deleteMany({
    where: { userId: updatedUser.id },
  });

  return {
    user: updatedUser,
  };
};

/** Create a configured Google OAuth2 client instance. */
const getOAuthClient = () =>
  new OAuth2Client({
    clientId: config.GOOGLE_CLIENT_ID,
    clientSecret: config.GOOGLE_CLIENT_SECRET,
    redirectUri: config.OAUTH_REDIRECT_URI,
  });

/**
 * Generate Google OAuth authorization URL.
 * - Uses "offline" access + "consent" to ensure refresh token issuance.
 * - Attach `state` for CSRF protection (store+verify with a cookie or server session).
 */
export function createGoogleAuthUrl(state?: string) {
  const client = getOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

/**
 * Exchange authorization code for tokens and verify the ID token.
 * Returns essential profile fields plus the raw tokens for caller use.
 */
export async function exchangeCodeAndGetProfile(code: string) {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  appAssert(tokens.id_token, BAD_GATEWAY, 'Missing id_token from Google');

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: config.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload() as TokenPayload;

  return {
    googleId: payload.sub!,
    email: payload.email ?? '',
    emailVerified: !!payload.email_verified,
    name: payload.name ?? '',
    picture: payload.picture ?? '',
    tokens,
  };
}

/**
 * Upsert user via Google profile.
 * - If no user exists (by googleId/email): create + seed default categories.
 * - If user exists but no googleId bound: link googleId and update profile.
 * - Always creates a session and returns access/refresh tokens.
 */
export async function loginWithGoogleProfile(p: {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string;
  userAgent?: string;
}) {
  appAssert(
    p.email && p.emailVerified,
    UNAUTHORIZED,
    'Google email is not verified'
  );

  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId: p.googleId }, { email: p.email }] },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: p.email,
        displayName: p.name || undefined,
        profileImage: p.picture || undefined,
        provider: 'GOOGLE',
        googleId: p.googleId,
        verified: true,
      },
    });
    await setDefaultCategories(user.id);
  } else if (!user.googleId) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        googleId: p.googleId,
        provider: 'GOOGLE',
        verified: true,
        ...(p.name ? { displayName: p.name } : {}),
        ...(p.picture ? { profileImage: p.picture } : {}),
      },
    });
  }

  const session = await prisma.session.create({
    data: {
      userId: user.id,
      userAgent: p.userAgent,
    },
  });

  const accessToken = signToken({ userId: user.id, sessionId: session.id });
  const refreshToken = signToken(
    { sessionId: session.id },
    refreshTokenSignOptions
  );

  return { user, accessToken, refreshToken };
}
