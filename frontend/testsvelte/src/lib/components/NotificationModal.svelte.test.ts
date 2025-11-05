import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import NotificationModal from './NotificationModal.svelte';
import { waitFor } from '@testing-library/react';

describe('NotificationModal Component', () => {
	const defaultProps = {
		isOpen: true,
		message: 'Test message',
		type: 'success' as const,
		title: '',
		onClose: vi.fn(),
		noAnim: true // Disable animations for faster tests
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('Component Rendering', () => {
		it('should render when isOpen is true', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, isOpen: true }
			});

			const modal = container.querySelector('[role="dialog"]');
			expect(modal).toBeTruthy();
		});

		it('should not render when isOpen is false', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, isOpen: false }
			});

			const modal = container.querySelector('[role="dialog"]');
			expect(modal).toBeFalsy();
		});

		it('should have correct testId attribute', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, testId: 'custom-test-id' }
			});

			const modal = container.querySelector('[data-testid="custom-test-id"]');
			expect(modal).toBeTruthy();
		});

		it('should use default testId when not provided', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps }
			});

			const modal = container.querySelector('[data-testid="status-modal"]');
			expect(modal).toBeTruthy();
		});
	});

	describe('Notification Types', () => {
		it('should display success notification correctly', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'success', message: 'Success message' }
			});

			// Advance timers to get past loading state
			vi.advanceTimersByTime(1000);
			

			const message = container.querySelector('.text-gray-600');
			expect(message?.textContent).toContain('Success message');
		});

		it('should display error notification correctly', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'error', message: 'Error message' }
			});

			vi.advanceTimersByTime(1000);

			const message = container.querySelector('.text-gray-600');
			expect(message?.textContent).toContain('Error message');
		});

		it('should display warning notification correctly', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'warning', message: 'Warning message' }
			});

			vi.advanceTimersByTime(1000);

			const message = container.querySelector('.text-gray-600');
			expect(message?.textContent).toContain('Warning message');
		});

		it('should display info notification correctly', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'info', message: 'Info message' }
			});

			vi.advanceTimersByTime(1000);

			const message = container.querySelector('.text-gray-600');
			expect(message?.textContent).toContain('Info message');
		});
	});

	describe('Title Display', () => {
		it('should display custom title when provided', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, title: 'Custom Title', message: 'Test', isOpen: true }
			});
			await vi.waitFor(()=>{
			},{ timeout:2000 })
			vi.advanceTimersByTime(1000);
			await expect(container?.textContent).toContain('Custom Title');
		});

		it('should use default title when title is not provided', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'success', title: '' ,isOpen:true}
			});
			await vi.waitFor(()=>{
			},{ timeout:2000 })
			vi.advanceTimersByTime(1000);

			const title = container.querySelector('h3');
			expect(title?.textContent).toContain('Success!');
		});

		it('should use default title for error type', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'error', title: '',isOpen:true }
			});
			await vi.waitFor(()=>{
			},{ timeout:2000 })
			vi.advanceTimersByTime(1000);

			const title = container.querySelector('h3');
			expect(title?.textContent).toContain('Error');
		});

		it('should use default title for warning type', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'warning', title: '',isOpen:true }
			});
			await vi.waitFor(()=>{
			},{ timeout:2000 })
			vi.advanceTimersByTime(1000);

			const title = container.querySelector('h3');
			expect(title?.textContent).toContain('Warning');
		});

		it('should use default title for info type', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'info', title: '',isOpen:true }
			});
			await vi.waitFor(()=>{
			},{ timeout:2000 })
			vi.advanceTimersByTime(1000);

			const title = container.querySelector('h3');
			expect(title?.textContent).toContain('Info');
		});
	});

	describe('Loading State', () => {
		it('should show loading state initially', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, noAnim: true }
			});

			const modal = container.querySelector('[data-state="loading"]');
			expect(modal).toBeTruthy();
		});

		it('should show "Processing..." during loading', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, noAnim: true }
			});

			const title = container.querySelector('h3');
			expect(title?.textContent).toContain('Processing...');
		});
	});

	describe('Auto-Close Functionality', () => {
		it('should clear timers when modal closes', async () => {
			const onClose = vi.fn();
			const { rerender } = await render(NotificationModal, {
				props: { ...defaultProps, onClose, noAnim: true }
			});

			// Close the modal
			await rerender({ ...defaultProps, isOpen: false, onClose, noAnim: true });

			// Advance timers - should not trigger auto-close
			vi.advanceTimersByTime(1000);
			expect(onClose).not.toHaveBeenCalled();
		});
	});

	describe('Reduced Motion', () => {
		it('should respect noAnim prop', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, noAnim: true }
			});

			const modalContent = container.querySelector('.rounded-2xl');
			// Should not have animation class when noAnim is true
			expect(modalContent?.classList.contains('animate-slideIn')).toBe(false);
		});

		it('should use animations when noAnim is false', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, noAnim: false }
			});

			const modalContent = container.querySelector('.rounded-2xl');
			// Should have animation class when noAnim is false
			expect(modalContent?.classList.contains('animate-slideIn')).toBe(true);
		});

		it('should detect e2e class on html element', async () => {
			// Add e2e class to document
			document.documentElement.classList.add('e2e');

			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, noAnim: false }
			});

			const modalContent = container.querySelector('.rounded-2xl');
			// Should not have animation class when e2e class is present
			expect(modalContent?.classList.contains('animate-slideIn')).toBe(false);

			// Clean up
			document.documentElement.classList.remove('e2e');
		});
	});

	describe('Accessibility', () => {
		it('should have role="dialog"', async () => {
			const { container } = await render(NotificationModal, {
				props: defaultProps
			});

			const modal = container.querySelector('[role="dialog"]');
			expect(modal).toBeTruthy();
		});

		it('should have aria-modal="true"', async () => {
			const { container } = await render(NotificationModal, {
				props: defaultProps
			});

			const modal = container.querySelector('[aria-modal="true"]');
			expect(modal).toBeTruthy();
		});

		it('should have aria-label with title', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, title: 'Custom Title' }
			});

			const modal = container.querySelector('[aria-label="Custom Title"]');
			expect(modal).toBeTruthy();
		});

		it('should have aria-label with default title when title not provided', async () => {
			const { container } = await render(NotificationModal, {
				props: { ...defaultProps, type: 'success', title: '' }
			});

			const modal = container.querySelector('[aria-label="Success!"]');
			expect(modal).toBeTruthy();
		});

		it('should have aria-label on close button', async () => {
			const { container } = await render(NotificationModal, {
				props: defaultProps
			});

			const closeButton = container.querySelector('button[aria-label="Close"]');
			expect(closeButton).toBeTruthy();
		});

		it('should have tabindex on dialog', async () => {
			const { container } = await render(NotificationModal, {
				props: defaultProps
			});

			const modal = container.querySelector('[tabindex="0"]');
			expect(modal).toBeTruthy();
		});
	});

	describe('Component Cleanup', () => {
		it('should clear timers on component destroy', async () => {
			const onClose = vi.fn();
			const { unmount } = await render(NotificationModal, {
				props: { ...defaultProps, onClose, noAnim: true }
			});

			// Unmount component
			unmount();

			// Advance timers - should not trigger auto-close after unmount
			vi.advanceTimersByTime(1000);
			expect(onClose).not.toHaveBeenCalled();
		});
	});
});
