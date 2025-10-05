import { Response, CookieOptions } from 'express';
import { config } from '../libs/config';
import { addDays, addMinutes } from 'date-fns';

export const REFRESH_PATH = '/auth/refresh';

const isDev = config.NODE_ENV === 'development';

// - Dev: sameSite='lax', secure=false (สะดวกทดสอบ, ส่ง cookie ใน top-level redirect เช่น OAuth ได้)
// - Prod: sameSite='none', secure=true (รองรับ cross-site fetch + OAuth redirect)

const decideSameSite = (): Exclude<
  CookieOptions['sameSite'],
  boolean | undefined
> => (isDev ? 'lax' : 'none');
const decideSecure = () => !isDev;

const defaultCookieOptions: CookieOptions = {
  sameSite: decideSameSite(),
  httpOnly: true,
  secure: decideSecure(),
};

// Access Token
export const getAccessTokenCookieOptions = (): CookieOptions => ({
  ...defaultCookieOptions,
  path: '/',
  expires: addMinutes(new Date(), 15),
});

// Refresh Token
export const getRefreshTokenCookieOptions = (): CookieOptions => ({
  ...defaultCookieOptions,
  expires: addDays(new Date(), 30),
  path: REFRESH_PATH,
});

type Params = {
  res: Response;
  accessToken: string;
  refreshToken: string;
};

export const setAuthCookie = ({ res, accessToken, refreshToken }: Params) =>
  res
    .cookie('accessToken', accessToken, getAccessTokenCookieOptions())
    .cookie('refreshToken', refreshToken, getRefreshTokenCookieOptions());

export const clearAuthCookie = (res: Response) =>
  res
    .clearCookie('accessToken', { path: '/' })
    .clearCookie('refreshToken', { path: REFRESH_PATH });

// ใช้สำหรับ Google OAuth state (กัน CSRF)
export const setOAuthStateCookie = (res: Response, state: string) =>
  res.cookie('g_state', state, {
    httpOnly: true,
    sameSite: decideSameSite(), // 'lax' (dev) / 'none' (prod)
    secure: decideSecure(),
    maxAge: 5 * 60 * 1000, // 5 นาที
    path: '/auth/google',
  });

export const clearOAuthStateCookie = (res: Response) =>
  res.clearCookie('g_state', { path: '/auth/google' });
