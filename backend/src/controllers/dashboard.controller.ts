import { BAD_REQUEST, OK } from '../libs/http';
import { getDashboardStats } from '../services/dashboard.service';
import appAssert from '../utils/appAssert';
import catchErrors from '../utils/catchErrors';

export const getDashboardHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const stats = await getDashboardStats(userId);

  return res.status(OK).json({
    message: 'Dashboard stats retrieved successfully',
    data: stats,
  });
});
