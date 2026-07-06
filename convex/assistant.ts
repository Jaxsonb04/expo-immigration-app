'use node'

import Anthropic from '@anthropic-ai/sdk'
import { v } from 'convex/values'
import { action, env } from './_generated/server'
import { internal } from './_generated/api'
import type { AssistantUsage } from './assistantQuota'

// M1-T1: the validated Claude backend. A "use node" action so it can use the
// Anthropic SDK; it holds NO database access itself — authorization and the
// per-owner daily quota are delegated to internal mutations in assistantQuota.ts
// (auth propagates to nested calls). ANTHROPIC_API_KEY / ANTHROPIC_MODEL live
// only in Convex deployment env (convex.config.ts) and never reach the client.
//
// This is the transport layer. The safe-navigator classification (M1-T2) and
// the chat UI (M1-T3) build on top of it.

const MAX_MESSAGE_CHARS = 4000
const MAX_HISTORY_TURNS = 40
const MAX_OUTPUT_TOKENS = 1024
const DEFAULT_MODEL = 'claude-opus-4-8'

const SYSTEM_PROMPT = [
	'You are an informational assistant inside a self-help app that helps people',
	'prepare recurring USCIS filings (Form I-90 and Form I-765).',
	'',
	'Boundaries you must always keep:',
	'- You provide general information only. You never give legal advice, predict',
	'  case outcomes, or tell someone which eligibility category applies to them.',
	'- You are not affiliated with USCIS or any government agency; never imply that',
	'  you are, and never claim to file anything on the user’s behalf.',
	'- If a question needs legal judgment, say so plainly and suggest the user',
	'  consult a qualified immigration attorney or an accredited representative.',
	'- Keep answers short, plain-language, and calm.',
].join('\n')

type SendMessageResult = { reply: string; usage: AssistantUsage }

/**
 * Send one user message (plus optional device-session history) to Claude and
 * return a validated reply. Enforces the caller's daily quota and keeps all
 * secrets server-side. Anonymous and authenticated owners are treated the same
 * — both carry a server-derived owner identity (ADR-0009).
 */
export const sendMessage = action({
	args: {
		message: v.string(),
		history: v.optional(
			v.array(
				v.object({
					role: v.union(v.literal('user'), v.literal('assistant')),
					content: v.string(),
				}),
			),
		),
	},
	handler: async (ctx, args): Promise<SendMessageResult> => {
		const message = args.message.trim()
		if (message.length === 0) {
			throw new Error('Message cannot be empty')
		}
		if (message.length > MAX_MESSAGE_CHARS) {
			throw new Error('Message is too long')
		}
		const history = args.history ?? []
		if (history.length > MAX_HISTORY_TURNS) {
			throw new Error('Conversation is too long')
		}
		// Cap every turn, not just the new message, so client-supplied history
		// can't inflate input-token cost past the per-message bound.
		if (history.some((turn) => turn.content.length > MAX_MESSAGE_CHARS)) {
			throw new Error('A previous message is too long')
		}

		// Secret must be present server-side; checked before consuming quota.
		const apiKey = env.ANTHROPIC_API_KEY
		if (!apiKey) {
			throw new Error('The assistant is not configured')
		}
		const model = env.ANTHROPIC_MODEL ?? DEFAULT_MODEL

		// Reserve one message against the daily quota (auth enforced in here).
		// The quota bounds *billed Anthropic calls*, so a message is only
		// refunded when the API call itself fails before Anthropic bills us
		// (network / API error). A refusal or an empty reply is still a billed
		// call, so it counts — otherwise a client could force unlimited paid
		// calls with refusal-triggering prompts while `remaining` never drops.
		const usage = await ctx.runMutation(internal.assistantQuota.reserveDailyMessage, {})

		let response: Anthropic.Message
		try {
			const anthropic = new Anthropic({ apiKey })
			const messages: Anthropic.MessageParam[] = [...history, { role: 'user', content: message }]
			response = await anthropic.messages.create({
				model,
				max_tokens: MAX_OUTPUT_TOKENS,
				system: SYSTEM_PROMPT,
				messages,
			})
		} catch {
			// The call never produced a (billed) response — refund and surface a
			// generic error without leaking Anthropic internals.
			await ctx.runMutation(internal.assistantQuota.refundDailyMessage, {})
			throw new Error('The assistant is temporarily unavailable. Please try again.')
		}

		// From here the call was billed; the message counts (no refunds).
		if (response.stop_reason === 'refusal') {
			return {
				reply:
					"I can't help with that request, but I can share general information about the Form I-90 and Form I-765 processes.",
				usage,
			}
		}

		const reply = response.content
			.filter((block): block is Anthropic.TextBlock => block.type === 'text')
			.map((block) => block.text)
			.join('')
			.trim()

		if (reply.length === 0) {
			return { reply: 'I wasn’t able to generate a response. Please try rephrasing your question.', usage }
		}

		return { reply, usage }
	},
})
