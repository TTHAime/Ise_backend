import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { prisma } from '../libs/prisma';
import { pctChange, toNum } from '../utils/money';
import { Prisma } from '@prisma/client';

export interface DashboardStats {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  monthlyComparison: {
    income: { current: number; previous: number; percentage: number };
    expense: { current: number; previous: number; percentage: number };
  };
  incomeVsExpenseThisMonth: {
    incomeSharePct: number;
    expenseSharePct: number;
  };
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: string;
    amount: number;
    type: 'INCOME' | 'EXPENSE';
    date: Date;
    description: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
  }>;
}

export const getDashboardStats = async (
  userId: string
): Promise<DashboardStats> => {
  // Setup date ranges for current & previous months
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);

  const prev = subMonths(now, 1);
  const prevMonthStart = startOfMonth(prev);
  const prevMonthEnd = endOfMonth(prev);
  //  Run all aggregate queries
  const [currentStatRaw, prevStatRaw, topCategoriesRaw, recentTransactionsRaw] =
    await Promise.all([
      // Sum of income/expense for current month
      prisma.transaction.groupBy({
        where: {
          userId,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        by: ['type'],
        _sum: { amount: true },
        _count: { _all: true },
      }),
      // Sum for previous month (used for comparison)
      prisma.transaction.groupBy({
        where: {
          userId,
          date: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        by: ['type'],
        _sum: { amount: true },
      }),
      // Top 5 expense categories this month
      prisma.transaction.groupBy({
        where: {
          userId,
          type: 'EXPENSE',
          categoryId: { not: null },
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        by: ['categoryId'],
        _sum: { amount: true },
        _count: { _all: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      // 10 most recent transactions this month
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], // กันกรณีวันที่เท่ากัน
        take: 10,
        select: {
          id: true,
          amount: true,
          description: true,
          type: true,
          date: true,
          category: { select: { name: true, color: true, icon: true } },
        },
      }),
    ]);

  // --- Aggregate totals for current month ---
  const totalIncome = toNum(
    currentStatRaw.find(r => r.type === 'INCOME')?._sum.amount
  );
  const totalExpense = toNum(
    currentStatRaw.find(r => r.type === 'EXPENSE')?._sum.amount
  );
  const netIncome = totalIncome - totalExpense;
  const transactionCount = currentStatRaw.reduce(
    (s, r) => s + r._count._all,
    0
  );

  // Get previous month totals for % comparison ---
  const prevIncome = toNum(
    prevStatRaw.find(r => r.type === 'INCOME')?._sum.amount
  );
  const prevExpense = toNum(
    prevStatRaw.find(r => r.type === 'EXPENSE')?._sum.amount
  );

  // --- Fetch metadata for top expense categories ---
  const catIds = topCategoriesRaw
    .map(r => r.categoryId!)
    .filter(Boolean) as string[];
  const catMetas = catIds.length
    ? await prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : [];
  const catMap = new Map(catMetas.map(c => [c.id, c]));

  // --- Merge category totals with metadata ---
  const topCategories = topCategoriesRaw.map(r => {
    const meta = catMap.get(r.categoryId!);
    const total = toNum(r._sum.amount);
    return {
      categoryId: r.categoryId!,
      categoryName: meta?.name ?? 'Uncategorized',
      categoryColor: meta?.color ?? '#999999',
      categoryIcon: meta?.icon ?? 'tag',
      total,
      count: r._count._all,
      percentage: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
    };
  });

  // Normalize recent transactions
  const recentTransactions = recentTransactionsRaw.map(t => ({
    id: t.id,
    amount: toNum(t.amount as unknown as Prisma.Decimal),
    type: t.type,
    date: t.date,
    description: t.description ?? '—',
    categoryName: t.category?.name ?? '—',
    categoryColor: t.category?.color ?? '#999999',
    categoryIcon: t.category?.icon ?? 'tag',
  }));

  //  Calculate income vs expense share for current month ---
  const sumThisMonth = totalIncome + totalExpense;
  const incomeVsExpenseThisMonth = {
    incomeSharePct: sumThisMonth > 0 ? (totalIncome / sumThisMonth) * 100 : 0,
    expenseSharePct: sumThisMonth > 0 ? (totalExpense / sumThisMonth) * 100 : 0,
  };

  return {
    totalIncome,
    totalExpense,
    netIncome,
    transactionCount,
    monthlyComparison: {
      income: {
        current: totalIncome,
        previous: prevIncome,
        percentage: pctChange(totalIncome, prevIncome),
      },
      expense: {
        current: totalExpense,
        previous: prevExpense,
        percentage: pctChange(totalExpense, prevExpense),
      },
    },
    incomeVsExpenseThisMonth,
    topCategories,
    recentTransactions,
  };
};
