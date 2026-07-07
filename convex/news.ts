import { v } from 'convex/values'
import { internal } from './_generated/api'
import { internalAction, internalMutation, query } from './_generated/server'
import type { MutationCtx } from './_generated/server'
import {
	isOfficialUscisUrl,
	MAX_NEWS_ITEMS,
	NEWS_STALE_AFTER_MS,
	parseRssItems,
} from './shared/news'

// M5-T2: cached official USCIS news. A cron-driven internal action fetches the
// official "All News" RSS feed, parses it with the pure shared/news.ts parser,
// and wholesale-replaces a bounded cache (max 12 rows). On ANY failure the
// existing cache is left untouched (stale-cache fallback) and only the
// newsMeta status row is updated — the Assistant screen keeps showing the
// last-good items with a staleness note. Only https://www.uscis.gov/ links are
// ever stored (enforced at parse AND write time).

const USCIS_RSS_URL = 'https://www.uscis.gov/news/rss-feed/59144'
// uscis.gov 403s default fetch agents; a plain browser UA returns clean XML.
const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
const FETCH_TIMEOUT_MS = 15_000
const LATEST_NEWS_LIMIT = 8

export type LatestNews = {
	items: { title: string; url: string; publishedAt: number; summary: string }[]
	fetchedAt: number | null
	isStale: boolean
}

/**
 * Up to 8 cached official news items, newest-first, plus a staleness flag.
 * Public and auth-free (the content is public USCIS news); never throws — an
 * empty cache returns an empty list and the UI renders its newsroom link-out.
 */
export const latestNews = query({
	args: {},
	handler: async (ctx): Promise<LatestNews> => {
		const rows = await ctx.db
			.query('newsItems')
			.withIndex('by_publishedAt')
			.order('desc')
			.take(LATEST_NEWS_LIMIT)
		const fetchedAt = rows[0]?.fetchedAt ?? null
		return {
			items: rows.map((row) => ({
				title: row.title,
				url: row.url,
				publishedAt: row.publishedAt,
				summary: row.summary,
			})),
			fetchedAt,
			isStale: fetchedAt !== null && Date.now() - fetchedAt > NEWS_STALE_AFTER_MS,
		}
	},
})

/** Upsert the singleton newsMeta status row. */
async function writeMeta(
	ctx: MutationCtx,
	patch: { status: 'ok' | 'error'; lastFetchAt: number; lastSuccessAt?: number },
): Promise<void> {
	const existing = await ctx.db.query('newsMeta').take(1)
	if (existing.length === 0) {
		await ctx.db.insert('newsMeta', patch)
	} else {
		await ctx.db.patch('newsMeta', existing[0]._id, patch)
	}
}

/**
 * Replace the whole cache with a fresh, validated batch. Defense in depth: the
 * uscis.gov-only gate and the 12-item bound are re-enforced here even though
 * the parser already applied both. Throws (rolling the transaction back, cache
 * untouched) if validation leaves nothing — an all-invalid batch is a failure,
 * never a wipe.
 */
export const replaceItems = internalMutation({
	args: {
		items: v.array(
			v.object({
				title: v.string(),
				url: v.string(),
				publishedAt: v.number(),
				summary: v.string(),
			}),
		),
		fetchedAt: v.number(),
	},
	handler: async (ctx, { items, fetchedAt }): Promise<number> => {
		const official = items.filter((item) => isOfficialUscisUrl(item.url)).slice(0, MAX_NEWS_ITEMS)
		if (official.length === 0) {
			throw new Error('replaceItems: no valid official items — keeping the existing cache')
		}
		const existing = await ctx.db.query('newsItems').collect()
		for (const row of existing) {
			await ctx.db.delete('newsItems', row._id)
		}
		for (const item of official) {
			await ctx.db.insert('newsItems', { ...item, fetchedAt })
		}
		await writeMeta(ctx, { status: 'ok', lastFetchAt: fetchedAt, lastSuccessAt: fetchedAt })
		return official.length
	},
})

/** Record a failed fetch without touching the cached items. */
export const recordFetchFailure = internalMutation({
	args: { failedAt: v.number() },
	handler: async (ctx, { failedAt }): Promise<null> => {
		await writeMeta(ctx, { status: 'error', lastFetchAt: failedAt })
		return null
	},
})

/**
 * Fetch + parse + cache the official feed. Cron-driven (convex/crons.ts, every
 * 6h) and safe to run manually. Never throws: every failure path lands in
 * recordFetchFailure so the cron stays healthy and the stale cache survives.
 */
export const fetchNews = internalAction({
	args: {},
	handler: async (ctx): Promise<{ status: 'ok' | 'error'; itemCount: number }> => {
		const now = Date.now()
		try {
			const controller = new AbortController()
			const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
			let xml: string
			try {
				const response = await fetch(USCIS_RSS_URL, {
					headers: {
						'User-Agent': BROWSER_USER_AGENT,
						Accept: 'application/rss+xml, application/xml, text/xml',
					},
					signal: controller.signal,
				})
				if (!response.ok) throw new Error(`USCIS RSS responded ${response.status}`)
				xml = await response.text()
			} finally {
				clearTimeout(timer)
			}
			const items = parseRssItems(xml)
			if (items.length === 0) throw new Error('USCIS RSS parsed to zero valid items')
			const stored = await ctx.runMutation(internal.news.replaceItems, { items, fetchedAt: now })
			return { status: 'ok', itemCount: stored }
		} catch (error) {
			console.error('fetchNews failed; keeping the existing cache', error)
			await ctx.runMutation(internal.news.recordFetchFailure, { failedAt: now })
			return { status: 'error', itemCount: 0 }
		}
	},
})
