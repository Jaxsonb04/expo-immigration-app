import { describe, expect, test } from 'vitest'
import { documentTypes } from './applicationShapes'
import {
	compatibleDocumentTypes,
	isDocumentCompatible,
	uploadDocumentType,
} from './documentCompatibility'
import { evidenceRequirementFor } from './evidenceRequirements'
import { requiredSlotKeys, requirementTemplates } from './interviewSteps'

// Every requirement key the app can ever materialize as a slot. The base
// templates plus the two answer-aware additions (I-90 name change, I-765
// (c)(8) arrests) — reproduced through the real requiredSlotKeys function so
// a new answer-aware slot can't be added without hitting this list.
function everyPossibleRequirementKey(): string[] {
	const keys = new Set<string>()
	for (const [formType, byKind] of Object.entries(requirementTemplates)) {
		for (const kind of Object.keys(byKind)) {
			for (const answers of [
				undefined,
				...['C08', 'C09', 'C10', 'C33', 'A05', 'A03', 'A17', 'C26'].map((eligibilityCategory) => ({
					personFacts: { eligibilityCategory, hasUsedOtherNames: 'yes' },
					form: {
						c8EverArrestedOrConvicted: 'yes',
						replacementReason: 'lost',
					},
				})),
				...['lost', 'stolen', 'destroyed', 'damaged', 'error', 'nameChange'].map(
					(replacementReason) => ({
						form: {
							replacementReason,
							nameChangedSinceIssuance: replacementReason === 'nameChange' ? 'yes' : 'no',
						},
					}),
				),
			]) {
				for (const key of requiredSlotKeys(
					formType as keyof typeof requirementTemplates,
					kind as 'initial' | 'renewal' | 'replacement',
					answers,
				)) {
					keys.add(key)
				}
			}
		}
	}
	return [...keys]
}

describe('documentCompatibility drift guard', () => {
	test('every producible requirement key has a catalog entry and document items have types', () => {
		// isDocumentCompatible fails CLOSED for unmapped keys, so a missing
		// entry would block attaching anything to that slot — this test is what
		// keeps that from ever shipping.
		for (const key of everyPossibleRequirementKey()) {
			const requirement = evidenceRequirementFor(key)
			expect(requirement, `missing evidence catalog entry for "${key}"`).toBeDefined()
			if (requirement?.fulfillment === 'document') {
				expect(
					compatibleDocumentTypes[key],
					`missing compatibility entry for "${key}"`,
				).toBeDefined()
				expect(compatibleDocumentTypes[key]!.length).toBeGreaterThan(0)
			} else {
				expect(compatibleDocumentTypes[key]).toBeUndefined()
			}
		}
	})

	test('every compatibility entry uses real Vault document types', () => {
		for (const [key, types] of Object.entries(compatibleDocumentTypes)) {
			for (const type of types) {
				expect(documentTypes, `"${key}" lists unknown type "${type}"`).toContain(type)
			}
		}
	})

	test('fails closed for unknown requirement keys', () => {
		expect(isDocumentCompatible('someFutureRequirement', 'other')).toBe(false)
		expect(uploadDocumentType('someFutureRequirement')).toBe('other')
	})

	test('spot checks: type gating matches the printed requirements', () => {
		expect(isDocumentCompatible('eadCard', 'ead')).toBe(true)
		expect(isDocumentCompatible('eadCard', 'photo')).toBe(false)
		// Two paper photos are a physical checklist item; a single uploaded
		// image must not satisfy their quantity.
		expect(isDocumentCompatible('passportPhoto', 'photo')).toBe(false)
		expect(isDocumentCompatible('passportPhoto', 'passport')).toBe(false)
		expect(isDocumentCompatible('nameChangeEvidence', 'other')).toBe(true)
		expect(uploadDocumentType('permanentResidentCard')).toBe('permanentResidentCard')
	})
})
