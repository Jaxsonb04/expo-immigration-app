import type { ApplicationKind, FormType } from '@convex/shared/applicationShapes'

// M1-T3 chat UI. Transcript state is device-session-only (MASTER_PLAN
// "Interfaces"): nothing here is persisted to Convex — only the per-owner daily
// usage counter is. These types describe the on-screen conversation.

/** A tappable suggested reply: a short label the user sees, and the full
 * message it sends on tap (so a single tap can carry a complete situation). */
export type SuggestedReply = { id: string; label: string; message: string }

/** What an assistant turn renders. The navigator returns a structured
 * `AssistantRecommendation`; `describeRecommendation` maps it to one of these.
 * The union is intentionally closed so the mapper stays exhaustive. */
export type AssistantContent =
	| { kind: 'text'; text: string; suggestions?: SuggestedReply[] }
	| {
			kind: 'recommendation'
			formType: FormType
			applicationKind: ApplicationKind
			lead: string
			title: string
			formLabel: string
	  }

/** One row in the transcript. `pending` is the assistant "thinking" bubble;
 * `error` carries the user text so the turn can be retried without retyping. */
export type ChatTurn =
	| { id: string; kind: 'user'; text: string }
	| { id: string; kind: 'assistant'; content: AssistantContent }
	| { id: string; kind: 'pending' }
	| { id: string; kind: 'error'; failedText: string }
