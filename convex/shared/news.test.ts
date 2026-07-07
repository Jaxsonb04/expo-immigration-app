import { describe, expect, test } from 'vitest'
import { decodeEntities, MAX_NEWS_ITEMS, parseRssItems } from './news'

// M5-T2 parser tests. The fixture mirrors the real uscis.gov "All News" feed
// shape: RSS 2.0, <item> blocks with title/link/description/pubDate, entities
// and stray markup inside descriptions.

function rssDocument(items: string): string {
	return [
		'<?xml version="1.0" encoding="utf-8"?>',
		'<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">',
		'<channel>',
		'<title>USCIS.gov (all news items)</title>',
		'<link>https://www.uscis.gov/</link>',
		items,
		'</channel>',
		'</rss>',
	].join('\n')
}

function rssItem(overrides: Partial<Record<'title' | 'link' | 'description' | 'pubDate', string>> = {}): string {
	const fields = {
		title: 'USCIS Updates Policy Guidance',
		link: 'https://www.uscis.gov/newsroom/news-releases/uscis-updates-policy-guidance',
		description: 'USCIS today announced updated guidance.',
		pubDate: 'Mon, 06 Jul 2026 14:00:00 -0400',
		...overrides,
	}
	return [
		'<item>',
		`  <title>${fields.title}</title>`,
		`  <link>${fields.link}</link>`,
		`  <description>${fields.description}</description>`,
		`  <pubDate>${fields.pubDate}</pubDate>`,
		'</item>',
	].join('\n')
}

const REALISTIC_FEED = rssDocument(
	[
		rssItem({
			title: 'USCIS Announces New Fee Rule &amp; Filing Updates',
			link: 'https://www.uscis.gov/newsroom/news-releases/fee-rule',
			description:
				'<p>USCIS today announced a new rule affecting &lt;certain&gt; filings. Read the &quot;full notice&quot; online.</p>',
			pubDate: 'Mon, 06 Jul 2026 14:00:00 -0400',
		}),
		rssItem({
			title: 'Alert: Processing Times Improve for Form I-90',
			link: 'https://www.uscis.gov/newsroom/alerts/i-90-processing',
			description: 'It&#039;s now faster to renew a green card.',
			pubDate: 'Sun, 05 Jul 2026 09:30:00 -0400',
		}),
		rssItem({
			title: 'USCIS Opens New Field Office',
			link: 'https://www.uscis.gov/newsroom/news-releases/new-field-office',
			description: '<![CDATA[<div>The office opens <b>next month</b>.</div>]]>',
			pubDate: 'Fri, 03 Jul 2026 08:00:00 -0400',
		}),
	].join('\n'),
)

describe('parseRssItems — happy path', () => {
	test('parses a realistic three-item feed with entities, tags, and CDATA', () => {
		const items = parseRssItems(REALISTIC_FEED)
		expect(items).toHaveLength(3)
		expect(items[0]).toEqual({
			title: 'USCIS Announces New Fee Rule & Filing Updates',
			url: 'https://www.uscis.gov/newsroom/news-releases/fee-rule',
			publishedAt: Date.parse('Mon, 06 Jul 2026 14:00:00 -0400'),
			summary: 'USCIS today announced a new rule affecting <certain> filings. Read the "full notice" online.',
		})
		expect(items[1].summary).toBe("It's now faster to renew a green card.")
		expect(items[2].summary).toBe('The office opens next month.')
	})

	test('feed order is preserved', () => {
		const items = parseRssItems(REALISTIC_FEED)
		expect(items.map((item) => item.publishedAt)).toEqual(
			[...items.map((item) => item.publishedAt)].sort((a, b) => b - a),
		)
	})
})

describe('parseRssItems — bounding', () => {
	test(`caps output at ${MAX_NEWS_ITEMS} items`, () => {
		const many = Array.from({ length: 30 }, (_, i) =>
			rssItem({ link: `https://www.uscis.gov/newsroom/item-${i}`, title: `Item ${i}` }),
		).join('\n')
		expect(parseRssItems(rssDocument(many))).toHaveLength(MAX_NEWS_ITEMS)
	})

	test('truncates long descriptions to ~200 chars with an ellipsis', () => {
		const long = 'USCIS word '.repeat(60)
		const [item] = parseRssItems(rssDocument(rssItem({ description: long })))
		expect(item.summary.length).toBeLessThanOrEqual(200)
		expect(item.summary.endsWith('…')).toBe(true)
	})

	test('dedupes repeated urls', () => {
		const feed = rssDocument([rssItem(), rssItem()].join('\n'))
		expect(parseRssItems(feed)).toHaveLength(1)
	})
})

describe('parseRssItems — safety gate', () => {
	test('drops any item whose url is not on https://www.uscis.gov/', () => {
		const feed = rssDocument(
			[
				rssItem({ link: 'https://uscis-updates.example.com/fake', title: 'Unofficial mirror' }),
				rssItem({ link: 'http://www.uscis.gov/insecure', title: 'Plain http' }),
				rssItem({ link: 'https://www.uscis.gov.evil.com/phish', title: 'Lookalike domain' }),
				rssItem({ link: 'https://www.uscis.gov/newsroom/real', title: 'Real item' }),
			].join('\n'),
		)
		const items = parseRssItems(feed)
		expect(items).toHaveLength(1)
		expect(items[0].url).toBe('https://www.uscis.gov/newsroom/real')
	})

	test('drops items with an empty title or unparseable pubDate', () => {
		const feed = rssDocument(
			[
				rssItem({ title: '  ' }),
				rssItem({ pubDate: 'not a date', link: 'https://www.uscis.gov/a' }),
				rssItem({ link: 'https://www.uscis.gov/b' }),
			].join('\n'),
		)
		expect(parseRssItems(feed)).toHaveLength(1)
	})
})

describe('parseRssItems — malformed input', () => {
	test('returns [] for malformed XML', () => {
		expect(parseRssItems('<rss><channel><item><title>broken')).toEqual([])
	})

	test('returns [] for empty and non-feed strings', () => {
		expect(parseRssItems('')).toEqual([])
		expect(parseRssItems('<!DOCTYPE html><html><body>Access denied</body></html>')).toEqual([])
	})
})

describe('decodeEntities', () => {
	test('decodes the common feed entities', () => {
		expect(decodeEntities('Fee &amp; Form &lt;I-90&gt; &quot;update&quot; &#039;now&#039; &#39;ok&#39;')).toBe(
			'Fee & Form <I-90> "update" \'now\' \'ok\'',
		)
	})

	test('decodes double-encoded entities the feed sometimes emits', () => {
		const [item] = parseRssItems(
			rssDocument(rssItem({ description: 'partnered with DOJ in its&amp;nbsp;recent filings' })),
		)
		expect(item.summary).toBe('partnered with DOJ in its recent filings')
	})

	test('leaves unknown entities alone', () => {
		expect(decodeEntities('&copy; USCIS')).toBe('&copy; USCIS')
	})
})
