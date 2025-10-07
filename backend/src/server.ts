import cookieParser from 'cookie-parser';
import compression from 'compression';
import { config } from './libs/config';
import { prisma } from './libs/prisma';
import express from 'express';
import cors from 'cors';
import errorHandler from './middlewares/errorHandler';
import { OK } from './libs/http';
import authRoutes from './routes/auth.route';
import authenticate from './middlewares/authenticate';
import userRoutes from './routes/user.route';
import sessionRoutes from './routes/session.route';
import transactionRoutes from './routes/transaction.route';
import categoryRoutes from './routes/category.route';
import cloudinary from './libs/cloudinary';
import helmet from 'helmet';
import { createWorker } from 'tesseract.js';
import dashboardRoutes from './routes/dashboard.route';
import reportRoutes from './routes/report.route';

const PORT = config.PORT || 4000;
const app = express();
app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: config.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: config.NODE_ENV === 'production',
  })
);
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  cors({
    origin: config.APP_ORIGIN,
    credentials: true,
  })
);
let isReady = false;

app.get('/', (req, res) => {
  return res.status(OK).json({
    status: 'healthy',
  });
});

app.get('/health', (req, res) =>
  res.status(OK).json({
    status: 'ok',
    uptime: process.uptime(),
    now: new Date().toISOString(),
  })
);

app.get('/ready', (req, res) =>
  isReady
    ? res.status(OK).json({ status: 'ready', now: new Date().toISOString() })
    : res
        .status(503)
        .json({ status: 'not_ready', now: new Date().toISOString() })
);

// ...existing code...
app.use('/auth', authRoutes);

app.use('/user', authenticate, userRoutes);
app.use('/session', authenticate, sessionRoutes);
app.use('/transaction', authenticate, transactionRoutes);
app.use('/category', authenticate, categoryRoutes);
app.use('/dashboard', authenticate, dashboardRoutes);
app.use('/report', authenticate, reportRoutes);

app.use(errorHandler);

// changed: keep server ref for graceful shutdown
let server: ReturnType<typeof app.listen> | null = null;

async function start() {
  console.log('TZ =', process.env.TZ);
  console.log('Now =', new Date().toString());
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('DB connect');
  } catch (err) {
    console.error('DB not ready', err);
    // fail fast for prod so platform can restart
    process.exit(1);
  }

  // mark ready once DB is connected (don't block on optional services)
  isReady = true;

  // optional checks (non-blocking): Cloudinary ping and OCR worker - log but don't fail startup
  (async () => {
    try {
      const res = await cloudinary.api.ping();
      console.log('Cloudinary connected:', res.status);
    } catch (err) {
      console.warn('Cloudinary connection failed (non-fatal):', err);
    }
  })();

  (async () => {
    try {
      // createWorker may download models; run as a quick ping with timeout to avoid long block
      const worker = await Promise.race([
        createWorker('tha+eng'),
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error('OCR init timeout')), 5000)
        ),
      ]);
      // if worker created, terminate immediately (we'll create workers lazily in ocr util)
      // @ts-expect-error worker typing
      await worker?.terminate();
      console.log('[OCR] Tesseract quick check OK');
    } catch (err) {
      console.warn('[OCR] Tesseract quick check failed (non-fatal):', err);
    }
  })();

  server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// changed: graceful shutdown
async function shutdown(code = 0) {
  console.log('Shutting down server...');
  isReady = false;
  try {
    await prisma.$disconnect();
    console.log('Prisma disconnected');
  } catch (err) {
    console.warn('Error disconnecting Prisma', err);
  }
  try {
    server?.close(() => {
      console.log('HTTP server closed');
      process.exit(code);
    });
    // fallback in case close callback not called
    setTimeout(() => process.exit(code), 5000);
  } catch (err) {
    console.error('Error during shutdown', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown(0));
process.on('SIGINT', () => shutdown(0));
process.on('unhandledRejection', reason => {
  console.error('Unhandled Rejection:', reason);
  // optional: shutdown to let platform restart
  shutdown(1);
});
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  shutdown(1);
});

start();
