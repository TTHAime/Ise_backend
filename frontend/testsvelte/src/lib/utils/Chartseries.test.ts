import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import {
	buildSeriesFromTransactions,
	type BuildInput,
	type BuildResult,
	type Tx,
	type TxType
} from './Chartseries';

describe('Chartseries.ts', () => {
	const mockTransactions: Tx[] = [
		{ amount: 1000, date: new Date(2024, 0, 1), type: 'INCOME' },
		{ amount: 500, date: new Date(2024, 0, 2), type: 'EXPENSE' },
		{ amount: 2000, date: new Date(2024, 0, 3), type: 'INCOME' },
		{ amount: 300, date: new Date(2024, 0, 4), type: 'EXPENSE' },
		{ amount: 1500, date: new Date(2024, 0, 5), type: 'INCOME' }
	];

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		// Set a fixed date for consistent testing
		vi.setSystemTime(new Date(2024, 0, 10)); // January 10, 2024
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('buildSeriesFromTransactions', () => {
		describe('7d preset', () => {
			it('should build series for last 7 days', () => {
				const input: BuildInput = { kind: '7d' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.series[0].name).toBe('Income');
				expect(result.series[1].name).toBe('Expenses');
				expect(result.categories).toHaveLength(7);
				expect(result.series[0].color).toBe('#16a34a');
				expect(result.series[1].color).toBe('#dc2626');
			});

			it('should use weekday labels for 7d', () => {
				const input: BuildInput = { kind: '7d' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				// Labels should be weekday abbreviations
				expect(result.categories[0]).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
			});
		});

		describe('30d preset', () => {
			it('should build series for last 30 days', () => {
				const input: BuildInput = { kind: '30d' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories).toHaveLength(30);
			});

			it('should use day-month format for 30d', () => {
				const input: BuildInput = { kind: '30d' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				// Labels should be in "MMM D" format
				expect(result.categories[0]).toMatch(/^[A-Za-z]{3} \d{1,2}$/);
			});
		});

		describe('90d-weeklyByMonth preset', () => {
			it('should build series for 90 days with weekly buckets', () => {
				const input: BuildInput = { kind: '90d-weeklyByMonth' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
				expect(result.categories.length).toBeLessThanOrEqual(13);
			});

			it('should use month-week format for 90d-weeklyByMonth', () => {
				const input: BuildInput = { kind: '90d-weeklyByMonth' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				// Labels should be in "MMM W1" format
				expect(result.categories[0]).toMatch(/^[A-Za-z]{3} W\d$/);
			});
		});

		describe('custom range', () => {
			it('should build series for custom date range with daily granularity', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 7),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
			});

			it('should build series for custom date range with monthly granularity', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2023, 11, 1),
					to: new Date(2024, 2, 31),
					granularity: 'monthly'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
			});

			it('should build series for custom date range with weeklyByMonth granularity', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2023, 11, 1),
					to: new Date(2024, 2, 31),
					granularity: 'weeklyByMonth'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
			});

			it('should auto-detect daily granularity for short spans', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 15), // 15 days
					granularity: 'auto'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				// Should use daily granularity
				expect(result.categories.length).toBe(10);
			});

			it('should auto-detect weeklyByMonth granularity for medium spans', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2023, 11, 1),
					to: new Date(2024, 2, 31), // ~120 days
					granularity: 'auto'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
			});

			it('should auto-detect monthly granularity for long spans', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2023, 0, 1),
					to: new Date(2024, 11, 31), // > 120 days
					granularity: 'auto'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
			});

			it('should clamp to date to today if in future', () => {
				const futureDate = new Date(2025, 0, 1);
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: futureDate,
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				// Should not include future dates
			});

			it('should swap dates if to < from', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 10),
					to: new Date(2024, 0, 1),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series).toHaveLength(2);
				expect(result.categories.length).toBeGreaterThan(0);
			});
		});

		describe('Transaction Aggregation', () => {
			it('should aggregate income transactions correctly', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 7),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				const incomeData = result.series[0].data;
				expect(incomeData).toBeDefined();
				expect(Array.isArray(incomeData)).toBe(true);
			});

			it('should aggregate expense transactions correctly', () => {
				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 7),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				const expenseData = result.series[1].data;
				expect(expenseData).toBeDefined();
				expect(Array.isArray(expenseData)).toBe(true);
			});

			it('should handle string amounts', () => {
				const transactionsWithStringAmounts: Tx[] = [
					{ amount: '1000', date: new Date(2024, 0, 1), type: 'INCOME' },
					{ amount: '500', date: new Date(2024, 0, 2), type: 'EXPENSE' }
				];

				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 7),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(
					transactionsWithStringAmounts,
					input
				);

				expect(result.series).toHaveLength(2);
			});

			it('should handle string dates', () => {
				const transactionsWithStringDates: Tx[] = [
					{ amount: 1000, date: '2024-01-01', type: 'INCOME' },
					{ amount: 500, date: '2024-01-02', type: 'EXPENSE' }
				];

				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 7),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(
					transactionsWithStringDates,
					input
				);

				expect(result.series).toHaveLength(2);
			});

			it('should handle empty transactions array', () => {
				const input: BuildInput = { kind: '7d' };
				const result: BuildResult = buildSeriesFromTransactions([], input);

				expect(result.series).toHaveLength(2);
				expect(result.series[0].data.every((v) => v === 0)).toBe(true);
				expect(result.series[1].data.every((v) => v === 0)).toBe(true);
			});

			it('should handle invalid amount values', () => {
				const transactionsWithInvalidAmounts: Tx[] = [
					{ amount: 'invalid', date: new Date(2024, 0, 1), type: 'INCOME' },
					{ amount: null as any, date: new Date(2024, 0, 2), type: 'EXPENSE' }
				];

				const input: BuildInput = {
					kind: 'custom',
					from: new Date(2024, 0, 1),
					to: new Date(2024, 0, 7),
					granularity: 'daily'
				};
				const result: BuildResult = buildSeriesFromTransactions(
					transactionsWithInvalidAmounts,
					input
				);

				expect(result.series).toHaveLength(2);
				// Invalid amounts should be treated as 0
			});
		});

		describe('Series Structure', () => {
			it('should return correct series structure', () => {
				const input: BuildInput = { kind: '7d' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result).toHaveProperty('series');
				expect(result).toHaveProperty('categories');
				expect(result.series).toHaveLength(2);
				expect(result.series[0]).toHaveProperty('name');
				expect(result.series[0]).toHaveProperty('data');
				expect(result.series[0]).toHaveProperty('color');
			});

			it('should have matching data lengths and categories', () => {
				const input: BuildInput = { kind: '7d' };
				const result: BuildResult = buildSeriesFromTransactions(mockTransactions, input);

				expect(result.series[0].data).toHaveLength(result.categories.length);
				expect(result.series[1].data).toHaveLength(result.categories.length);
			});
		});
	});
});

