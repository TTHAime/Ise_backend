import 'dotenv/config';
import { z } from 'zod';

const timeZoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;

const Env = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  TZ: z.string().regex(timeZoneRegex, 'Invalid timezone format'),
  PORT: z.coerce.number().default(4000),
  // CORS
  APP_ORIGIN: z.url(),
  // DATABASE
  DATABASE_URL: z.url(),
  // JWT / SESSION
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT Access Secret must be at least 32 characters'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT Refresh Secret must be at least 32 characters'),
  // Google
  GOOGLE_CLIENT_ID: z.string().min(1, 'Google Client ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'Google Client Secret is required'),
  OAUTH_REDIRECT_URI: z.url('Invalid OAuth redirect URI'),
  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME is required'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY is required'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET is required'),
  // SMTP
  SMTP_HOST: z.string().default('smtp-relay.brevo.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.email('Must be valid email'),
  SMTP_PASS: z.string().min(1, 'SMTP password required'),
  EMAIL_SENDER: z.email('Must be valid email'),
});

export const config = Env.parse(process.env);
