import { api } from '@convex/_generated/api'
import { useQuery } from 'convex/react'
import * as WebBrowser from 'expo-web-browser'
import { Surface, Typography } from 'heroui-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { styledIcon } from '@/components/styled-icon'

import { formatRelativeTime } from './community.format'

const NewspaperIcon = styledIcon({ family: 'lucide', name: 'newspaper' })
const ExternalLinkIcon = styledIcon({ family: 'lucide', name: 'external-link' })
const BadgeCheckIcon = styledIcon({ family: 'lucide', name: 'badge-check' })

// M5-T2, re-homed to the Forum tab in M7-T6: compact official-news section
// above the peer feed. Everything rendered here comes from the server-side
// cache in convex/news.ts, which only ever stores https://www.uscis.gov/
// links — this component adds no other sources.

const NEWSROOM_URL = 'https://www.uscis.gov/newsroom'
const MAX_VISIBLE_ITEMS = 3

function openOfficialLink(url: string) {
	void WebBrowser.openBrowserAsync(url)
}

/** Empty-cache fallback: a single link-out to the official newsroom. */
function NewsroomLinkRow() {
	return (
		<Pressable accessibilityRole="link" onPress={() => openOfficialLink(NEWSROOM_URL)}>
			<Surface variant="secondary" className="flex-row items-center gap-3 rounded-2xl p-4">
				<NewspaperIcon size={18} className="text-muted" />
				<Typography.Paragraph color="muted" className="flex-1 text-sm">
					Read the latest at uscis.gov/newsroom
				</Typography.Paragraph>
				<ExternalLinkIcon size={13} className="text-muted" />
			</Surface>
		</Pressable>
	)
}

/**
 * "Latest from USCIS" — up to three cached official items with source links
 * and timestamps, capped so the peer feed below stays within reach. Loading
 * renders nothing; an empty cache renders the newsroom link-out; a stale
 * cache keeps showing the last-good items with an "Updated … · may be out of
 * date" note.
 */
export function UscisNews() {
	const news = useQuery(api.news.latestNews, {})
	// Snapshotted once per mount, like the community screens — relative times
	// here are day-granularity, so drift within a session is invisible.
	const [now] = useState(() => Date.now())
	if (news === undefined) return null
	if (news.items.length === 0) return <NewsroomLinkRow />

	return (
		<Surface variant="secondary" className="rounded-2xl px-4 pb-1 pt-4">
			<View className="flex-row items-center justify-between pb-1.5">
				<Typography.Paragraph className="font-medium">Latest from USCIS</Typography.Paragraph>
				<View className="flex-row items-center gap-1">
					<BadgeCheckIcon size={12} className="text-muted" />
					<Typography.Paragraph color="muted" className="text-xs">
						Official · uscis.gov
					</Typography.Paragraph>
				</View>
			</View>
			{news.items.slice(0, MAX_VISIBLE_ITEMS).map((item) => (
				<Pressable
					key={item.url}
					accessibilityRole="link"
					onPress={() => openOfficialLink(item.url)}
				>
					<View className="flex-row items-center gap-3 border-t border-separator py-2.5">
						<View className="flex-1 gap-0.5">
							<Typography.Paragraph numberOfLines={2} className="text-sm leading-snug">
								{item.title}
							</Typography.Paragraph>
							<Typography.Paragraph color="muted" className="text-xs">
								{formatRelativeTime(item.publishedAt, now)}
							</Typography.Paragraph>
						</View>
						<ExternalLinkIcon size={13} className="text-muted" />
					</View>
				</Pressable>
			))}
			{news.isStale && news.fetchedAt !== null ? (
				<Typography.Paragraph color="muted" className="border-t border-separator py-2 text-xs">
					Updated {formatRelativeTime(news.fetchedAt, now)} · may be out of date
				</Typography.Paragraph>
			) : null}
		</Surface>
	)
}
