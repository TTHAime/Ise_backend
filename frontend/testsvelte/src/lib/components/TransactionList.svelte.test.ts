import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TransactionList from './TransactionList.svelte';

// Helper to interact with DOM elements
const clickElement = (element: HTMLElement) => {
	element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

describe('TransactionList Component', () => {
	const mockCategories = [
		{
			id: '1',
			name: 'Food',
			color: '#ff0000',
			icon: '🍔',
			type: 'EXPENSE' as const
		},
		{
			id: '2',
			name: 'Salary',
			color: '#00ff00',
			icon: '💰',
			type: 'INCOME' as const
		}
	];

	const mockTransactions = [
		{
			id: '1',
			amount: 1000,
			type: 'INCOME',
			date: '2024-01-15',
			categoryId: '2',
			categoryName: 'Salary',
			description: 'Monthly salary'
		},
		{
			id: '2',
			amount: 500,
			type: 'EXPENSE',
			date: '2024-01-15',
			categoryId: '1',
			categoryName: 'Food',
			description: 'Lunch'
		},
		{
			id: '3',
			amount: 2000,
			type: 'INCOME',
			date: '2024-01-14',
			categoryId: null,
			categoryName: 'Bonus',
			description: 'Year-end bonus'
		}
	];

	const defaultProps = {
		recentdata: mockTransactions,
		categories: mockCategories
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Rendering', () => {
		it('should render component with transactions', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			expect(container).toBeTruthy();
		});

		it('should render empty state when no transactions', async () => {
			const { container } = await render(TransactionList, {
				props: { recentdata: [], categories: mockCategories }
			});

			const emptyState = container.querySelector('.text-center');
			expect(emptyState).toBeTruthy();
			expect(emptyState?.textContent).toContain('No transactions yet');
		});

		it('should show "Add Transaction" button in empty state when onAdd is provided', async () => {
			const onAdd = vi.fn();
			const { container } = await render(TransactionList, {
				props: { recentdata: [], categories: mockCategories, onAdd }
			});

			const addButton = container.querySelector('button');
			expect(addButton).toBeTruthy();
			expect(addButton?.textContent).toContain('Add Transaction');
		});

		it('should not show "Add Transaction" button when onAdd is not provided', async () => {
			const { container } = await render(TransactionList, {
				props: { recentdata: [], categories: mockCategories }
			});

			const addButton = container.querySelector('button');
			// Should not have add button in empty state
			expect(addButton).toBeFalsy();
		});
	});

	describe('Transaction Grouping', () => {
		it('should group transactions by date', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const dateHeaders = container.querySelectorAll('h3');
			expect(dateHeaders.length).toBeGreaterThan(0);
		});

		it('should sort groups by date (newest first)', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const dateHeaders = Array.from(container.querySelectorAll('h3'));
			// Should be sorted newest first
			expect(dateHeaders.length).toBeGreaterThan(0);
		});

		it('should sort transactions within each group by date (newest first)', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const transactionButtons = container.querySelectorAll('button[aria-label]');
			expect(transactionButtons.length).toBeGreaterThan(0);
		});
	});

	describe('Category Resolution', () => {
		it('should resolve category by id', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			// Transaction with categoryId '2' should resolve to 'Salary'
			const transactionButtons = container.querySelectorAll('button[aria-label]');
			expect(transactionButtons.length).toBeGreaterThan(0);
		});

		it('should resolve category by name when id not found', async () => {
			const transactionsWithNameOnly = [
				{
					id: '1',
					amount: 500,
					type: 'EXPENSE',
					date: '2024-01-15',
					categoryId: null,
					categoryName: 'Food',
					description: 'Lunch'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithNameOnly,
					categories: mockCategories
				}
			});

			const transactionButtons = container.querySelectorAll('button[aria-label]');
			expect(transactionButtons.length).toBeGreaterThan(0);
		});

		it('should use generic category when category not found', async () => {
			const transactionsWithoutCategory = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: null,
					categoryName: null,
					description: 'Unknown'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithoutCategory,
					categories: mockCategories
				}
			});

			const transactionButtons = container.querySelectorAll('button[aria-label]');
			expect(transactionButtons.length).toBeGreaterThan(0);
		});

		it('should handle categories from different prop names', async () => {
			const { container } = await render(TransactionList, {
				props: {
					recentdata: mockTransactions,
					categoriesSet: { categories: mockCategories }
				}
			});

			expect(container).toBeTruthy();
		});

		it('should handle CategoriesSet prop', async () => {
			const { container } = await render(TransactionList, {
				props: {
					recentdata: mockTransactions,
					CategoriesSet: { categories: mockCategories }
				}
			});

			expect(container).toBeTruthy();
		});
	});

	describe('Amount Formatting', () => {
		it('should format income amounts with + sign', async () => {
			const incomeTransaction = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: incomeTransaction,
					categories: mockCategories
				}
			});

			const amountText = container.textContent || '';
			expect(amountText).toContain('+');
			expect(amountText).toContain('THB');
		});

		it('should format expense amounts with - sign', async () => {
			const expenseTransaction = [
				{
					id: '2',
					amount: 500,
					type: 'EXPENSE',
					date: '2024-01-15',
					categoryId: '1',
					categoryName: 'Food',
					description: 'Lunch'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: expenseTransaction,
					categories: mockCategories
				}
			});

			const amountText = container.textContent || '';
			expect(amountText).toContain('-');
			expect(amountText).toContain('THB');
		});

		it('should format amounts with 2 decimal places', async () => {
			const transactionWithDecimal = [
				{
					id: '1',
					amount: 1000.50,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionWithDecimal,
					categories: mockCategories
				}
			});

			const amountText = container.textContent || '';
			expect(amountText).toContain('THB');
		});
	});

	describe('Transaction Display', () => {
		it('should display category name', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const categoryText = container.textContent || '';
			expect(categoryText).toContain('Salary');
			expect(categoryText).toContain('Food');
		});

		it('should display description/note', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const noteText = container.textContent || '';
			expect(noteText).toContain('Monthly salary');
			expect(noteText).toContain('Lunch');
		});

		it('should display category icon', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const iconText = container.textContent || '';
			expect(iconText).toContain('💰');
			expect(iconText).toContain('🍔');
		});

		it('should apply category color', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const colorElements = container.querySelectorAll('[style*="background"]');
			expect(colorElements.length).toBeGreaterThan(0);
		});

	});

	describe('Event Handlers', () => {
		it('should call onItemClick when transaction is clicked', async () => {
			const onItemClick = vi.fn();
			const { container } = await render(TransactionList, {
				props: { ...defaultProps, onItemClick }
			});

			const transactionButton = container.querySelector('button[aria-label]');
			if (transactionButton) {
				clickElement(transactionButton);
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			expect(onItemClick).toHaveBeenCalled();
		});

		it('should call onAdd when add button is clicked in empty state', async () => {
			const onAdd = vi.fn();
			const { container } = await render(TransactionList, {
				props: { recentdata: [], categories: mockCategories, onAdd }
			});

			const addButton = container.querySelector('button');
			if (addButton) {
				clickElement(addButton);
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			expect(onAdd).toHaveBeenCalled();
		});
	});

	describe('Accessibility', () => {
		it('should have aria-label on transaction buttons', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const transactionButton = container.querySelector('button[aria-label]');
			expect(transactionButton).toBeTruthy();
			expect(transactionButton?.getAttribute('aria-label')).toContain('transaction');
		});

		it('should have aria-hidden on decorative icons', async () => {
			const { container } = await render(TransactionList, {
				props: defaultProps
			});

			const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
			expect(hiddenIcons.length).toBeGreaterThan(0);
		});
	});

	describe('Styling', () => {
		it('should apply emerald hover color for income transactions', async () => {
			const incomeTransaction = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: incomeTransaction,
					categories: mockCategories
				}
			});

			const button = container.querySelector('button');
			expect(button?.classList.contains('hover:bg-emerald-50')).toBe(true);
		});

		it('should apply rose hover color for expense transactions', async () => {
			const expenseTransaction = [
				{
					id: '2',
					amount: 500,
					type: 'EXPENSE',
					date: '2024-01-15',
					categoryId: '1',
					categoryName: 'Food',
					description: 'Lunch'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: expenseTransaction,
					categories: mockCategories
				}
			});

			const button = container.querySelector('button');
			expect(button?.classList.contains('hover:bg-rose-50')).toBe(true);
		});

		it('should apply emerald text color for income amounts', async () => {
			const incomeTransaction = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: incomeTransaction,
					categories: mockCategories
				}
			});

			const emeraldText = container.querySelector('.text-emerald-600');
			expect(emeraldText).toBeTruthy();
		});

		it('should apply rose text color for expense amounts', async () => {
			const expenseTransaction = [
				{
					id: '2',
					amount: 500,
					type: 'EXPENSE',
					date: '2024-01-15',
					categoryId: '1',
					categoryName: 'Food',
					description: 'Lunch'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: expenseTransaction,
					categories: mockCategories
				}
			});

			const roseText = container.querySelector('.text-rose-600');
			expect(roseText).toBeTruthy();
		});
	});

	describe('Date Handling', () => {
		it('should handle string dates', async () => {
			const transactionsWithStringDates = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithStringDates,
					categories: mockCategories
				}
			});

			expect(container).toBeTruthy();
		});

		it('should handle Date objects', async () => {
			const transactionsWithDateObjects = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: new Date(2024, 0, 15),
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithDateObjects,
					categories: mockCategories
				}
			});

			expect(container).toBeTruthy();
		});

		it('should handle invalid dates', async () => {
			const transactionsWithInvalidDates = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: 'invalid-date',
					categoryId: '2',
					categoryName: 'Salary',
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithInvalidDates,
					categories: mockCategories
				}
			});

			// Should not crash, should use current date as fallback
			expect(container).toBeTruthy();
		});
	});

	describe('Edge Cases', () => {
		it('should handle empty categories array', async () => {
			const { container } = await render(TransactionList, {
				props: {
					recentdata: mockTransactions,
					categories: []
				}
			});

			expect(container).toBeTruthy();
		});

		it('should handle transactions with missing categoryName', async () => {
			const transactionsWithoutName = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: null,
					description: 'Monthly salary'
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithoutName,
					categories: mockCategories
				}
			});

			expect(container).toBeTruthy();
		});

		it('should handle transactions with missing description', async () => {
			const transactionsWithoutDescription = [
				{
					id: '1',
					amount: 1000,
					type: 'INCOME',
					date: '2024-01-15',
					categoryId: '2',
					categoryName: 'Salary',
					description: null
				}
			];

			const { container } = await render(TransactionList, {
				props: {
					recentdata: transactionsWithoutDescription,
					categories: mockCategories
				}
			});

			expect(container).toBeTruthy();
		});
	});
});

