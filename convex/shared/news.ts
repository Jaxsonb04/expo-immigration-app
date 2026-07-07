// M5-T2: pure, dependency-free parsing + validation for the official USCIS
// "All News" RSS feed. Kept out of convex/news.ts so vitest can unit-test the
// parser without the Convex runtime (same split as shared/navigator.ts).
//
// SAFETY (trust/UPL): every item shown to a filer must be official. The single
// gate is `isOfficialUscisUrl` — a link is kept ONLY when it starts with
// https://www.uscis.gov/ — and it is enforced twice: here at parse time and
// again in the replaceItems mutation before anything is written.

export const MAX_NEWS_ITEMS = 12
export const OFFICIAL_USCIS_URL_PREFIX = 'https://www.uscis.gov/'
/** Cache older than this is flagged stale in latestNews (48h). */
export const NEWS_STALE_AFTER_MS = 48 * 60 * 60 * 1000

const MAX_TITLE_CHARS = 300
const MAX_SUMMARY_CHARS = 200
const MAX_URL_CHARS = 500
const MAX_DATE_CHARS = 100

export type ParsedNewsItem = {
	title: string
	url: string
	publishedAt: number
	summary: string
}

/** True only for links on the official uscis.gov site — nothing else ships. */
export function isOfficialUscisUrl(url: string): boolean {
	return url.startsWith(OFFICIAL_USCIS_URL_PREFIX)
}

const ENTITIES: Record<string, string> = {
	'&amp;': '&',
	'&lt;': '<',
	'&gt;': '>',
	'&quot;': '"',
	'&#039;': "'",
	'&#39;': "'",
	'&apos;': "'",
	'&nbsp;': ' ',
}

/** Decode the handful of entities the USCIS feed actually uses. */
export function decodeEntities(text: string): string {
	return text.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#0?39);/g, (match) => ENTITIES[match] ?? match)
}

/** Unwrap CDATA, strip tags, decode entities, collapse whitespace, truncate. */
function cleanText(raw: string, maxChars: number): string {
	const unwrapped = raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
	const withoutTags = unwrapped.replace(/<[^>]*>/g, ' ')
	// Twice: the feed double-encodes some descriptions (&amp;nbsp; et al.).
	const collapsed = decodeEntities(decodeEntities(withoutTags))
		.replace(/\s+/g, ' ')
		// tag-stripping pads with spaces; do not let one land before punctuation
		.replace(/ ([.,;:!?])/g, '$1')
		.trim()
	if (collapsed.length <= maxChars) return collapsed
	return `${collapsed.slice(0, maxChars - 1).trimEnd()}…`
}

/** The inner text of the first `<tag>…</tag>` in an item block, or null. */
function tagContent(block: string, tag: string): string | null {
	const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
	return match ? match[1] : null
}

/**
 * Parse RSS 2.0 `<item>` blocks into bounded, validated news items. This is a
 * deliberately narrow string parser (no XML dependency): unknown markup simply
 * fails to match and yields []. Items are dropped — never repaired — when the
 * title is empty, the pubDate is unparseable, or the link is not on
 * https://www.uscis.gov/. Output is capped at MAX_NEWS_ITEMS and deduped by url.
 */
export function parseRssItems(xml: string): ParsedNewsItem[] {
	if (typeof xml !== 'string' || xml.length === 0) return []
	const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
	const items: ParsedNewsItem[] = []
	const seenUrls = new Set<string>()
	for (const block of blocks) {
		if (items.length >= MAX_NEWS_ITEMS) break
		const title = cleanText(tagContent(block, 'title') ?? '', MAX_TITLE_CHARS)
		const url = cleanText(tagContent(block, 'link') ?? '', MAX_URL_CHARS)
		const summary = cleanText(tagContent(block, 'description') ?? '', MAX_SUMMARY_CHARS)
		const publishedAt = Date.parse(cleanText(tagContent(block, 'pubDate') ?? '', MAX_DATE_CHARS))
		if (title.length === 0) continue
		if (!Number.isFinite(publishedAt)) continue
		if (!isOfficialUscisUrl(url)) continue
		if (seenUrls.has(url)) continue
		seenUrls.add(url)
		items.push({ title, url, publishedAt, summary })
	}
	return items
}
