/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { api } from './_generated/api'
import type { Id } from './_generated/dataModel'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')
const newT = () => convexTest(schema, modules)

beforeEach(() => {
	vi.stubEnv('DEV_SEED_ENABLED', 'true')
})

// Create an owner + applicant + i765-renewal application (which materializes
// the eadCard/passportPhoto requirement slots) and a stored file. Returns the
// handles the document tests need.
async function setup() {
	const t = newT()
	const alice = t.withIdentity({ subject: 'alice' })
	const applicantId = await alice.mutation(api.applicants.createApplicant, {
		displayName: 'Alice',
		isSelf: true,
	})
	const applicationId = await alice.mutation(api.applications.createApplication, {
		applicantId,
		formType: 'i765',
		applicationKind: 'renewal',
	})
	const storageId = await t.run((ctx) => ctx.storage.store(new Blob(['ead'], { type: 'image/jpeg' })))
	return { t, alice, applicantId, applicationId, storageId }
}

async function firstSlot(alice: ReturnType<ReturnType<typeof newT>['withIdentity']>, applicationId: Id<'applications'>) {
	const detail = await alice.query(api.applications.getApplication, { applicationId })
	return detail.requirements[0]!
}

describe('generateUploadUrl', () => {
	test('requires authentication', async () => {
		const t = newT()
		await expect(t.mutation(api.documents.generateUploadUrl, {})).rejects.toThrow()
	})
})

describe('saveDocument', () => {
	test('records an owned document; rejects a foreign applicant', async () => {
		const { t, alice, applicantId, storageId } = await setup()
		const documentId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
			expiryDate: '2030-01-01',
		})
		const doc = await t.run((ctx) => ctx.db.get('documents', documentId))
		expect(doc).toMatchObject({ applicantId, type: 'ead', expiryDate: '2030-01-01' })

		const bob = t.withIdentity({ subject: 'bob' })
		await expect(
			bob.mutation(api.documents.saveDocument, { applicantId, type: 'ead', storageId }),
		).rejects.toThrow('Applicant not found')
	})

	test('rejects a malformed expiry date', async () => {
		const { alice, applicantId, storageId } = await setup()
		await expect(
			alice.mutation(api.documents.saveDocument, {
				applicantId,
				type: 'ead',
				storageId,
				expiryDate: '01/01/2030',
			}),
		).rejects.toThrow('valid expiry')
	})
})

describe('attachDocument', () => {
	test('attaches an owned document to an owned slot', async () => {
		const { t, alice, applicantId, applicationId, storageId } = await setup()
		const documentId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const slot = await firstSlot(alice, applicationId)
		await alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId })

		const updated = await t.run((ctx) => ctx.db.get('applicationDocuments', slot._id))
		expect(updated).toMatchObject({ status: 'attached', documentId })
	})

	test("rejects another owner's slot or document", async () => {
		const { t, alice, applicantId, applicationId, storageId } = await setup()
		const documentId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const slot = await firstSlot(alice, applicationId)
		const bob = t.withIdentity({ subject: 'bob' })
		await expect(
			bob.mutation(api.documents.attachDocument, { slotId: slot._id, documentId }),
		).rejects.toThrow('Requirement not found')
	})

	test("rejects a document belonging to a different applicant", async () => {
		const { alice, applicationId, storageId } = await setup()
		// A second applicant + their own document.
		const otherApplicantId = await alice.mutation(api.applicants.createApplicant, {
			displayName: 'Bianca',
			isSelf: false,
		})
		const otherDocId = await alice.mutation(api.documents.saveDocument, {
			applicantId: otherApplicantId,
			type: 'ead',
			storageId,
		})
		const slot = await firstSlot(alice, applicationId)
		await expect(
			alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId: otherDocId }),
		).rejects.toThrow('different applicant')
	})

	test('reuse: a document populates a LATER application without re-upload', async () => {
		const { alice, applicantId, applicationId, storageId } = await setup()
		const documentId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const slot1 = await firstSlot(alice, applicationId)
		await alice.mutation(api.documents.attachDocument, { slotId: slot1._id, documentId })

		// A brand-new application for the SAME applicant — its matching
		// requirement slot (eadCard again, so the EAD is type-compatible) can
		// attach the existing Vault document with no new upload.
		const laterApplicationId = await alice.mutation(api.applications.createApplication, {
			applicantId,
			formType: 'i765',
			applicationKind: 'renewal',
		})
		const laterSlot = await firstSlot(alice, laterApplicationId)
		await alice.mutation(api.documents.attachDocument, { slotId: laterSlot._id, documentId })

		const detail = await alice.query(api.applications.getApplication, {
			applicationId: laterApplicationId,
		})
		expect(detail.requirements.find((r) => r._id === laterSlot._id)).toMatchObject({
			status: 'attached',
			documentId,
		})
	})
})

