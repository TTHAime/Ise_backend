import { NOT_FOUND, OK } from '../libs/http';
import { prisma } from '../libs/prisma';
import {
  changePassword,
  updateDisplayName,
  updateProfileImg,
} from '../services/user.service';
import appAssert from '../utils/appAssert';
import catchErrors from '../utils/catchErrors';
import { clearAuthCookie } from '../utils/cookie';
import { selectUserWithoutPassword } from '../utils/omitPassword';
import {
  changePasswordSchema,
  updateDisplayNameSchema,
} from './z-schema/user.schema';

export const getUserHandle = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, NOT_FOUND, 'User not found');

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: selectUserWithoutPassword,
  });
  appAssert(user, NOT_FOUND, 'User not found');
  return res.status(OK).json({ user });
});
export const updateDisplayNameHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, NOT_FOUND, 'User not found');

  const data = updateDisplayNameSchema.parse(req.body);
  const user = await updateDisplayName(userId, data);

  return res.status(OK).json({
    user,
    message: 'Display name update successfully',
  });
});

export const updateProfileImgHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, NOT_FOUND, 'User not found');

  const user = await updateProfileImg({
    userId,
    fileBuffer: req.file?.buffer,
  });

  res.status(OK).json({ user });
});

export const changePasswordHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, NOT_FOUND, 'User not authenticated');

  const data = changePasswordSchema.parse(req.body);
  await changePassword(userId, data);

  return clearAuthCookie(res).status(OK).json({
    message: 'Password change successfully. Please login again',
  });
});
