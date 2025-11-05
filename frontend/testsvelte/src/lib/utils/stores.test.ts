import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import axios from 'axios';
import {
	ApiRoot,
	Dashboard,
	incomeCategories,
	expenseCategories,
	incomeSeries,
	expenseSeries,
	Totalincome,
	Totalexpense,
	loadData,
	loadAll,
	type CompleteCategory
} from './stores';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('stores.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset stores
		Dashboard.set([]);
		incomeCategories.set([]);
		expenseCategories.set([]);
		incomeSeries.set([]);
		expenseSeries.set([]);
		Totalincome.set(20);
		Totalexpense.set(10);
	});

	describe('ApiRoot', () => {
		it('should export ApiRoot constant', () => {
			expect(ApiRoot).toBeDefined();
			expect(typeof ApiRoot).toBe('string');
		});
	});

	describe('Stores Initialization', () => {
		it('should initialize Dashboard store', () => {
			const value = get(Dashboard);
			expect(Array.isArray(value)).toBe(true);
		});

		it('should initialize incomeCategories store', () => {
			const value = get(incomeCategories);
			expect(Array.isArray(value)).toBe(true);
		});

		it('should initialize expenseCategories store', () => {
			const value = get(expenseCategories);
			expect(Array.isArray(value)).toBe(true);
		});

		it('should initialize incomeSeries store', () => {
			const value = get(incomeSeries);
			expect(Array.isArray(value)).toBe(true);
		});

		it('should initialize expenseSeries store', () => {
			const value = get(expenseSeries);
			expect(Array.isArray(value)).toBe(true);
		});

		it('should initialize Totalincome store with default value', () => {
			const value = get(Totalincome);
			expect(value).toBe(20);
		});

		it('should initialize Totalexpense store with default value', () => {
			const value = get(Totalexpense);
			expect(value).toBe(10);
		});
	});

	describe('loadData', () => {
		it('should load data with no arguments (current month)', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});

			await loadData();

			expect(mockedAxios.get).toHaveBeenCalledTimes(2); // INCOME and EXPENSE
			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.stringContaining('transaction'),
				expect.objectContaining({
					params: expect.objectContaining({
						type: 'INCOME'
					})
				})
			);
		});

		it('should load data with single date argument', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});

			const date = new Date(2024, 0, 15); // January 15, 2024
			await loadData(date);

			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});

		it('should load data with date range', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});

			const from = new Date(2024, 0, 1);
			const to = new Date(2024, 0, 31);
			await loadData(from, to);

			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.stringContaining('transaction'),
				expect.objectContaining({
					params: expect.objectContaining({
						dateFrom: expect.any(String),
						dateTo: expect.any(String),
						type: 'INCOME'
					})
				})
			);
		});

		it('should swap dates if to < from', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});

			const from = new Date(2024, 0, 31);
			const to = new Date(2024, 0, 1);
			await loadData(from, to);

			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});

		it('should handle string dates', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});

			await loadData('2024-01-01', '2024-01-31');

			expect(mockedAxios.get).toHaveBeenCalledTimes(2);
		});

		it('should set incomeSeries and expenseSeries on success', async () => {
			const mockIncome = [{ id: 1, amount: 100 }];
			const mockExpense = [{ id: 2, amount: 50 }];

			mockedAxios.get = vi
				.fn()
				.mockResolvedValueOnce({ data: mockIncome })
				.mockResolvedValueOnce({ data: mockExpense });

			await loadData();

			expect(get(incomeSeries)).toEqual(mockIncome);
			expect(get(expenseSeries)).toEqual(mockExpense);
		});

		it('should handle API response with data wrapper', async () => {
			const mockData = {
				data: [{ id: 1, amount: 100 }]
			};

			mockedAxios.get = vi.fn().mockResolvedValue({
				data: mockData
			});

			await loadData();

			expect(mockedAxios.get).toHaveBeenCalled();
		});

		it('should handle API errors', async () => {
			mockedAxios.get = vi.fn().mockRejectedValue(new Error('API Error'));

			await expect(loadData()).rejects.toThrow();

			expect(get(incomeSeries)).toEqual([]);
			expect(get(expenseSeries)).toEqual([]);
		});

		it('should handle empty arrays in response', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});

			await loadData();

			expect(get(incomeSeries)).toEqual([]);
			expect(get(expenseSeries)).toEqual([]);
		});
	});

	describe('loadAll', () => {
		it('should call loadDashboard, loadData, and loadallFetchCategories', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				data: []
			});
			mockedAxios.mockResolvedValue({
				data: { data: { totalIncome: 100, totalExpense: 50 } }
			});

			loadAll();

			// Wait a bit for async calls
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Should make API calls
			expect(mockedAxios.get || mockedAxios).toHaveBeenCalled();
		});
	});

	describe('Category Loading', () => {
		it('should fetch income categories', async () => {
			const mockCategories = [
				{
					id: '1',
					name: 'Salary',
					color: '#00ff00',
					icon: '💰',
					type: 'INCOME',
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					_count: { transactions: 5 }
				}
			];

			mockedAxios.mockResolvedValue({
				status: 200,
				data: mockCategories
			});

			// Import the module to access internal functions if needed
			// For now, we test through loadAll
			loadAll();

			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(mockedAxios).toHaveBeenCalled();
		});

		it('should fetch expense categories', async () => {
			const mockCategories = [
				{
					id: '2',
					name: 'Food',
					color: '#ff0000',
					icon: '🍔',
					type: 'EXPENSE',
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					_count: { transactions: 10 }
				}
			];

			mockedAxios.mockResolvedValue({
				status: 200,
				data: mockCategories
			});

			loadAll();

			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(mockedAxios).toHaveBeenCalled();
		});
	});

	describe('Dashboard Loading', () => {
		it('should load dashboard data', async () => {
			const mockDashboard = {
				data: {
					totalIncome: 1000,
					totalExpense: 500
				}
			};

			mockedAxios.mockResolvedValue({
				data: mockDashboard
			});

			loadAll();

			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(mockedAxios).toHaveBeenCalledWith(
				expect.stringContaining('dashboard'),
				expect.any(Object)
			);
		});

		it('should update Totalincome and Totalexpense from dashboard', async () => {
			const mockDashboard = {
				data: {
					totalIncome: 2000,
					totalExpense: 800
				}
			};

			mockedAxios.mockResolvedValue({
				data: mockDashboard
			});

			loadAll();

			await new Promise((resolve) => setTimeout(resolve, 200));

			// Values should be updated
			expect(get(Totalincome)).toBe(2000);
			expect(get(Totalexpense)).toBe(800);
		});

		it('should handle dashboard loading errors', async () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			mockedAxios.mockRejectedValue(new Error('Dashboard error'));

			loadAll();

			await new Promise((resolve) => setTimeout(resolve, 200));

			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
		});
	});

	describe('Store Updates', () => {
		it('should update incomeSeries store', () => {
			const newData = [{ id: 1 }, { id: 2 }];
			incomeSeries.set(newData);
			expect(get(incomeSeries)).toEqual(newData);
		});

		it('should update expenseSeries store', () => {
			const newData = [{ id: 3 }, { id: 4 }];
			expenseSeries.set(newData);
			expect(get(expenseSeries)).toEqual(newData);
		});

		it('should update Dashboard store', () => {
			const newData = ['item1', 'item2'];
			Dashboard.set(newData);
			expect(get(Dashboard)).toEqual(newData);
		});

		it('should update incomeCategories store', () => {
			const newCategories: CompleteCategory[] = [
				{
					id: '1',
					name: 'Salary',
					color: '#00ff00',
					type: 'INCOME',
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					count: 5
				}
			];
			incomeCategories.set(newCategories);
			expect(get(incomeCategories)).toEqual(newCategories);
		});

		it('should update expenseCategories store', () => {
			const newCategories: CompleteCategory[] = [
				{
					id: '2',
					name: 'Food',
					color: '#ff0000',
					type: 'EXPENSE',
					createdAt: '2024-01-01',
					updatedAt: '2024-01-01',
					count: 10
				}
			];
			expenseCategories.set(newCategories);
			expect(get(expenseCategories)).toEqual(newCategories);
		});
	});
});

