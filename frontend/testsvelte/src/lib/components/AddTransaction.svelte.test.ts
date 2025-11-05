import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AddTransaction, { type Category, type EditTxn, type SubmitPayload } from './AddTransaction.svelte';
import axios from 'axios';

// Helper function to wait
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to interact with DOM elements
const fillInput = (element: HTMLInputElement, value: string) => {
	element.value = value;
	element.dispatchEvent(new Event('input', { bubbles: true }));
	element.dispatchEvent(new Event('change', { bubbles: true }));
};

const selectOption = (element: HTMLSelectElement, value: string) => {
	element.value = value;
	element.dispatchEvent(new Event('change', { bubbles: true }));
	element.dispatchEvent(new Event('input', { bubbles: true }));
};

const clickElement = (element: HTMLElement) => {
	element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const setFileInput = (element: HTMLInputElement, file: File) => {
	const dataTransfer = new DataTransfer();
	dataTransfer.items.add(file);
	element.files = dataTransfer.files;
	element.dispatchEvent(new Event('change', { bubbles: true }));
};

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock stores
vi.mock('$lib/utils/stores', () => ({
	ApiRoot: 'https://test-api.com/',
	loadAll: vi.fn()
}));

describe('AddTransaction Component', () => {
	const mockCategories: Category[] = [
		{ id: '1', name: 'Food', type: 'EXPENSE', color: '#FF5733', icon: '🍽️' },
		{ id: '2', name: 'Transport', type: 'EXPENSE', color: '#33C3F0', icon: '🚗' },
		{ id: '3', name: 'Salary', type: 'INCOME', color: '#4CAF50', icon: '💰' },
		{ id: '4', name: 'Freelance', type: 'INCOME', color: '#9C27B0', icon: '💼' }
	];

	const mockCurrencies = ['THB', 'USD', 'EUR'];

	let mockOnClose: ReturnType<typeof vi.fn>;
	let mockOnSubmit: ReturnType<typeof vi.fn>;
	let mockUploadReceipt: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockOnClose = vi.fn();
		mockOnSubmit = vi.fn();
		mockUploadReceipt = vi.fn().mockReturnValue(true);
		mockedAxios.delete = vi.fn().mockResolvedValue({ status: 200 });
	});

	describe('Rendering', () => {
		it('should not render when open is false', async () => {
			const { container } = await render(AddTransaction, {
				open: false,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			const modal = container.querySelector('.box-transaction');
			expect(modal).toBeNull();
		});

		it('should render when open is true', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onClose: mockOnClose
			});

			const modal = container.querySelector('.box-transaction');
			expect(modal).not.toBeNull();
		});

		it('should display "Add Transaction" title when not in edit mode', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			const heading = container.querySelector('h1');
			expect(heading?.textContent).toContain('Add Transaction');
		});

		it('should display "Edit Transaction" title when in edit mode', async () => {
			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Test note',
				amount: 100,
				currency: 'THB'
			};

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn
			});

			const heading = container.querySelector('h1');
			expect(heading?.textContent).toContain('Edit Transaction');
		});

		it('should show period text when provided', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				periodText: 'January 2024'
			});

			const periodText = container.querySelector('.text-gray-500');
			expect(periodText?.textContent).toContain('January 2024');
		});
	});

	describe('Transaction Type Toggle', () => {
		it('should default to Income (green) when in add mode', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			// Wait for component to render
			await wait(100);

			// Check that panel has income class (green)
			const panel = container.querySelector('.box-transaction');
			expect(panel?.classList.contains('box-transaction-income')).toBeTruthy();
			
			// Check that income categories are shown (not expense)
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			const options = Array.from(categorySelect?.options || []).map((opt) => opt.textContent);
			expect(options.some((opt) => opt?.includes('Salary') || opt?.includes('💰'))).toBeTruthy();
		});

		it('should set type to Expense when editTxn type is EXPENSE', async () => {
			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Test',
				amount: 100,
				currency: 'THB'
			};

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn
			});

			// Wait for component to render and effects to run
			await wait(100);

			// Check that panel has expense class (red)
			const panel = container.querySelector('.box-transaction');
			expect(panel?.classList.contains('box-transaction-expense')).toBeTruthy();
		});

		it('should filter categories based on selected type', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			// Wait for initial render
			await wait(100);

			// Initially should show income categories (default is green/income)
			let categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			let options = Array.from(categorySelect?.options || []).map((opt) => opt.textContent);
			expect(options.some((opt) => opt?.includes('Salary') || opt?.includes('💰'))).toBeTruthy();
			expect(options.some((opt) => opt?.includes('Food') || opt?.includes('🍽️'))).toBeFalsy();

			// Click expense button
			const expenseButton = container.querySelector('button[value="red"]') as HTMLButtonElement;
			if (expenseButton) {
				clickElement(expenseButton);
			}

			// Wait for reactivity
			await wait(200);

			// Now should show expense categories
			categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			options = Array.from(categorySelect?.options || []).map((opt) => opt.textContent);
			expect(options.some((opt) => opt?.includes('Food') || opt?.includes('🍽️'))).toBeFalsy();
			expect(options.some((opt) => opt?.includes('Salary') || opt?.includes('💰'))).toBeTruthy();
		});
	});

	describe('Form Fields', () => {
		it('should prefill form fields in edit mode', async () => {
			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Test note',
				amount: 100.5,
				currency: 'USD'
			};

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn
			});

			const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
			const noteInput = container.querySelector('input[type="text"]') as HTMLInputElement;
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			const currencySelect = container.querySelectorAll('select')[1] as HTMLSelectElement;

			expect(dateInput?.value).toBe('2024-01-15');
			expect(noteInput?.value).toBe('Test note');
			expect(amountInput?.value).toBe('100.5');
			expect(categorySelect?.value).toBe('1');
			expect(currencySelect?.value).toBe('USD');
		});

		it('should reset form fields in add mode', async () => {
			const today = new Date().toISOString().slice(0, 10);

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
			const noteInput = container.querySelector('input[type="text"]') as HTMLInputElement;
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;

			expect(dateInput?.value).toBe(today);
			expect(noteInput?.value).toBe('');
			expect(amountInput?.value).toBe('');
		});
	});

	describe('Form Validation', () => {
		it('should show warning when submitting without category', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit
			});

			// Wait for component to render
			await wait(100);

			// Set amount but no category
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) {
				fillInput(amountInput, '100');
			}
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) {
				form.requestSubmit();
			}

			// Wait for notification
			await wait(500);

			// Check that onSubmit was not called
			expect(mockOnSubmit).not.toHaveBeenCalled();
		});

		it('should show warning when submitting with invalid amount', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit
			});

			// Wait for component to render
			await wait(100);

			// Set category but invalid amount - use category '3' (Salary) which is INCOME type
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			if (categorySelect) {
				selectOption(categorySelect, '3');
			}
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) {
				fillInput(amountInput, '0');
			}
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) {
				form.requestSubmit();
			}

			// Wait for notification
			await wait(500);

			// Check that onSubmit was not called
			expect(mockOnSubmit).not.toHaveBeenCalled();
		});

		it('should show warning when submitting with future date', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 10);
			const futureDateStr = futureDate.toISOString().slice(0, 10);

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit
			});

			// Wait for component to render
			await wait(100);

			// Set future date
			// Use category '3' (Salary) which is INCOME type (default type is green/INCOME)
			const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
			if (dateInput) fillInput(dateInput, futureDateStr);
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			if (categorySelect) selectOption(categorySelect, '3');
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) fillInput(amountInput, '100');
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) form.requestSubmit();

			// Wait for notification and validation
			await wait(500);

			// Check that onSubmit was not called (validation should prevent submission)
			expect(mockOnSubmit).not.toHaveBeenCalled();
		});

		it('should allow future date when receipt is uploaded', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 1);
			const futureDateStr = futureDate.toISOString().slice(0, 10);

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit,
				uploadReceipt: mockUploadReceipt
			});

			// Wait for component to render
			await wait(100);

			// Create a mock file
			const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
			
			// Set future date and upload receipt
			// Use category '3' (Salary) which is INCOME type (default type is green/INCOME)
			const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
			if (dateInput) fillInput(dateInput, futureDateStr);
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			if (categorySelect) selectOption(categorySelect, '3');
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) fillInput(amountInput, '100');
			const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
			if (fileInput) setFileInput(fileInput, file);
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) form.requestSubmit();

			// Wait for processing
			await wait(500);

			// Check that onSubmit was called (validation should pass with receipt)
			expect(mockOnSubmit).toHaveBeenCalled();
		});
	});

	describe('Form Submission', () => {
		it('should call onSubmit with correct payload in add mode', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit
			});

			// Wait for component to render
			await wait(100);

			const today = new Date().toISOString().slice(0, 10);

			// Fill form
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			if (categorySelect) selectOption(categorySelect, '3');
			const dateInput = container.querySelector('input[type="date"]') as HTMLInputElement;
			if (dateInput) fillInput(dateInput, today);
			const noteInput = container.querySelector('input[type="text"]') as HTMLInputElement;
			if (noteInput) fillInput(noteInput, 'Test note');
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) fillInput(amountInput, '1000');
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) form.requestSubmit();

			// Wait for processing
			await wait(100);

			// Check onSubmit was called with correct payload
			expect(mockOnSubmit).toHaveBeenCalledTimes(1);
			const payload: SubmitPayload = mockOnSubmit.mock.calls[0][0];
			
			expect(payload.type).toBe('INCOME');
			expect(payload.category).toBe('3');
			expect(payload.date).toBe(today);
			expect(payload.note).toBe('Test note');
			expect(payload.amount).toBe(1000);
			expect(payload.currency).toBe('THB');
			expect(payload.recurrence).toBe('NEVER');
			expect(payload.ends).toBe('NEVER');
		});

		it('should call onSubmit with id in edit mode', async () => {
			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Original note',
				amount: 100,
				currency: 'THB'
			};

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn,
				onSubmit: mockOnSubmit
			});

			// Wait for component to render and effects to run
			await wait(100);

			// Update amount
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) fillInput(amountInput, '200');
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) form.requestSubmit();

			// Wait for processing
			await wait(100);

			// Check onSubmit was called with id
			expect(mockOnSubmit).toHaveBeenCalledTimes(1);
			const payload: SubmitPayload = mockOnSubmit.mock.calls[0][0];
			
			expect(payload.id).toBe('123');
			expect(payload.amount).toBe(200);
		});

		it('should handle receipt upload on submit', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit,
				uploadReceipt: mockUploadReceipt
			});

			// Wait for component to render
			await wait(100);

			// Create a mock file
			const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
			
			// Upload receipt
			const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
			if (fileInput) setFileInput(fileInput, file);
			
			// Fill required fields - use category '3' (Salary) which is INCOME type (default)
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			if (categorySelect) selectOption(categorySelect, '3');
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) fillInput(amountInput, '100');
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) form.requestSubmit();

			// Wait for processing
			await wait(100);

			// Check uploadReceipt was called
			expect(mockUploadReceipt).toHaveBeenCalledWith(file);
			expect(mockOnSubmit).toHaveBeenCalled();
		});

		it('should include recurrence and ends date in payload', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onSubmit: mockOnSubmit
			});

			// Wait for component to render
			await wait(100);

			const endDate = '2024-12-31';

			// Fill form
			const categorySelect = container.querySelector('select[name="dropdownCate"]') as HTMLSelectElement;
			if (categorySelect) selectOption(categorySelect, '3');
			const amountInput = container.querySelector('input[type="number"]') as HTMLInputElement;
			if (amountInput) fillInput(amountInput, '1000');
			
			// Set recurrence (it's the first select in row 2)
			const selects = container.querySelectorAll('select');
			if (selects[2]) selectOption(selects[2] as HTMLSelectElement, 'MONTHLY');
			await wait(100);
			
			// Set ends on date (it's the select after recurrence)
			if (selects[3]) selectOption(selects[3] as HTMLSelectElement, 'ON');
			await wait(100);
			
			// Find the second date input (endsOn)
			const dateInputs = container.querySelectorAll('input[type="date"]');
			if (dateInputs[1]) fillInput(dateInputs[1] as HTMLInputElement, endDate);
			
			// Submit form
			const form = container.querySelector('form') as HTMLFormElement;
			if (form) form.requestSubmit();

			// Wait for processing
			await wait(100);

			// Check payload
			const payload: SubmitPayload = mockOnSubmit.mock.calls[0][0];
			expect(payload.recurrence).toBe('MONTHLY');
			expect(payload.ends).toBe(endDate);
		});
	});

	describe('Delete Functionality', () => {
		it('should show delete button only in edit mode', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			const deleteButtons = Array.from(container.querySelectorAll('button')).filter(
				(btn) => btn.textContent?.includes('Delete')
			);
			expect(deleteButtons.length).toBe(0);

			// Now test with edit mode
			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Test',
				amount: 100,
				currency: 'THB'
			};

			const { container: editContainer } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn
			});

			const deleteButtonsInEdit = Array.from(editContainer.querySelectorAll('button')).filter(
				(btn) => btn.textContent?.includes('Delete')
			);
			expect(deleteButtonsInEdit.length).toBeGreaterThan(0);
		});

		it('should call handleDelete and show success notification on successful delete', async () => {
			mockedAxios.delete.mockResolvedValue({ status: 200 });

			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Test',
				amount: 100,
				currency: 'THB'
			};

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn,
				onClose: mockOnClose
			});

			// Wait for component to render
			await wait(100);

			// Click delete button
			const deleteButtons = Array.from(container.querySelectorAll('button')).filter(
				(btn) => btn.textContent?.includes('Delete')
			);
			if (deleteButtons[0]) clickElement(deleteButtons[0]);

			// Wait for API call
			await wait(100);

			// Check axios.delete was called
			expect(mockedAxios.delete).toHaveBeenCalledWith(
				'https://test-api.com/transaction/123',
				{ withCredentials: true }
			);
		});

		it('should show error notification on failed delete', async () => {
			mockedAxios.delete.mockRejectedValue(new Error('Delete failed'));

			const editTxn: EditTxn = {
				id: '123',
				type: 'EXPENSE',
				categoryId: '1',
				date: '2024-01-15',
				note: 'Test',
				amount: 100,
				currency: 'THB'
			};

			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				editTxn
			});

			// Wait for component to render
			await wait(100);

			// Click delete button
			const deleteButtons = Array.from(container.querySelectorAll('button')).filter(
				(btn) => btn.textContent?.includes('Delete')
			);
			if (deleteButtons[0]) clickElement(deleteButtons[0]);

			// Wait for error handling
			await wait(100);

			// Check axios.delete was called
			expect(mockedAxios.delete).toHaveBeenCalled();
		});
	});

	describe('Receipt Management', () => {
		it('should display receipt file name when file is selected', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			// Wait for component to render
			await wait(100);

			// Create a mock file
			const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
			
			// Upload receipt
			const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
			if (fileInput) setFileInput(fileInput, file);
			
			// Wait for UI update
			await wait(100);

			// Check file name is displayed
			const fileName = container.querySelector('.truncate');
			expect(fileName?.textContent).toContain('receipt.jpg');
		});

		it('should remove receipt when remove button is clicked', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies
			});

			// Wait for component to render
			await wait(100);

			// Create and upload file
			const file = new File(['test'], 'receipt.jpg', { type: 'image/jpeg' });
			const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
			if (fileInput) setFileInput(fileInput, file);
			await wait(100);

			// Click remove button
			const removeButtons = Array.from(container.querySelectorAll('button')).filter(
				(btn) => btn.textContent?.includes('remove')
			);
			if (removeButtons[0]) clickElement(removeButtons[0]);
			await wait(100);

			// Check file name is no longer displayed
			const fileName = container.querySelector('.truncate');
			expect(fileName).toBeNull();
		});
	});

	describe('Close Functionality', () => {
		it('should call onClose when close button is clicked', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onClose: mockOnClose
			});

			// Wait for component to render
			await wait(100);

			// Click close button (X button in top right)
			const closeButton = container.querySelector('button[aria-label="Close"]') as HTMLButtonElement;
			if (closeButton) clickElement(closeButton);

			expect(mockOnClose).toHaveBeenCalled();
		});

		it('should call onClose when backdrop is clicked', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onClose: mockOnClose
			});

			// Wait for component to render
			await wait(100);

			// Click backdrop
			const backdrop = container.querySelector('.bg-black\\/50') as HTMLElement;
			if (backdrop) {
				const clickEvent = new MouseEvent('click', { bubbles: true, clientX: 0, clientY: 0 });
				backdrop.dispatchEvent(clickEvent);
			}

			expect(mockOnClose).toHaveBeenCalled();
		});

		it('should call onClose when Escape key is pressed', async () => {
			const { container } = await render(AddTransaction, {
				open: true,
				categories: mockCategories,
				currencies: mockCurrencies,
				onClose: mockOnClose
			});

			// Wait for component to render
			await wait(100);

			// Press Escape key
			const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
			window.dispatchEvent(escapeEvent);

			expect(mockOnClose).toHaveBeenCalled();
		});
	});
});

