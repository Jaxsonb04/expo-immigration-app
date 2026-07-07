import type { AssistantRecommendation } from '@convex/shared/navigator'
import { supportedSituations } from '@convex/shared/applicationShapes'
import { describe, expect, test } from 'vitest'

import {
	describeRecommendation,
	formLabel,
	OPENING_REPLIES,
	situationTitle,
} from './assistant.recommendation'

// The chat UI never re-derives eligibility; it only renders the navigator's
// structured result. This pins the copy contract for every arm of the union so
// a mis-mapped or missing arm can't ship silently.

describe('describeRecommendation — supported', () => {
	test.each(supportedSituations)(
		'renders a recommendation card for $formType/$applicationKind',
		({ formType, applicationKind }) => {
			const rec: AssistantRecommendation = { type: 'supported', formType, applicationKind }
			const content = describeRecommendation(rec)
			expect(content.kind).toBe('recommendation')
			if (content.kind !== 'recommendation') return
			expect(content.formType).toBe(formType)
			expect(content.applicationKind).toBe(applicationKind)
			expect(content.formLabel).toBe(formLabel(formType))
			expect(content.title).toBe(situationTitle(formType, applicationKind))
			// Cards carry no suggested replies and never leak the field code.
			expect(content).not.toHaveProperty('suggestions')
		},
	)

	test('titles read in plain language, not form codes', () => {
		expect(situationTitle('i765', 'renewal')).toBe('Work permit renewal')
		expect(situationTitle('i90', 'replacement')).toBe('Green card replacement')
		expect(situationTitle('i765', 'initial')).toBe('Work permit first-time application')
	})
})

describe('describeRecommendation — needsClarification', () => {
	test('missing credential asks credential with EAD/green-card replies', () => {
		const content = describeRecommendation({ type: 'needsClarification', missing: 'credential' })
		expect(content.kind).toBe('text')
		if (content.kind !== 'text') return
		expect(content.text).toMatch(/work permit|green card/i)
		expect(content.suggestions?.map((s) => s.label)).toEqual(['Work permit (EAD)', 'Green card'])
	})

	test('missing situation asks situation with first/renewal/replacement replies', () => {
		const content = describeRecommendation({ type: 'needsClarification', missing: 'situation' })
		expect(content.kind).toBe('text')
		if (content.kind !== 'text') return
		expect(content.suggestions?.map((s) => s.label)).toEqual([
			'First time',
			'Renewal',
			'Replacement',
		])
	})
})

describe('describeRecommendation — outOfScope', () => {
	const reasons = ['unsupportedForm', 'unsupportedSituation', 'legalAdvice'] as const

	test.each(reasons)('%s renders plain text with an attorney referral', (reason) => {
		const content = describeRecommendation({ type: 'outOfScope', reason })
		expect(content.kind).toBe('text')
		if (content.kind !== 'text') return
		expect(content.text.length).toBeGreaterThan(0)
		expect(content.text).toMatch(/attorney|accredited representative/i)
		// An out-of-scope answer must never offer a shortcut back into a form.
		expect(content.suggestions).toBeUndefined()
	})

	test('legal-advice copy explicitly declines to advise', () => {
		const content = describeRecommendation({ type: 'outOfScope', reason: 'legalAdvice' })
		if (content.kind !== 'text') throw new Error('expected text')
		expect(content.text).toMatch(/can’t give legal advice|cannot give legal advice/i)
	})
})

describe('opening replies', () => {
	test('each opening reply carries a full, self-contained message', () => {
		expect(OPENING_REPLIES.length).toBeGreaterThanOrEqual(3)
		for (const reply of OPENING_REPLIES) {
			expect(reply.label.length).toBeGreaterThan(0)
			// A complete situation, not a bare keyword, so one tap can resolve.
			expect(reply.message.split(' ').length).toBeGreaterThan(3)
		}
	})
})
