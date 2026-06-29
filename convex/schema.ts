import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

// The Better Auth component manages its own tables in an isolated component
// namespace, so no auth tables are needed here. Add your application tables
// to this schema as the app grows.
export default defineSchema({
	todos: defineTable({
		title: v.string(),
		description: v.string(),
		completed: v.boolean(),
	}),
})
