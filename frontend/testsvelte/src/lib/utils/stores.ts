import { writable,get } from 'svelte/store';

// ---- stores ----
// export const ApiRoot = 'http://localhost:4000/';
export const ApiRoot = 'https://ise-ifwk.onrender.com/';
export let Dashboard = writable<string[]>([]);

export const incomeCategories = writable<CompleteCategory[]>([]);
export const expenseCategories = writable<CompleteCategory[]>([]);

export const incomeSeries = writable<number[]>([]);
export const expenseSeries = writable<number[]>([]);

export let Totalincome = writable(20);
export let Totalexpense = writable(10);


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
async function fetchIncomeCategories(): Promise<void> {
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

async function fetchExpenseCategories(): Promise<void> {
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

async function loadallFetchCategories(): Promise<void> {
	await Promise.all([fetchIncomeCategories(), fetchExpenseCategories()]);
}

// ---- monthly data → series ----
const monthRange = (d = new Date()) => {
	const start = new Date(d.getFullYear(), d.getMonth(), 1);
	const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
	return { start, end };
};

export async function loadData(): Promise<void>;
export async function loadData(when: Date | string): Promise<void>;
export async function loadData(from: Date | string, to: Date | string): Promise<void>;

export async function loadData(a?: Date | string, b?: Date | string) {
	// --- helpers ---
	const toDate = (x: Date | string) => (x instanceof Date ? x : new Date(x));
	const iso = (d: Date) => d.toISOString();

	// --- resolve start/end ---
	let start: Date;
	let end: Date;

	if (a && b) {
		// two-arg mode: custom range
		let from = toDate(a);
		let to = toDate(b);
		// normalize
		from = new Date(from.getFullYear(), from.getMonth(), from.getDate());
		to   = new Date(to.getFullYear(),   to.getMonth(),   to.getDate());
		// swap if needed
		if (to < from) [from, to] = [to, from];
		start = from;
		end = to;
	} else {
		// zero/one-arg mode: use monthRange like before
		const base = a ? toDate(a) : new Date();
		const r = monthRange(base); // { start: Date, end: Date }
		start = r.start;
		end = r.end;
	}

	const paramsBase = new URLSearchParams({
		dateFrom: iso(start),
		dateTo: iso(end)
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
		console.error('Failed to load range:', err);
		incomeSeries.set([]);
		expenseSeries.set([]);
		throw err;
	}
}

async function loadDaashboard() {
	try {
		const res = await fetch(`${ApiRoot}dashboard`, {
			method: 'GET',
			credentials: 'include',
			headers: { Accept: 'application/json' }
		});

		if (!res.ok) {
			const errText = await res.text();
			throw new Error(`HTTP ${res.status} ${res.statusText}: ${errText}`);
		}

		const data = await res.json();
		Dashboard.set(data);
        Totalexpense.set(Number(data.data.totalExpense))
        Totalincome.set(Number(data.data.totalIncome))
	} catch (err) {
		console.error('Failed to load dashboard:', err);
		throw err;
	}
}

export function loadAll(){
    loadDaashboard();
    loadData();
    loadallFetchCategories();
}
