import { ErrorRequestHandler, Response } from 'express';
import { BAD_REQUEST, INTERNAL_SERVER_ERROR } from '../libs/http';
import { z } from 'zod';
import AppError from '../utils/AppError';
import { clearAuthCookie, REFRESH_PATH } from '../utils/cookie';
import multer, { MulterError } from 'multer';

const handleZodError = (res: Response, error: z.ZodError) => {
  const errors = error.issues.map(err => ({
    path: err.path.join('.'),
    message: err.message,
  }));
  return res.status(BAD_REQUEST).json({
    message: error.message,
    errors,
  });
};

const handleAppError = (res: Response, error: AppError) => {
  return res.status(error.statusCode).json({
    message: error.message,
    errorCode: error.errorCode,
  });
};

const handleMulterError = (res: Response, error: MulterError | Error) => {
  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(413).json({
          message: 'File too large',
          errorCode: 'UPLOAD_LIMIT_FILE_SIZE',
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          message: 'Too many files',
          errorCode: 'UPLOAD_LIMIT_FILE_COUNT',
        });
      case 'LIMIT_FIELD_KEY':
      case 'LIMIT_FIELD_VALUE':
      case 'LIMIT_FIELD_COUNT':
      case 'LIMIT_PART_COUNT':
        return res.status(400).json({
          message: 'Multipart field limit exceeded',
          errorCode: error.code,
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          message: 'Unexpected file field',
          errorCode: 'UPLOAD_UNEXPECTED_FILE',
        });
      default:
        return res.status(400).json({
          message: 'Upload failed',
          errorCode: error.code,
        });
    }
  }

  // error จาก fileFilter (เช่น mimetype ไม่ผ่าน)
  return res.status(400).json({
    message: error.message || 'Invalid file',
    errorCode: 'UPLOAD_INVALID_FILE',
  });
};

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log(`PATH: ${req.path}`, error);

  if (req.path === REFRESH_PATH) {
    clearAuthCookie(res);
  }

  if (error instanceof z.ZodError) {
    return handleZodError(res, error);
  }

  if (error instanceof AppError) {
    return handleAppError(res, error);
  }

  if (error instanceof multer.MulterError || error?.name === 'MulterError') {
    return handleMulterError(res, error as MulterError);
  }

  if (
    error instanceof Error &&
    req.headers['content-type']?.includes('multipart/form-data')
  ) {
    return handleMulterError(res, error);
  }

  return res.status(INTERNAL_SERVER_ERROR).send('Internal Server Error');
};

export default errorHandler;
