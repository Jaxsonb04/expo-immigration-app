import { supportedSituations } from '@convex/shared/applicationShapes'
import { describe, expect, test } from 'vitest'

import { situationKey, situationKeyFromParams } from './new-application.situations'

// M1-T4 handoff: the assistant passes formType/applicationKind as deep-link
// params. This pins the boundary rule — only the five supported situations
// preselect; anything else falls back to no preselection ('').

describe('situationKeyFromParams', () => {
	test.each(supportedSituations)(
		'preselects $formType/$applicationKind',
		({ formType, applicationKind }) => {
			expect(situationKeyFromParams(formType, applicationKind)).toBe(
				situationKey({ formType, applicationKind }),
			)
		},
	)

	test('returns empty for the unsupported i90 initial combo', () => {
		expect(situationKeyFromParams('i90', 'initial')).toBe('')
	})

	test('returns empty for unknown or missing params', () => {
		expect(situationKeyFromParams(undefined, undefined)).toBe('')
		expect(situationKeyFromParams('i765', undefined)).toBe('')
		expect(situationKeyFromParams('i765', 'renewal; drop table')).toBe('')
		expect(situationKeyFromParams('n400', 'renewal')).toBe('')
		expect(situationKeyFromParams('', '')).toBe('')
	})
})
