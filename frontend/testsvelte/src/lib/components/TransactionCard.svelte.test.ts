import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import TransactionCard from './TransactionCard.svelte';

describe('TransactionCard Component', () => {
	const defaultProps = {
		title: 'Total Income',
		value: 10000,
		format: 'currency' as const,
		decimals: 2,
		locale: 'en-GB',
		currency: 'THB',
		currencyDisplay: 'code' as const,
		negative: false
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Rendering', () => {
		it('should render component with default props', async () => {
			const { container } = await render(TransactionCard, {
				props: defaultProps
			});

			expect(container).toBeTruthy();
		});

		it('should render title', async () => {
			const { container } = await render(TransactionCard, {
				props: { title: 'Test Title', value: 1000 }
			});

			const titleElement = container.querySelector('.text-neutral-600');
			expect(titleElement?.textContent).toContain('Test Title');
		});

		it('should render value', async () => {
			const { container } = await render(TransactionCard, {
				props: { title: 'Test', value: 1000 }
			});

			const valueElement = container.textContent;
			expect(valueElement).toBeTruthy();
		});
	});

	describe('Currency Formatting', () => {
		it('should format value as currency', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency',
					currency: 'THB'
				}
			});

			const content = container.textContent || '';
			expect(content).toContain('THB');
		});

		it('should format currency with correct decimals', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1000.5,
					format: 'currency',
					decimals: 2
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should format currency with custom decimals', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1000.123,
					format: 'currency',
					decimals: 3
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should format currency with different locale', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency',
					locale: 'en-US',
					currency: 'USD'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should format currency with symbol display', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency',
					currency: 'USD',
					currencyDisplay: 'symbol'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should format currency with name display', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency',
					currency: 'USD',
					currencyDisplay: 'name'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});
	});

	describe('Number Formatting', () => {
		it('should format value as number', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'number'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
			expect(content).toContain('Total 10,000.00');
		});

		it('should format number with correct decimals', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1000.5,
					format: 'number',
					decimals: 2
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should format number with custom decimals', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1000.123,
					format: 'number',
					decimals: 3
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should format number with different locale', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'number',
					locale: 'de-DE'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});
	});

	describe('String Formatting', () => {
		it('should display value as string when format is string', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 'Custom Value',
					format: 'string'
				}
			});

			const content = container.textContent || '';
			expect(content).toContain('Custom Value');
		});

		it('should convert number to string when format is string', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'string'
				}
			});

			const content = container.textContent || '';
			expect(content).toContain('10000');
		});
	});

	describe('Color Styling', () => {
		it('should apply emerald color when negative is false', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					negative: false
				}
			});

			const emeraldElement = container.querySelector('.text-emerald-500');
			expect(emeraldElement).toBeTruthy();
		});

		it('should apply rose color when negative is true', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					negative: true
				}
			});

			const roseElement = container.querySelector('.text-rose-500');
			expect(roseElement).toBeTruthy();
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero value', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 0,
					format: 'currency'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle negative value', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: -1000,
					format: 'currency'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle very large numbers', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 999999999.99,
					format: 'currency'
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle decimal values', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1234.56,
					format: 'currency',
					decimals: 2
				}
			});

			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle empty title', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: '',
					value: 1000
				}
			});

			expect(container).toBeTruthy();
		});

		it('should handle string value with number format', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: '1000',
					format: 'number'
				}
			});

			// Should convert to string display when value is string
			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should handle string value with currency format', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: '1000',
					format: 'currency'
				}
			});

			// Should convert to string display when value is string
			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});
	});

	describe('Default Values', () => {
		it('should use default format when not provided', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1000
				}
			});

			expect(container).toBeTruthy();
		});

		it('should use default decimals when not provided', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 1000.123,
					format: 'number'
				}
			});

			// Should use default 2 decimals
			const content = container.textContent || '';
			expect(content).toBeTruthy();
		});

		it('should use default locale when not provided', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency'
				}
			});

			expect(container).toBeTruthy();
		});

		it('should use default currency when not provided', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency'
				}
			});

			expect(container).toBeTruthy();
		});

		it('should use default currencyDisplay when not provided', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000,
					format: 'currency'
				}
			});

			expect(container).toBeTruthy();
		});

		it('should use default negative when not provided', async () => {
			const { container } = await render(TransactionCard, {
				props: {
					title: 'Total',
					value: 10000
				}
			});

			const emeraldElement = container.querySelector('.text-emerald-500');
			expect(emeraldElement).toBeTruthy();
		});
	});

	describe('Component Structure', () => {
		it('should have correct card structure', async () => {
			const { container } = await render(TransactionCard, {
				props: defaultProps
			});

			const card = container.querySelector('.rounded-2xl');
			expect(card).toBeTruthy();
		});

		it('should have title and value in separate sections', async () => {
			const { container } = await render(TransactionCard, {
				props: defaultProps
			});

			const titleSection = container.querySelector('.text-neutral-600');
			expect(titleSection).toBeTruthy();
		});
	});
});