describe('detachDocument', () => {
	test('returns a slot to needed and clears the link', async () => {
		const { t, alice, applicantId, applicationId, storageId } = await setup()
		const documentId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const slot = await firstSlot(alice, applicationId)
		await alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId })
		await alice.mutation(api.documents.detachDocument, { slotId: slot._id })
		const updated = await t.run((ctx) => ctx.db.get('applicationDocuments', slot._id))
		expect(updated!.status).toBe('needed')
		expect(updated!.documentId).toBeUndefined()
	})
})

describe('uploadNewVersion', () => {
	test('supersedes the old version and re-points attached slots', async () => {
		const { t, alice, applicantId, applicationId, storageId } = await setup()
		const oldId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const slot = await firstSlot(alice, applicationId)
		await alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId: oldId })

		const newStorageId = await t.run((ctx) =>
			ctx.storage.store(new Blob(['ead2'], { type: 'image/jpeg' })),
		)
		const newId = await alice.mutation(api.documents.uploadNewVersion, {
			supersedesId: oldId,
			storageId: newStorageId,
			expiryDate: '2032-06-01',
		})

		const [oldDoc, newDoc, updatedSlot] = await t.run(async (ctx) => [
			await ctx.db.get('documents', oldId),
			await ctx.db.get('documents', newId),
			await ctx.db.get('applicationDocuments', slot._id),
		])
		expect(oldDoc!.supersededById).toBe(newId)
		expect(newDoc).toMatchObject({ supersedesId: oldId, type: 'ead', expiryDate: '2032-06-01' })
		// The attachment now follows the current version.
		expect(updatedSlot!.documentId).toBe(newId)
	})

	test('refuses to branch an already-superseded version', async () => {
		const { t, alice, applicantId, storageId } = await setup()
		const oldId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const s2 = await t.run((ctx) => ctx.storage.store(new Blob(['v2'], { type: 'image/jpeg' })))
		await alice.mutation(api.documents.uploadNewVersion, { supersedesId: oldId, storageId: s2 })
		const s3 = await t.run((ctx) => ctx.storage.store(new Blob(['v3'], { type: 'image/jpeg' })))
		await expect(
			alice.mutation(api.documents.uploadNewVersion, { supersedesId: oldId, storageId: s3 }),
		).rejects.toThrow('newer version')
	})
})

// Workflow-repair P1: the attach rule now checks more than ownership. A photo
// can never satisfy "current EAD card", stale versions can't be attached, and
// a filed application's checklist is frozen.
describe('attach rules: type compatibility, versions, and filed freeze', () => {
	test('rejects a type-incompatible document with an honest message', async () => {
		const { alice, applicantId, applicationId, storageId } = await setup()
		const photoId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'photo',
			storageId,
		})
		// First slot of an i765 renewal is eadCard — a photo can't satisfy it.
		const slot = await firstSlot(alice, applicationId)
		expect(slot.requirementKey).toBe('eadCard')
		await expect(
			alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId: photoId }),
		).rejects.toThrow(/can't satisfy this requirement \(accepts: ead\)/)
	})

	test('accepts the matching type for each slot of the renewal template', async () => {
		const { alice, applicantId, applicationId, storageId } = await setup()
		const detail = await alice.query(api.applications.getApplication, { applicationId })
		const bySlot = { eadCard: 'ead', passportPhoto: 'photo' } as const
		for (const slot of detail.requirements) {
			const documentId = await alice.mutation(api.documents.saveDocument, {
				applicantId,
				type: bySlot[slot.requirementKey as keyof typeof bySlot],
				storageId,
			})
			await alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId })
		}
		const after = await alice.query(api.applications.getApplication, { applicationId })
		expect(after.requirements.every((r) => r.status === 'attached')).toBe(true)
	})

	test('rejects a superseded document version', async () => {
		const { t, alice, applicantId, applicationId, storageId } = await setup()
		const oldId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const s2 = await t.run((ctx) => ctx.storage.store(new Blob(['v2'], { type: 'image/jpeg' })))
		await alice.mutation(api.documents.uploadNewVersion, { supersedesId: oldId, storageId: s2 })
		const slot = await firstSlot(alice, applicationId)
		await expect(
			alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId: oldId }),
		).rejects.toThrow(/newer version/)
	})

	test('attach and detach are refused once the application is filed', async () => {
		const { alice, applicantId, applicationId, storageId } = await setup()
		const documentId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		const slot = await firstSlot(alice, applicationId)
		await alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId })

		await alice.mutation(api.applications.markFiled, {
			applicationId,
			filedAt: Date.now(),
			acknowledgeNotReady: true,
		})
		await expect(alice.mutation(api.documents.detachDocument, { slotId: slot._id })).rejects.toThrow(
			/only draft applications/i,
		)
		const secondDocId = await alice.mutation(api.documents.saveDocument, {
			applicantId,
			type: 'ead',
			storageId,
		})
		await expect(
			alice.mutation(api.documents.attachDocument, { slotId: slot._id, documentId: secondDocId }),
		).rejects.toThrow(/only draft applications/i)

		// The filed record kept its attachment untouched.
		const detail = await alice.query(api.applications.getApplication, { applicationId })
		expect(detail.requirements.find((r) => r._id === slot._id)).toMatchObject({
			status: 'attached',
			documentId,
		})
	})
})
