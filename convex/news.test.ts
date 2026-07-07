/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { describe, expect, test } from 'vitest'
import { api, internal } from './_generated/api'
import schema from './schema'
import { NEWS_STALE_AFTER_MS } from './shared/news'

const modules = import.meta.glob('./**/*.ts')
const newT = () => convexTest(schema, modules)

// M5-T2 cache behavior: latestNews is public, auth-free, bounded, and never
// throws; replaceItems is all-or-nothing so a bad batch can never wipe the
// last-good cache (the stale-cache fallback the Assistant screen relies on).

const HOUR = 60 * 60 * 1000

function item(overrides: Partial<{ title: string; url: string; publishedAt: number; summary: string }> = {}) {
	return {
		title: 'USCIS Updates Guidance',
		url: `https://www.uscis.gov/newsroom/item-${Math.random().toString(36).slice(2)}`,
		publishedAt: Date.now() - HOUR,
		summary: 'Short summary.',
		...overrides,
	}
}

describe('latestNews', () => {
	test('returns an empty, non-stale result on an empty cache (never throws)', async () => {
		const t = newT()
		await expect(t.query(api.news.latestNews, {})).resolves.toEqual({
			items: [],
			fetchedAt: null,
			isStale: false,
		})
	})

	test('requires no authentication', async () => {
		const t = newT()
		// No withIdentity — an unauthenticated read must still succeed.
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toEqual([])
	})

	test('returns items newest-first, capped at 8', async () => {
		const t = newT()
		const now = Date.now()
		const items = Array.from({ length: 12 }, (_, i) =>
			item({
				title: `Item ${i}`,
				url: `https://www.uscis.gov/newsroom/item-${i}`,
				publishedAt: now - i * HOUR,
			}),
		)
		await t.mutation(internal.news.replaceItems, { items, fetchedAt: now })
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toHaveLength(8)
		expect(result.items.map((i) => i.title)).toEqual(
			Array.from({ length: 8 }, (_, i) => `Item ${i}`),
		)
		expect(result.isStale).toBe(false)
		expect(result.fetchedAt).toBe(now)
	})

	test('isStale flips when the cache is older than 48h', async () => {
		const t = newT()
		const old = Date.now() - NEWS_STALE_AFTER_MS - HOUR
		await t.mutation(internal.news.replaceItems, { items: [item()], fetchedAt: old })
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toHaveLength(1)
		expect(result.isStale).toBe(true)
	})
})

describe('replaceItems — write-time safety', () => {
	test('drops non-uscis.gov urls even if the parser were bypassed', async () => {
		const t = newT()
		const now = Date.now()
		await t.mutation(internal.news.replaceItems, {
			items: [
				item({ url: 'https://www.uscis.gov/newsroom/real', title: 'Real' }),
				item({ url: 'https://evil.example.com/fake', title: 'Fake' }),
			],
			fetchedAt: now,
		})
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toHaveLength(1)
		expect(result.items[0].url).toBe('https://www.uscis.gov/newsroom/real')
	})

	test('an all-invalid batch throws and leaves the existing cache untouched', async () => {
		const t = newT()
		const now = Date.now()
		await t.mutation(internal.news.replaceItems, {
			items: [item({ url: 'https://www.uscis.gov/newsroom/keep-me', title: 'Keep me' })],
			fetchedAt: now,
		})
		await expect(
			t.mutation(internal.news.replaceItems, {
				items: [item({ url: 'https://evil.example.com/only-bad' })],
				fetchedAt: now + HOUR,
			}),
		).rejects.toThrow(/keeping the existing cache/i)
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toHaveLength(1)
		expect(result.items[0].title).toBe('Keep me')
	})

	test('a fresh batch fully replaces the previous one (bounded, no accretion)', async () => {
		const t = newT()
		const now = Date.now()
		await t.mutation(internal.news.replaceItems, {
			items: [item({ title: 'Old', url: 'https://www.uscis.gov/old' })],
			fetchedAt: now - HOUR,
		})
		await t.mutation(internal.news.replaceItems, {
			items: [item({ title: 'New', url: 'https://www.uscis.gov/new', publishedAt: now })],
			fetchedAt: now,
		})
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toHaveLength(1)
		expect(result.items[0].title).toBe('New')
	})

	test('recordFetchFailure leaves cached items readable', async () => {
		const t = newT()
		const now = Date.now()
		await t.mutation(internal.news.replaceItems, { items: [item({ title: 'Survives' })], fetchedAt: now })
		await t.mutation(internal.news.recordFetchFailure, { failedAt: now + HOUR })
		const result = await t.query(api.news.latestNews, {})
		expect(result.items).toHaveLength(1)
		expect(result.items[0].title).toBe('Survives')
	})
})
