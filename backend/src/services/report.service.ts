import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
} from 'date-fns';
import { prisma } from '../libs/prisma';
import { th } from 'date-fns/locale';

export interface MonthlyReport {
  month: string;
  year: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  dailyData: Array<{
    date: string;
    income: number;
    expense: number;
    count: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    type: 'INCOME' | 'EXPENSE';
    total: number;
    count: number;
    percentage: number;
  }>;
}

export const getMonthlyReport = async (
  userId: string,
  year: number,
  month: number
): Promise<MonthlyReport> => {
  const targetDate = new Date(year, month - 1, 1);
  const monthStart = startOfMonth(targetDate);
  const monthEnd = endOfMonth(targetDate);

  const [monthStats, dailyStats, categoryStats] = await Promise.all([
    // Totals per type for the month.
    prisma.transaction.groupBy({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      by: ['type'],
      _sum: { amount: true },
      _count: { _all: true },
    }),
    // Day-level totals (income/expense) for the month.
    prisma.transaction.groupBy({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      by: ['date', 'type'],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { date: 'asc' },
    }),
    // Category totals within the month (both types).
    prisma.transaction.groupBy({
      where: { userId, date: { gte: monthStart, lte: monthEnd } },
      by: ['categoryId', 'type'],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);
  // Helper to read sums safely.
  const sumAmt = (t: 'INCOME' | 'EXPENSE') =>
    Number(monthStats.find(x => x.type === t)?._sum.amount ?? 0);

  const totalIncome = sumAmt('INCOME');
  const totalExpense = sumAmt('EXPENSE');
  const totalCount = monthStats.reduce((s, x) => s + x._count._all, 0);

  // Build a date → rollup map for daily series.
  const dailyMap = new Map<
    string,
    { income: number; expense: number; count: number }
  >();
  for (const ds of dailyStats) {
    const dateKey = format(ds.date, 'yyyy-MM-dd');
    const cur = dailyMap.get(dateKey) ?? { income: 0, expense: 0, count: 0 };
    const amt = Number(ds._sum.amount ?? 0);
    if (ds.type === 'INCOME') cur.income += amt;
    else cur.expense += amt;
    cur.count += ds._count._all;
    dailyMap.set(dateKey, cur);
  }

  // Collect category metadata
  const categoryIds = [
    ...new Set(
      categoryStats.map(cs => cs.categoryId).filter((id): id is string => !!id)
    ),
  ];
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : [];

  const categoryDict = new Map(categories.map(c => [c.id, c]));

  const totalByType = { INCOME: totalIncome, EXPENSE: totalExpense } as const;

  const categoryBreakdown = categoryStats.map(cs => {
    const amount = Number(cs._sum.amount ?? 0);
    const isNull = cs.categoryId == null;
    const meta = !isNull ? categoryDict.get(cs.categoryId!) : undefined;

    // Normalise ถ้าไม่มีหมวด
    const fallbackId = '__UNCATEGORIZED__';
    const fallbackName = '(ไม่มีหมวดหมู่)';

    return {
      categoryId: isNull ? fallbackId : cs.categoryId!, // ถ้าอยากปล่อย null ก็แก้ type ข้างบนแทน
      categoryName: meta?.name ?? (isNull ? fallbackName : 'Unknown'),
      categoryColor: meta?.color ?? '#9CA3AF', // gray-400
      categoryIcon: meta?.icon ?? 'question',
      type: cs.type,
      total: amount,
      count: cs._count._all,
      percentage:
        totalByType[cs.type] > 0 ? (amount / totalByType[cs.type]) * 100 : 0,
    };
  });

  return {
    month: format(targetDate, 'MMMM', { locale: th }),
    year,
    totalIncome,
    totalExpense,
    netIncome: totalIncome - totalExpense,
    transactionCount: totalCount,
    dailyData: Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    })),
    categoryBreakdown,
  };
};
export interface YearlyReport {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  monthly: Array<{
    month: number; // 1-12
    label: string; // 'ม.ค.' ฯลฯ
    income: number;
    expense: number;
    count: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string; // '__UNCATEGORIZED__' when null in data
    categoryName: string;
    categoryColor: string; // gray fallback if missing
    categoryIcon: string; // 'question' fallback if missing
    type: 'INCOME' | 'EXPENSE';
    total: number;
    count: number;
    percentage: number;
  }>;
}

