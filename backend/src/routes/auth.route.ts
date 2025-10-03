import { Router } from 'express';
import {
  googleAuthCallbackHandler,
  googleAuthStartHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
  resetPasswordHandler,
  sendPasswordResetHandler,
  verifyEmailHandler,
} from '../controllers/auth.controller';

const authRoutes = Router();

authRoutes.post('/register', registerHandler);
authRoutes.post('/login', loginHandler);
authRoutes.get('/refresh', refreshHandler);
authRoutes.get('/logout', logoutHandler);
authRoutes.get('/email/verify/:code', verifyEmailHandler);
authRoutes.post('/password/forgot', sendPasswordResetHandler);
authRoutes.post('/password/reset', resetPasswordHandler);

authRoutes.get('/google', googleAuthStartHandler);
authRoutes.get('/google/callback', googleAuthCallbackHandler);

export default authRoutes;
