import { vi } from 'vitest';

// Mock navigation and assets before importing modules that use them
vi.mock('$app/navigation', () => ({
	goto: vi.fn()
}));

vi.mock('$lib/assets/expenTrack_logo.svg', () => ({
	default: '/test-logo.svg'
}));

vi.mock('$lib/assets/userpic.png', () => ({
	default: '/test-userpic.png'
}));

import { beforeEach, describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page } from '@vitest/browser/context';
import Navbar from './Navbar.svelte';
import { goto } from '$app/navigation';

describe('Navbar Component', () => {
	const mockUser = {
		user: {
			displayName: 'Test User',
			profileImage: 'https://example.com/profile.jpg'
		}
	};

	const defaultProps = {
		user: null,
		loginClick: vi.fn(),
		signupClick: vi.fn(),
		logoutClick: vi.fn()
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Component Rendering', () => {
		it('should render navbar with logo and title', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: defaultProps
			});

			const logo = container.querySelector('img[alt="ExpenTrack"]');
			const title = container.querySelector('.bg-gradient-to-r');
			
			expect(logo).toBeTruthy();
			expect(title?.textContent).toContain('ExpenTrack');
		});

		it('should render login/signup buttons when user is not logged in', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: null }
			});

			const loginButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('log in')
			);
			const signupButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('Sign up')
			);

			expect(loginButton).toBeTruthy();
			expect(signupButton).toBeTruthy();
		});

		it('should render user menu when user is logged in', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const userImage = container.querySelector('img[alt="User-Pic"]');
			const displayName = container.querySelector('span.ml-2');
			const notificationBell = container.querySelector('.cursor-pointer');

			expect(userImage).toBeTruthy();
			expect(displayName?.textContent).toBe('Test User');
			expect(notificationBell).toBeTruthy();
		});

		it('should not show login/signup buttons when user is logged in', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const loginButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('log in')
			);
			const signupButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('Sign up')
			);

			expect(loginButton).toBeFalsy();
			expect(signupButton).toBeFalsy();
		});
	});

	describe('User Display', () => {
		it('should display user display name', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const nameSpan = Array.from(container.querySelectorAll('span')).find((span) =>
				span.textContent?.includes('Test User')
			);
			expect(nameSpan).toBeTruthy();
		});

		it('should display user profile image', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const userImage = container.querySelector('img[alt="User-Pic"]') as HTMLImageElement;
			expect(userImage?.src).toContain('profile.jpg');
		});

		it('should use default userpic when profileImage is not provided', async () => {
			const userWithoutImage = {
				user: {
					displayName: 'Test User'
				}
			};

			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: userWithoutImage }
			});

			const userImage = container.querySelector('img[alt="User-Pic"]');
			expect(userImage).toBeTruthy();
		});

		it('should display empty string when displayName is not provided', async () => {
			const userWithoutName = {
				user: {
					profileImage: 'https://example.com/profile.jpg'
				}
			};

			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: userWithoutName }
			});

			const nameSpan = container.querySelector('span.ml-2');
			expect(nameSpan?.textContent).toBe('');
		});
	});

	describe('Notification Toggle', () => {
		it('should toggle notification dropdown when bell icon is clicked', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			// Initially, notification dropdown should not be visible
			let notificationDropdown = container.querySelector('.absolute.right-0');
			expect(notificationDropdown).toBeFalsy();

			// Find and click the bell icon
			const bellIcon = container.querySelector('.cursor-pointer');
			if (bellIcon) {
				(bellIcon as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// After click, notification dropdown should be visible
			notificationDropdown = container.querySelector('.absolute.right-0');
			expect(notificationDropdown).toBeTruthy();
		});

		it('should show "No new notifications" message in dropdown', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const bellIcon = container.querySelector('.cursor-pointer');
			if (bellIcon) {
				(bellIcon as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const notificationText = container.querySelector('.text-gray-700');
			expect(notificationText?.textContent).toContain('No new notifications');
		});

		it('should toggle notification dropdown off when clicked again', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const bellIcon = container.querySelector('.cursor-pointer');
			if (bellIcon) {
				// First click - open
				(bellIcon as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
				await new Promise((resolve) => setTimeout(resolve, 100));

				let notificationDropdown = container.querySelector('.absolute.right-0');
				expect(notificationDropdown).toBeTruthy();

				// Second click - close
				(bellIcon as HTMLElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
				await new Promise((resolve) => setTimeout(resolve, 100));

				notificationDropdown = container.querySelector('.absolute.right-0');
				expect(notificationDropdown).toBeFalsy();
			}
		});
	});

	describe('Login/Signup Buttons (Not Logged In)', () => {
		it('should call loginClick when login button is clicked', async () => {
			const loginClick = vi.fn();
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: null, loginClick }
			});

			const loginButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('log in')
			);

			if (loginButton) {
				(loginButton as HTMLElement).click();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			expect(loginClick).toHaveBeenCalled();
		});

		it('should call signupClick when signup button is clicked', async () => {
			const signupClick = vi.fn();
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: null, signupClick }
			});

			const signupButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('Sign up')
			);

			if (signupButton) {
				(signupButton as HTMLElement).click();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			expect(signupClick).toHaveBeenCalled();
		});
	});

	describe('Help and About Us Buttons (Not Logged In)', () => {
		it('should render Help button when user is not logged in', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: null }
			});

			const helpButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('Help')
			);
			expect(helpButton).toBeTruthy();
		});

		it('should navigate to home when Help button is clicked', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: null }
			});

			const helpButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('Help')
			);

			if (helpButton) {
				(helpButton as HTMLElement).click();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			expect(goto).toHaveBeenCalledWith('');
		});

		it('should render About Us button when user is not logged in', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: null }
			});

			const aboutButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('About Us')
			);
			expect(aboutButton).toBeTruthy();
		});

		it('should navigate to /etc when About Us button is clicked', async () => {
			const { container } = await render(Navbar, {
				props: { ...defaultProps, user: null }
			});

			const aboutButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('About Us')
			);

			if (aboutButton) {
				(aboutButton as HTMLElement).click();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			expect(goto).toHaveBeenCalledWith('/etc');
		});
	});

	describe('Optional Props', () => {
		it('should work without optional callback props', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { user: null }
			});

			const loginButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('log in')
			);

			if (loginButton) {
				(loginButton as HTMLElement).click();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Should not throw error even without loginClick prop
			expect(container).toBeTruthy();
		});

		it('should use default empty functions for optional callbacks', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { user: mockUser }
			});

			const logoutButton = Array.from(container.querySelectorAll('button')).find((btn) =>
				btn.textContent?.includes('logout')
			);

			if (logoutButton) {
				(logoutButton as HTMLElement).click();
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Should not throw error even without logoutClick prop
			expect(container).toBeTruthy();
		});
	});

	describe('Navigation Structure', () => {
		it('should have proper nav element structure', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: defaultProps
			});

			const nav = container.querySelector('nav');
			const ul = container.querySelector('ul');
			
			expect(nav).toBeTruthy();
			expect(ul).toBeTruthy();
		});

		it('should have sticky positioning', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: defaultProps
			});

			const nav = container.querySelector('nav');
			expect(nav?.classList.contains('sticky')).toBe(true);
		});
	});

	describe('Accessibility', () => {
		it('should have aria-label on user menu button', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const userButton = container.querySelector('button[aria-label="Open user menu"]');
			expect(userButton).toBeTruthy();
		});

		it('should have alt text on logo image', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: defaultProps
			});

			const logo = container.querySelector('img[alt="ExpenTrack"]');
			expect(logo).toBeTruthy();
		});

		it('should have alt text on user profile image', async () => {
			const { container } = await render(Navbar, {
				target: document.body,
				props: { ...defaultProps, user: mockUser }
			});

			const userImage = container.querySelector('img[alt="User-Pic"]');
			expect(userImage).toBeTruthy();
		});
	});
});

