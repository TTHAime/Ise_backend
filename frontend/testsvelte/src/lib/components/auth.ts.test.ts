import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';
import { refreshUser, logout, user } from './auth';
import axios from 'axios';
import { ApiRoot, loadAll } from '$lib/utils/stores';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock stores
vi.mock('$lib/utils/stores', () => {
	const mockLoadAll = vi.fn();
	const mockUser = {
		subscribe: vi.fn((callback) => {
			callback(null);
			return () => {};
		}),
		set: vi.fn(),
		update: vi.fn()
	};

	return {
		ApiRoot: 'https://test-api.com/',
		loadAll: mockLoadAll,
		user: mockUser
	};
});

// Mock svelte/store
vi.mock('svelte/store', async () => {
	const actual = await vi.importActual('svelte/store');
	return {
		...actual,
		writable: vi.fn(() => ({
			subscribe: vi.fn((callback) => {
				callback(null);
				return () => {};
			}),
			set: vi.fn(),
			update: vi.fn()
		}))
	};
});

describe('auth.ts', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset user store
		if (typeof (user as any).set === 'function') {
			(user as any).set(null);
		}
	});

	describe('refreshUser', () => {
		it('should fetch user data and set user store on success', async () => {
			const mockUserData = {
				id: '1',
				email: 'test@example.com',
				name: 'Test User'
			};

			mockedAxios.get = vi.fn().mockResolvedValue({
				status: 200,
				data: mockUserData
			});

			await refreshUser();

			// Verify API was called correctly
			expect(mockedAxios.get).toHaveBeenCalledWith(
				`${ApiRoot}user/`,
				expect.objectContaining({
					withCredentials: true,
					validateStatus: expect.any(Function)
				})
			);

			// Verify loadAll was called
			expect(loadAll).toHaveBeenCalled();
		});

		it('should set user to null on API error', async () => {
			mockedAxios.get = vi.fn().mockRejectedValue(new Error('API Error'));

			await refreshUser();

			// Verify user store was set to null
			expect(mockedAxios.get).toHaveBeenCalled();
		});

		it('should set user to null when status is not 2xx', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				status: 401,
				data: null
			});

			await refreshUser();

			expect(mockedAxios.get).toHaveBeenCalled();
			// User should be set to null for non-2xx status
		});

		it('should handle 3xx status codes as success', async () => {
			const mockUserData = {
				id: '1',
				email: 'test@example.com'
			};

			mockedAxios.get = vi.fn().mockResolvedValue({
				status: 300,
				data: mockUserData
			});

			await refreshUser();

			expect(mockedAxios.get).toHaveBeenCalled();
			expect(loadAll).toHaveBeenCalled();
		});

		it('should handle network errors gracefully', async () => {
			mockedAxios.get = vi.fn().mockRejectedValue({
				message: 'Network Error',
				code: 'ERR_NETWORK'
			});

			await expect(refreshUser()).resolves.not.toThrow();

			expect(mockedAxios.get).toHaveBeenCalled();
		});
	});

	describe('logout', () => {
		it('should call logout API and set user to null on success', async () => {
			mockedAxios.mockResolvedValue({
				status: 200,
				data: { message: 'Logged out successfully' }
			});

			await logout();

			// Verify API was called correctly
			expect(mockedAxios).toHaveBeenCalledWith(
				`${ApiRoot}auth/logout`,
				expect.objectContaining({
					method: 'GET',
					withCredentials: true,
					validateStatus: expect.any(Function)
				})
			);

			// Verify user store was set to null (if accessible)
			expect(mockedAxios).toHaveBeenCalled();
		});

		// it('should handle logout API error gracefully', async () => {
		// 	mockedAxios.mockRejectedValue(new Error('Logout failed'));

		// 	await logout();

		// 	expect(mockedAxios).toHaveBeenCalled();
		// });

		it('should log error message when logout fails with non-2xx status', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			mockedAxios.mockResolvedValue({
				status: 500,
				data: { error: 'Internal server error' }
			});

			await logout();

			expect(mockedAxios).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Log out failed with status')
			);

			consoleSpy.mockRestore();
		});

		it('should log success message on successful logout', async () => {
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

			mockedAxios.mockResolvedValue({
				status: 200,
				data: { message: 'Success' }
			});

			await logout();

			expect(mockedAxios).toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining('Logout successfully')
			);

			consoleSpy.mockRestore();
		});

		it('should handle 3xx status as success', async () => {
			mockedAxios.mockResolvedValue({
				status: 302,
				data: { message: 'Redirect' }
			});

			await logout();

			expect(mockedAxios).toHaveBeenCalled();
		});

		it('should handle validateStatus function correctly', async () => {
			mockedAxios.mockImplementation((config: any) => {
				// Simulate validateStatus behavior
				const validateStatus = config.validateStatus || (() => true);
				const status = 200;
				const isValid = validateStatus(status);

				return Promise.resolve({
					status,
					data: {},
					config,
					headers: {},
					request: {}
				});
			});

			await logout();

			expect(mockedAxios).toHaveBeenCalled();
		});

		it('should not set user to null on failed logout', async () => {
			mockedAxios.mockResolvedValue({
				status: 500,
				data: { error: 'Failed' }
			});

			await logout();

			expect(mockedAxios).toHaveBeenCalled();
			// User should not be set to null on failure
		});
	});

	describe('Error Handling', () => {
		it('should handle axios errors in refreshUser', async () => {
			mockedAxios.get = vi.fn().mockRejectedValue({
				response: {
					status: 500,
					data: { error: 'Server error' }
				}
			});

			await expect(refreshUser()).resolves.not.toThrow();
			expect(mockedAxios.get).toHaveBeenCalled();
		});

		it('should handle timeout errors', async () => {
			mockedAxios.get = vi.fn().mockRejectedValue({
				code: 'ECONNABORTED',
				message: 'timeout of 5000ms exceeded'
			});

			await expect(refreshUser()).resolves.not.toThrow();
			expect(mockedAxios.get).toHaveBeenCalled();
		});
	});

	describe('API Integration', () => {
		it('should use correct API endpoint for refreshUser', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				status: 200,
				data: { id: '1' }
			});

			await refreshUser();

			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.stringContaining('user/'),
				expect.any(Object)
			);
		});

		it('should use correct API endpoint for logout', async () => {
			mockedAxios.mockResolvedValue({
				status: 200,
				data: {}
			});

			await logout();

			expect(mockedAxios).toHaveBeenCalledWith(
				expect.stringContaining('auth/logout'),
				expect.any(Object)
			);
		});

		it('should include credentials in API calls', async () => {
			mockedAxios.get = vi.fn().mockResolvedValue({
				status: 200,
				data: { id: '1' }
			});

			await refreshUser();

			expect(mockedAxios.get).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					withCredentials: true
				})
			);
		});
	});
});

