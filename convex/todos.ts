import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

/**
 * List all todos
 */
export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query('todos').collect()
	},
})

export const createTodoAndSendNotification = mutation({
	args: { title: v.string(), description: v.string() },
	handler: async (ctx, args) => {
		console.log('👀 Creating todo...', args)
		const todo = await ctx.db.insert('todos', {
			title: args.title,
			description: args.description,
			completed: false,
		})
		return todo
	},
})

export const deleteTodo = mutation({
	args: { id: v.id('todos') },
	handler: async (ctx, args) => {
		await ctx.db.delete('todos', args.id)
	},
})

export const toggleTodo = mutation({
	args: { id: v.id('todos') },
	handler: async (ctx, args) => {
		const todo = await ctx.db.get(args.id)
		if (!todo) {
			throw new Error('Todo not found')
		}
		await ctx.db.patch(args.id, { completed: !todo.completed })
		return await ctx.db.get(args.id)
	},
})
