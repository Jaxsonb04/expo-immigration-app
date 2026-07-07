import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

// Scheduled jobs. M5-T2: refresh the official USCIS news cache every 6 hours;
// a failed run leaves the previous cache in place (see convex/news.ts).

const crons = cronJobs()

crons.interval('refresh USCIS news cache', { hours: 6 }, internal.news.fetchNews, {})

export default crons
