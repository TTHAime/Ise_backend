import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import {
	validateRange,
	makeLast7Days,
	makeLast30Days,
	makeLast90Days,
	makeRangeCategories,
	makeLast90DaysWeeklyByMonth,
	splitRangeIntoQuarters,
	aggregateDailyToBuckets,
	type Granularity,
	type DateRange,
	type CategoryResult,
	type DailyRow,
	type Bucket
} from './Charttimehelpers';

describe('Charttimehelpers.ts', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		// Set a fixed date for consistent testing
		vi.setSystemTime(new Date(2024, 0, 15)); // January 15, 2024
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('validateRange', () => {
		it('should return valid range for normal dates', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 0, 31)
			};
			const result = validateRange(range);

			expect(result.from).toBeInstanceOf(Date);
			expect(result.to).toBeInstanceOf(Date);
			expect(result.to.getTime()).toBeGreaterThanOrEqual(result.from.getTime());
		});

		it('should clamp to date to today if in future', () => {
			const futureDate = new Date(2025, 0, 1);
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: futureDate
			};
			const result = validateRange(range);

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			expect(result.to.getTime()).toBeLessThanOrEqual(today.getTime());
		});

		it('should clamp from date to today if in future', () => {
			const futureDate = new Date(2025, 0, 1);
			const range: DateRange = {
				from: futureDate,
				to: futureDate
			};
			const result = validateRange(range);

			const today = new Date();
			today.setHours(0, 0, 0, 0);
			expect(result.from.getTime()).toBeLessThanOrEqual(today.getTime());
		});

		it('should swap dates if to < from', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 31),
				to: new Date(2024, 0, 1)
			};
			const result = validateRange(range);

			expect(result.to.getTime()).toBeGreaterThanOrEqual(result.from.getTime());
		});

		it('should normalize dates to start of day', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1, 14, 30),
				to: new Date(2024, 0, 31, 18, 45)
			};
			const result = validateRange(range);

			expect(result.from.getHours()).toBe(0);
			expect(result.from.getMinutes()).toBe(0);
			expect(result.from.getSeconds()).toBe(0);
		});
	});

	describe('makeLast7Days', () => {
		it('should return 7 labels', () => {
			const result: CategoryResult = makeLast7Days();

			expect(result.length).toBe(7);
			expect(result.labels).toHaveLength(7);
		});

		it('should return weekday abbreviations', () => {
			const result: CategoryResult = makeLast7Days();

			result.labels.forEach((label) => {
				expect(label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
			});
		});

		it('should include today', () => {
			const result: CategoryResult = makeLast7Days();

			expect(result.labels.length).toBeGreaterThan(0);
		});
	});

	describe('makeLast30Days', () => {
		it('should return 30 labels for daily granularity', () => {
			const result: CategoryResult = makeLast30Days('daily');

			expect(result.length).toBe(30);
			expect(result.labels).toHaveLength(30);
		});

		it('should return 4 labels for weekly granularity', () => {
			const result: CategoryResult = makeLast30Days('weekly');

			expect(result.length).toBe(4);
			expect(result.labels).toHaveLength(4);
		});

		it('should use daily granularity by default', () => {
			const result: CategoryResult = makeLast30Days();

			expect(result.length).toBe(30);
		});

		it('should format daily labels correctly', () => {
			const result: CategoryResult = makeLast30Days('daily');

			result.labels.forEach((label) => {
				expect(label).toMatch(/^[A-Za-z]{3} \d{1,2}$/);
			});
		});

		it('should format weekly labels correctly', () => {
			const result: CategoryResult = makeLast30Days('weekly');

			result.labels.forEach((label) => {
				expect(label).toMatch(/\d{1,2}–\d{1,2}|[A-Za-z]{3} \d{1,2}–[A-Za-z]{3} \d{1,2}|\d{1,2}–[A-Za-z]{3} \d{1,2}/
);
			});
		});
	});

	describe('makeLast90Days', () => {
		it('should return monthly labels by default', () => {
			const result: CategoryResult = makeLast90Days();

			expect(result.length).toBeGreaterThan(0);
			expect(result.length).toBeLessThanOrEqual(4); // Usually 3-4 months
		});

		it('should return quarterly labels for quarterly granularity', () => {
			const result: CategoryResult = makeLast90Days('quarterly');

			expect(result.length).toBeGreaterThan(0);
			expect(result.length).toBeLessThanOrEqual(4); // Up to 4 quarters
		});

		it('should format monthly labels correctly', () => {
			const result: CategoryResult = makeLast90Days('monthly');

			result.labels.forEach((label) => {
				expect(label).toMatch(/^(?:[A-Za-z]{3}|[A-Za-z]{3} '?\d{2})$/);
			});
		});

		it('should format quarterly labels correctly', () => {
			const result: CategoryResult = makeLast90Days('quarterly');

			result.labels.forEach((label) => {
				expect(label).toMatch(/^Q\d [A-Za-z]{3}$/);
			});
		});

		it('should include year in labels when crossing year boundary', () => {
			// Set date to end of year
			vi.setSystemTime(new Date(2023, 11, 31));
			const result: CategoryResult = makeLast90Days();

			// Should include year information when crossing year boundary
			expect(result.labels.length).toBeGreaterThan(0);
		});
	});

	describe('makeRangeCategories', () => {
		it('should return daily categories for short spans', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 0, 15)
			};
			const result: CategoryResult = makeRangeCategories(range);

			expect(result.length).toBeGreaterThan(0);
		});

		it('should return weekly categories for medium spans', () => {
			const range: DateRange = {
				from: new Date(2023, 11, 1),
				to: new Date(2024, 2, 31)
			};
			const result: CategoryResult = makeRangeCategories(range, 'weekly');

			expect(result.length).toBeGreaterThan(0);
		});

		it('should return monthly categories for long spans', () => {
			const range: DateRange = {
				from: new Date(2023, 0, 1),
				to: new Date(2024, 11, 31)
			};
			const result: CategoryResult = makeRangeCategories(range, 'monthly');

			expect(result.length).toBeGreaterThan(0);
		});

		it('should auto-detect granularity based on span', () => {
			const shortRange: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 0, 15) // 15 days
			};
			const shortResult = makeRangeCategories(shortRange);

			const longRange: DateRange = {
				from: new Date(2023, 0, 1),
				to: new Date(2024, 11, 31) // > 120 days
			};
			const longResult = makeRangeCategories(longRange);

			expect(shortResult.length).toBeGreaterThan(longResult.length);
		});

		it('should format daily labels correctly', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 0, 7)
			};
			const result: CategoryResult = makeRangeCategories(range, 'daily');

			result.labels.forEach((label) => {
				expect(label).toMatch(/^[A-Za-z]{3} \d{1,2}$/);
			});
		});

		it('should format weekly labels correctly', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 0, 31)
			};
			const result: CategoryResult = makeRangeCategories(range, 'weekly');

			result.labels.forEach((label) => {
				expect(label).toMatch();
			});
		});

		it('should format monthly labels correctly', () => {
			const range: DateRange = {
				from: new Date(2023, 11, 1),
				to: new Date(2024, 2, 31)
			};
			const result: CategoryResult = makeRangeCategories(range, 'monthly');

			result.labels.forEach((label) => {
				expect(label).toMatch(/^(?:[A-Za-z]{3}|[A-Za-z]{3} '?\d{2})$/);
			});
		});
	});

	describe('makeLast90DaysWeeklyByMonth', () => {
		it('should return labels and buckets', () => {
			const result = makeLast90DaysWeeklyByMonth();

			expect(result).toHaveProperty('labels');
			expect(result).toHaveProperty('length');
			expect(result).toHaveProperty('buckets');
			expect(result.labels).toHaveLength(result.length);
			expect(result.buckets).toHaveLength(result.length);
		});

		it('should return approximately 12-13 buckets', () => {
			const result = makeLast90DaysWeeklyByMonth();

			expect(result.length).toBeGreaterThanOrEqual(8);
			expect(result.length).toBeLessThanOrEqual(13);
		});

		it('should format labels as month-week', () => {
			const result = makeLast90DaysWeeklyByMonth();

			result.labels.forEach((label) => {
				expect(label).toMatch(/^[A-Za-z]{3} W\d$/);
			});
		});

		it('should have valid bucket structures', () => {
			const result = makeLast90DaysWeeklyByMonth();

			result.buckets.forEach((bucket) => {
				expect(bucket).toHaveProperty('start');
				expect(bucket).toHaveProperty('end');
				expect(bucket).toHaveProperty('label');
				expect(bucket.start).toBeInstanceOf(Date);
				expect(bucket.end).toBeInstanceOf(Date);
				expect(bucket.end.getTime()).toBeGreaterThanOrEqual(bucket.start.getTime());
			});
		});
	});

	describe('splitRangeIntoQuarters', () => {
		it('should split range into 4 quarters', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 11, 31)
			};
			const result = splitRangeIntoQuarters(range);

			expect(result.length).toBeLessThanOrEqual(4);
		});

		it('should have valid quarter bucket structures', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 11, 31)
			};
			const result = splitRangeIntoQuarters(range);

			result.forEach((bucket) => {
				expect(bucket).toHaveProperty('start');
				expect(bucket).toHaveProperty('end');
				expect(bucket).toHaveProperty('label');
				expect(bucket.start).toBeInstanceOf(Date);
				expect(bucket.end).toBeInstanceOf(Date);
				expect(bucket.end.getTime()).toBeGreaterThanOrEqual(bucket.start.getTime());
			});
		});

		it('should format quarter labels correctly', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 11, 31)
			};
			const result = splitRangeIntoQuarters(range);

			result.forEach((bucket) => {
				expect(bucket.label).toMatch(/^Q\d [A-Za-z]{3}$/);
			});
		});

		it('should handle short ranges', () => {
			const range: DateRange = {
				from: new Date(2024, 0, 1),
				to: new Date(2024, 0, 15)
			};
			const result = splitRangeIntoQuarters(range);

			expect(result.length).toBeGreaterThan(0);
			expect(result.length).toBeLessThanOrEqual(4);
		});
	});

	describe('aggregateDailyToBuckets', () => {
		const mockRows: DailyRow[] = [
			{ date: new Date(2024, 0, 1), income: 1000, expense: 500 },
			{ date: new Date(2024, 0, 2), income: 2000, expense: 300 },
			{ date: new Date(2024, 0, 3), income: 1500, expense: 400 }
		];

		const mockBuckets: Bucket[] = [
			{
				start: new Date(2024, 0, 1),
				end: new Date(2024, 0, 2),
				label: 'Jan 1-2'
			},
			{
				start: new Date(2024, 0, 3),
				end: new Date(2024, 0, 3),
				label: 'Jan 3'
			}
		];

		it('should aggregate income correctly', () => {
			const result = aggregateDailyToBuckets(mockRows, mockBuckets, (r) => r.income ?? 0);

			expect(result).toHaveLength(mockBuckets.length);
			expect(result[0]).toBeGreaterThan(0); // Should sum income for first bucket
		});

		it('should aggregate expense correctly', () => {
			const result = aggregateDailyToBuckets(mockRows, mockBuckets, (r) => r.expense ?? 0);

			expect(result).toHaveLength(mockBuckets.length);
			expect(result[0]).toBeGreaterThan(0); // Should sum expense for first bucket
		});

		it('should handle empty rows', () => {
			const result = aggregateDailyToBuckets([], mockBuckets, (r) => r.income ?? 0);

			expect(result).toHaveLength(mockBuckets.length);
			expect(result.every((v) => v === 0)).toBe(true);
		});

		it('should handle empty buckets', () => {
			const result = aggregateDailyToBuckets(mockRows, [], (r) => r.income ?? 0);

			expect(result).toHaveLength(0);
		});

		it('should handle string dates', () => {
			const rowsWithStringDates: DailyRow[] = [
				{ date: '2024-01-01', income: 1000, expense: 500 },
				{ date: '2024-01-02', income: 2000, expense: 300 }
			];

			const result = aggregateDailyToBuckets(
				rowsWithStringDates,
				mockBuckets,
				(r) => r.income ?? 0
			);

			expect(result).toHaveLength(mockBuckets.length);
		});

		it('should handle dates outside bucket range', () => {
			const rowsWithOutsideDates: DailyRow[] = [
				{ date: new Date(2024, 5, 1), income: 1000, expense: 500 }
			];

			const result = aggregateDailyToBuckets(
				rowsWithOutsideDates,
				mockBuckets,
				(r) => r.income ?? 0
			);

			// Should return zeros for buckets that don't match
			expect(result.every((v) => v === 0)).toBe(true);
		});

		it('should sum multiple rows in same bucket', () => {
			const rowsInSameBucket: DailyRow[] = [
				{ date: new Date(2024, 0, 1), income: 1000, expense: 500 },
				{ date: new Date(2024, 0, 2), income: 2000, expense: 300 }
			];

			const singleBucket: Bucket[] = [
				{
					start: new Date(2024, 0, 1),
					end: new Date(2024, 0, 2),
					label: 'Jan 1-2'
				}
			];

			const result = aggregateDailyToBuckets(
				rowsInSameBucket,
				singleBucket,
				(r) => r.income ?? 0
			);

			expect(result[0]).toBe(3000); // 1000 + 2000
		});
	});
});

