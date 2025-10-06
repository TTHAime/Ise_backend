import { writable } from 'svelte/store';

export const ApiRoot = 'http://localhost:4000/';

// ---- types ----
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

// ---- stores ----
export const incomeCategories = writable<CompleteCategory[]>([]);
export const expenseCategories = writable<CompleteCategory[]>([]);

export const incomeSeries = writable<number[]>([]);
export const expenseSeries = writable<number[]>([]);

// ---- helpers ----
const apiFetch = (path: string, init: RequestInit = {}) =>
	fetch(`${ApiRoot}${path.startsWith('/') ? path.slice(1) : path}`, {
		credentials: 'include',
		headers: { Accept: 'application/json', ...(init.headers ?? {}) },
		...init
	});

const asArray = (x: unknown): any[] => {
	if (Array.isArray(x)) return x;
	if (x && typeof x === 'object') {
		const obj = x as any;
		// ✅ handle common shapes
		if (Array.isArray(obj.transactions)) return obj.transactions;
		if (Array.isArray(obj.items)) return obj.items;
		if (Array.isArray(obj.data)) return obj.data;
		if (Array.isArray(obj.categories)) return obj.categories;
	}
	return [];
};

const toComplete = (c: any): CompleteCategory => ({
	id: String(c.id),
	name: String(c.name ?? ''),
	color: String(c.color ?? '#999999'),
	icon: c.icon ?? undefined,
	type: (c.type === 'INCOME' ? 'INCOME' : 'EXPENSE') as const,
	createdAt: String(c.createdAt ?? c.createedAt ?? ''),
	updatedAt: String(c.updatedAt ?? ''),
	count: Number(c?._count?.transactions ?? 0)
});

// ---- fetchers ----
export async function fetchIncomeCategories(): Promise<void> {
	try {
		const res = await apiFetch('category?type=INCOME');
		if (!res.ok) throw new Error(await res.text());
		const raw = await res.json();
		const arr = asArray(raw)
			.map(toComplete)
			.map((c) => ({ ...c, type: 'INCOME' as const }));
		incomeCategories.set(arr);
	} catch (e) {
		console.error('Error fetching INCOME categories:', e);
		incomeCategories.set([]);
	}
}

export async function fetchExpenseCategories(): Promise<void> {
	try {
		const res = await apiFetch('category?type=EXPENSE');
		if (!res.ok) throw new Error(await res.text());
		const raw = await res.json();
		const arr = asArray(raw)
			.map(toComplete)
			.map((c) => ({ ...c, type: 'EXPENSE' as const }));
		expenseCategories.set(arr);
	} catch (e) {
		console.error('Error fetching EXPENSE categories:', e);
		expenseCategories.set([]);
	}
}

export async function allFetchCategories(): Promise<void> {
	await Promise.all([fetchIncomeCategories(), fetchExpenseCategories()]);
}

// ---- monthly data → series ----
const monthRange = (d = new Date()) => {
	const start = new Date(d.getFullYear(), d.getMonth(), 1);
	const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
	return { start, end };
};

export async function loadData(when?: Date) {
	const { start, end } = monthRange(when);
	const paramsBase = new URLSearchParams({
		dateFrom: start.toISOString(),
		dateTo: end.toISOString()
	});

	const makeUrl = (type: 'INCOME' | 'EXPENSE') => {
		const qs = new URLSearchParams(paramsBase);
		qs.set('type', type);
		return `${ApiRoot}transaction?${qs.toString()}`;
	};

	try {
		const [incRes, expRes] = await Promise.all([
			fetch(makeUrl('INCOME'), { credentials: 'include', headers: { Accept: 'application/json' } }),
			fetch(makeUrl('EXPENSE'), { credentials: 'include', headers: { Accept: 'application/json' } })
		]);

		if (!incRes.ok) throw new Error(`INCOME ${incRes.status}: ${await incRes.text()}`);
		if (!expRes.ok) throw new Error(`EXPENSE ${expRes.status}: ${await expRes.text()}`);

		const [incRaw, expRaw] = await Promise.all([incRes.json(), expRes.json()]);
		const income = asArray(incRaw);
		const expense = asArray(expRaw);


		incomeSeries.set(income);
		expenseSeries.set(expense);
	} catch (err) {
		console.error('Failed to load monthly:', err);
		incomeSeries.set([]);
		expenseSeries.set([]);
		throw err;
	}
}
