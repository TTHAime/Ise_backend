import { BAD_REQUEST, CREATED, NOT_FOUND, OK } from '../libs/http';
import {
  createTransaction,
  createTransactionBySlip,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction,
} from '../services/transaction.service';
import appAssert from '../utils/appAssert';

import catchErrors from '../utils/catchErrors';
import {
  createTransactionSchema,
  getTransactionsSchema,
  updateTransactionSchema,
} from './z-schema/transaction.schema';

export const createTransactionHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');
  const data = createTransactionSchema.parse(req.body);
  const transaction = await createTransaction({ ...data, userId });

  return res.status(CREATED).json({ transaction });
});

export const createTransactionBySlipHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const transaction = await createTransactionBySlip({
    userId,
    fileBuffer: req.file?.buffer,
  });

  res.status(OK).json({ transaction });
});

export const getTransactionsHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');
  const params = getTransactionsSchema.parse(req.query);
  const result = await getTransactions(userId, params);

  return res.status(OK).json(result);
});

export const getTransactionByIdHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const transaction = await getTransactionById(id, userId);
  appAssert(transaction, NOT_FOUND, 'Transaction not found');

  return res.status(OK).json({ transaction });
});

export const updateTransactionHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  const data = updateTransactionSchema.parse(req.body);
  const transaction = await updateTransaction(id, userId, data);

  return res.status(OK).json({ transaction });
});

export const deleteTransactionHandler = catchErrors(async (req, res) => {
  const userId = req.userId;
  const { id } = req.params;
  appAssert(userId, BAD_REQUEST, 'User not authenticated');

  await deleteTransaction(id, userId);

  return res.status(OK).json({ message: 'Transaction deleted successfully' });
});