export const getYearlyReport = async (
  userId: string,
  year: number
): Promise<YearlyReport> => {
  const yearStart = startOfYear(new Date(year, 0, 1));
  const yearEnd = endOfYear(new Date(year, 0, 1));

  const [yearStats, perDayStats, categoryStats] = await Promise.all([
    // Year totals per type.
    prisma.transaction.groupBy({
      where: { userId, date: { gte: yearStart, lte: yearEnd } },
      by: ['type'],
      _sum: { amount: true },
      _count: { _all: true },
    }),

    // Day-level totals across the year (rolled up to months below).
    prisma.transaction.groupBy({
      where: { userId, date: { gte: yearStart, lte: yearEnd } },
      by: ['date', 'type'],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { date: 'asc' },
    }),

    // Category totals across the year.
    prisma.transaction.groupBy({
      where: { userId, date: { gte: yearStart, lte: yearEnd } },
      by: ['categoryId', 'type'],
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
  ]);

  const sumAmt = (t: 'INCOME' | 'EXPENSE') =>
    Number(yearStats.find(x => x.type === t)?._sum.amount ?? 0);

  const totalIncome = sumAmt('INCOME');
  const totalExpense = sumAmt('EXPENSE');
  const transactionCount = yearStats.reduce((s, x) => s + x._count._all, 0);

  // Initialize 12 monthly
  const monthly = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    label: format(new Date(year, i, 1), 'LLL', { locale: th }), // 'ม.ค.', 'ก.พ.', ...
    income: 0,
    expense: 0,
    count: 0,
  }));

  // Roll up per-day → per-month buckets.
  for (const d of perDayStats) {
    const mIdx = new Date(d.date).getMonth(); // 0..11
    const amt = Number(d._sum.amount ?? 0);
    if (d.type === 'INCOME') monthly[mIdx].income += amt;
    else monthly[mIdx].expense += amt;
    monthly[mIdx].count += d._count._all;
  }

  // Collect category metadata for all referenced categoryIds.
  const catIds = [
    ...new Set(
      categoryStats.map(cs => cs.categoryId).filter((id): id is string => !!id)
    ),
  ];
  const cats = catIds.length
    ? await prisma.category.findMany({
        where: { id: { in: catIds } },
        select: { id: true, name: true, color: true, icon: true },
      })
    : [];
  const catDict = new Map(cats.map(c => [c.id, c]));

  const totalByType = { INCOME: totalIncome, EXPENSE: totalExpense } as const;

  const categoryBreakdown = categoryStats.map(cs => {
    const amount = Number(cs._sum.amount ?? 0);
    const isNull = cs.categoryId == null;
    const meta = !isNull ? catDict.get(cs.categoryId!) : undefined;
    const fallbackId = '__UNCATEGORIZED__';
    const fallbackName = '(ไม่มีหมวดหมู่)';

    return {
      categoryId: isNull ? fallbackId : cs.categoryId!,
      categoryName: meta?.name ?? (isNull ? fallbackName : 'Unknown'),
      categoryColor: meta?.color ?? '#9CA3AF',
      categoryIcon: meta?.icon ?? 'question',
      type: cs.type,
      total: amount,
      count: cs._count._all,
      percentage:
        totalByType[cs.type] > 0 ? (amount / totalByType[cs.type]) * 100 : 0,
    };
  });

  return {
    year,
    totalIncome,
    totalExpense,
    netIncome: totalIncome - totalExpense,
    transactionCount,
    monthly,
    categoryBreakdown,
  };
};
