// src/lib/stores.ts
import { writable } from 'svelte/store';

export const ApiRoot = 'http://localhost:4000/'

export type CompleteCategory = {
	id: string;
	name: string;
	color: string;
	icon?: string;
	type: 'INCOME' | 'EXPENSE';
	createdAt: string;
	updatedAt: string;
	count: number;
};

// Writable stores
export const incomeCategories = writable<CompleteCategory[]>([]);
export const expenseCategories = writable<CompleteCategory[]>([]);

// ---- helpers ----
const apiFetch = (path: string, init: RequestInit = {}) =>
	fetch(`${ApiRoot}${path.startsWith('/') ? path : `${path}`}`, {
		credentials: 'include',
		headers: { Accept: 'application/json', ...(init.headers ?? {}) },
		...init
	});

const asCategoryArray = (x: unknown): any[] => {
	if (Array.isArray(x)) return x;
	if (x && typeof x === 'object') {
		const obj = x as any;
		if (Array.isArray(obj.categories)) return obj.categories;
		if (Array.isArray(obj.data)) return obj.data;
	}
	return [];
};

const toComplete = (c: any): CompleteCategory => ({
	id: String(c.id),
	name: String(c.name ?? ''),
	color: String(c.color ?? '#999999'),
	icon: c.icon ?? undefined,
	type: (c.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as 'INCOME' | 'EXPENSE',
	createdAt: String(c.createdAt ?? c.createedAt ?? ''), // tolerate old typo
	updatedAt: String(c.updatedAt ?? ''),
	count: Number(c?._count?.transactions ?? 0)
});

// ---- fetchers ----
export async function fetchIncomeCategories(): Promise<void> {
	try {
		const res = await apiFetch('category?type=INCOME', { method: 'GET' });
		if (!res.ok) throw new Error(await res.text());
		const raw = await res.json();
		const arr = asCategoryArray(raw)
			.map(toComplete)
			.map((c) => ({ ...c, type: 'INCOME' }));
		incomeCategories.set(arr);
	} catch (e) {
		console.error('Error fetching INCOME categories:', e);
		incomeCategories.set([]);
	}
}

export async function fetchExpenseCategories(): Promise<void> {
	try {
		const res = await apiFetch('category?type=EXPENSE', { method: 'GET' });
		if (!res.ok) throw new Error(await res.text());
		const raw = await res.json();
		const arr = asCategoryArray(raw)
			.map(toComplete)
			.map((c) => ({ ...c, type: 'EXPENSE' }));
		expenseCategories.set(arr);
	} catch (e) {
		console.error('Error fetching EXPENSE categories:', e);
		expenseCategories.set([]);
	}
}

export async function allFetchCategories(): Promise<void> {
	await Promise.all([fetchIncomeCategories(), fetchExpenseCategories()]);
}
