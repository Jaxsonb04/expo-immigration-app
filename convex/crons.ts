import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

// Scheduled jobs. M5-T2: refresh the official USCIS news cache every 6 hours;
// a failed run leaves the previous cache in place (see convex/news.ts).
// M6-T4: daily, permanently delete anonymous accounts older than 48 hours
// that never converted (boundary + safety notes in convex/tempAccounts.ts).

const crons = cronJobs()

crons.interval('refresh USCIS news cache', { hours: 6 }, internal.news.fetchNews, {})

crons.interval(
	'clean up expired temp accounts',
	{ hours: 24 },
	internal.tempAccounts.cleanupTempAccounts,
	{},
)

export default crons
