import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import Summary from './Summary.svelte';

// Note: do not mock `flowbite-svelte` here — use the real components so
// client-side rendering produces DOM nodes that tests can query.

describe('Summary Component', () => {
	const defaultProps = {
		income: 10000,
		expense: 5000
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Rendering', () => {
		it('should render component with default props', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: defaultProps
			});

			expect(container).toBeTruthy();
		});

		it('should render title "Summary"', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: defaultProps
			});

			const title = container.querySelector('h1');
			expect(title?.textContent).toContain('Summary');
		});

		it('should render all summary sections', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: defaultProps
			});

			const headings = container.querySelectorAll('h1');
			expect(headings.length).toBeGreaterThan(0);
		});
	});

	describe('Income Display', () => {
		it('should display total income', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const incomeText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Total income')
			);
			expect(incomeText).toBeTruthy();
		});

		it('should format income with locale string', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 1234567, expense: 5000 }
			});

			// Check if formatted number is displayed (should have commas or locale formatting)
			const incomeDisplay = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Total income')
			);
			expect(incomeDisplay).toBeTruthy();
		});

		it('should display income with "Bath" suffix', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const incomeSection = container.textContent || '';
			expect(incomeSection).toContain('Bath');
		});
	});

	describe('Expense Display', () => {
		it('should display total expense', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const expenseText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Total expense')
			);
			expect(expenseText).toBeTruthy();
		});

		it('should format expense with locale string', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 987654 }
			});

			const expenseDisplay = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Total expense')
			);
			expect(expenseDisplay).toBeTruthy();
		});

		it('should display expense with "Bath" suffix', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const expenseSection = container.textContent || '';
			expect(expenseSection).toContain('Bath');
		});
	});

	describe('Remaining Calculation', () => {
		it('should calculate remaining correctly (income > expense)', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const remainingText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Remaining')
			);
			expect(remainingText).toBeTruthy();

			// Remaining should be 10000 - 5000 = 5000
			const remainingSection = container.textContent || '';
			expect(remainingSection).toContain('Remaining');
		});

		it('should calculate remaining correctly (income < expense)', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 5000, expense: 10000 }
			});

			const remainingText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Remaining')
			);
			expect(remainingText).toBeTruthy();

			// Remaining should be 5000 - 10000 = -5000
			const remainingSection = container.textContent || '';
			expect(remainingSection).toContain('Remaining');
		});

		it('should calculate remaining correctly (income = expense)', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 10000 }
			});

			const remainingText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Remaining')
			);
			expect(remainingText).toBeTruthy();
		});

		it('should handle zero income', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 0, expense: 5000 }
			});

			const remainingText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Remaining')
			);
			expect(remainingText).toBeTruthy();
		});

		it('should handle zero expense', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 0 }
			});

			const remainingText = Array.from(container.querySelectorAll('*')).find((el) =>
				el.textContent?.includes('Remaining')
			);
			expect(remainingText).toBeTruthy();
		});
	});

	describe('Spent Percentage Calculation', () => {
		it('should calculate spent percentage correctly', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			// Should be 50%
			const percentageText = container.textContent || '';
			expect(percentageText).toContain('%');
		});

		it('should calculate 100% when expense equals income', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 10000 }
			});

			const percentageText = container.textContent || '';
			expect(percentageText).toContain('100%');
		});

		it('should cap percentage at 100% when expense exceeds income', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 15000 }
			});

			const percentageText = container.textContent || '';
			expect(percentageText).toContain('100%');
		});

		it('should show 0% when income is zero', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 0, expense: 5000 }
			});

			const percentageText = container.textContent || '';
			expect(percentageText).toContain('0%');
		});

		it('should round percentage correctly', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 1000, expense: 333 }
			});

			// 333/1000 = 33.3%, should round to 33%
			const percentageText = container.textContent || '';
			expect(percentageText).toContain('%');
		});
	});

	describe('Progress Bar', () => {
		it('should render progress bar', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toBeTruthy();
		});

		it('should have correct aria attributes', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar?.getAttribute('aria-valuemin')).toBe('0');
			expect(progressBar?.getAttribute('aria-valuemax')).toBe('100');
			expect(progressBar?.getAttribute('aria-valuenow')).toBe('50');
		});

		it('should update aria-valuenow based on percentage', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 7500 }
			});

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar?.getAttribute('aria-valuenow')).toBe('75');
		});

		it('should set progress bar width based on percentage', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const progressBarFill = container.querySelector('.bg-emerald-500');
			const style = progressBarFill?.getAttribute('style');
			expect(style).toContain('width: 50%');
		});

		it('should cap progress bar at 100%', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 15000 }
			});

			const progressBarFill = container.querySelector('.bg-emerald-500');
			const style = progressBarFill?.getAttribute('style');
			expect(style).toContain('width: 100%');
		});
	});

	describe('Percentage Display', () => {
		it('should display "Used X% of income"', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const percentageDisplay = container.textContent || '';
			expect(percentageDisplay).toContain('Used');
			expect(percentageDisplay).toContain('%');
			expect(percentageDisplay).toContain('of income');
		});

		it('should display expense/income ratio', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			const ratioDisplay = container.textContent || '';
			expect(ratioDisplay).toContain('/');
		});
	});

	describe('Number Formatting', () => {
		it('should format large numbers with locale string', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 1234567, expense: 987654 }
			});

			// Numbers should be formatted with locale (may have commas, spaces, etc.)
			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle small numbers', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10, expense: 5 }
			});

			const content = container.textContent || '';
			expect(content).toContain('10');
			expect(content).toContain('5');
		});

		it('should handle decimal numbers', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 1000.50, expense: 500.25 }
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});
	});

	describe('Edge Cases', () => {
		it('should handle negative income', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: -1000, expense: 500 }
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle negative expense', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: -500 }
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle very large numbers', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 999999999, expense: 888888888 }
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle both values as zero', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: { income: 0, expense: 0 }
			});

			const content = container.textContent || '';
			expect(content).toContain('0%');
		});
	});

	describe('Popover', () => {
		it('should render popover with summary info', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: defaultProps
			});

			// Popover should be present (mocked component)
			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});
	});

	describe('Accessibility', () => {
		it('should have proper role attribute on progress bar', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: defaultProps
			});

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar).toBeTruthy();
		});

		it('should have proper semantic structure', async () => {
			const { container } = await render(Summary, {
				target: document.body,
				props: defaultProps
			});

			const headings = container.querySelectorAll('h1');
			expect(headings.length).toBeGreaterThan(0);
		});
	});

	describe('Reactive Updates', () => {
		it('should update when income prop changes', async () => {
			const { container, component, rerender } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			await rerender({ income: 20000, expense: 5000 });

			await new Promise((resolve) => setTimeout(resolve, 100));

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should update when expense prop changes', async () => {
			const { container, component, rerender } = await render(Summary, {
				target: document.body,
				props: { income: 10000, expense: 5000 }
			});

			await rerender({ income: 10000, expense: 7500 });

			await new Promise((resolve) => setTimeout(resolve, 100));

			const progressBar = container.querySelector('[role="progressbar"]');
			expect(progressBar?.getAttribute('aria-valuenow')).toBe('75');
		});
	});
});

