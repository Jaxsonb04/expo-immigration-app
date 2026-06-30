/// <reference types="vite/client" />
import { convexTest } from 'convex-test'
import { expect, test } from 'vitest'
import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.ts')

async function makeApplicant(account: ReturnType<ReturnType<typeof convexTest>['withIdentity']>) {
	return await account.mutation(api.applicants.createApplicant, {
		displayName: 'Maria Gomez',
		relationship: 'self',
	})
}

test('a document’s metadata is saved and listed for its applicant', async () => {
	const t = convexTest(schema, modules)
	const account = t.withIdentity({ subject: 'account-a' })
	const applicantId = await makeApplicant(account)

	await account.mutation(api.documents.addDocument, {
		applicantId,
		type: 'ead',
		expiryDate: '2026-09-30',
	})

	const docs = await account.query(api.documents.listDocuments, { applicantId })
	expect(docs).toHaveLength(1)
	expect(docs[0]).toMatchObject({ type: 'ead', expiryDate: '2026-09-30', version: 1 })
})

test('adding a newer document of the same type supersedes the prior as current', async () => {
	const t = convexTest(schema, modules)
	const account = t.withIdentity({ subject: 'account-a' })
	const applicantId = await makeApplicant(account)

	await account.mutation(api.documents.addDocument, {
		applicantId,
		type: 'ead',
		expiryDate: '2024-09-30',
	})
	await account.mutation(api.documents.addDocument, {
		applicantId,
		type: 'ead',
		expiryDate: '2026-09-30',
	})

	// The latest upload is the current EAD...
	const current = await account.query(api.documents.getCurrentDocument, {
		applicantId,
		type: 'ead',
	})
	expect(current).toMatchObject({ version: 2, expiryDate: '2026-09-30' })

	// ...but both versions are retained in the vault.
	const docs = await account.query(api.documents.listDocuments, { applicantId })
	expect(docs).toHaveLength(2)
})

test('listDocuments and addDocument are scoped to the applicant’s owner', async () => {
	const t = convexTest(schema, modules)
	const accountA = t.withIdentity({ subject: 'account-a' })
	const accountB = t.withIdentity({ subject: 'account-b' })
	const applicantId = await makeApplicant(accountA)
	await accountA.mutation(api.documents.addDocument, { applicantId, type: 'passport' })

	// B cannot list A's applicant's documents...
	expect(await accountB.query(api.documents.listDocuments, { applicantId })).toEqual([])
	// ...nor add documents to A's applicant.
	await expect(
		accountB.mutation(api.documents.addDocument, { applicantId, type: 'passport' }),
	).rejects.toThrow('Applicant not found')
})

test('getCurrentDocument hides other accounts’ documents and returns null for unseen types', async () => {
	const t = convexTest(schema, modules)
	const accountA = t.withIdentity({ subject: 'account-a' })
	const accountB = t.withIdentity({ subject: 'account-b' })
	const applicantId = await makeApplicant(accountA)
	await accountA.mutation(api.documents.addDocument, {
		applicantId,
		type: 'ead',
		expiryDate: '2026-09-30',
	})

	// B cannot read A's current EAD (no leak through getCurrentDocument)...
	expect(
		await accountB.query(api.documents.getCurrentDocument, { applicantId, type: 'ead' }),
	).toBeNull()
	// ...and a type the owner never added returns null rather than an unrelated doc.
	expect(
		await accountA.query(api.documents.getCurrentDocument, { applicantId, type: 'passport' }),
	).toBeNull()
})

test('generateUploadUrl mints a URL for an authed caller and rejects the unauthenticated', async () => {
	const t = convexTest(schema, modules)
	const account = t.withIdentity({ subject: 'account-a' })

	const url = await account.mutation(api.documents.generateUploadUrl, {})
	expect(typeof url).toBe('string')
	expect(url.length).toBeGreaterThan(0)

	// Without an identity the upload URL must not be issued.
	await expect(t.mutation(api.documents.generateUploadUrl, {})).rejects.toThrow('Not authenticated')
})

test('deleteDocument removes the document (and its stored file) for its owner', async () => {
	const t = convexTest(schema, modules)
	const account = t.withIdentity({ subject: 'account-a' })
	const applicantId = await makeApplicant(account)

	// Store a real blob so deletion exercises the storage path too.
	const storageId = await t.run((ctx) => ctx.storage.store(new Blob(['pretend pdf bytes'])))
	await account.mutation(api.documents.addDocument, { applicantId, type: 'passport', storageId })

	const before = await account.query(api.documents.listDocuments, { applicantId })
	expect(before).toHaveLength(1)
	const documentId = before[0]._id

	await account.mutation(api.documents.deleteDocument, { documentId })

	// The document is gone from the vault...
	expect(await account.query(api.documents.listDocuments, { applicantId })).toEqual([])
	// ...and its stored file was deleted, so no signed URL can be issued.
	const meta = await t.run((ctx) => ctx.db.system.get(storageId))
	expect(meta).toBeNull()
})

test('deleteDocument is owner-scoped: a non-owner cannot delete another account’s document', async () => {
	const t = convexTest(schema, modules)
	const accountA = t.withIdentity({ subject: 'account-a' })
	const accountB = t.withIdentity({ subject: 'account-b' })
	const applicantId = await makeApplicant(accountA)
	await accountA.mutation(api.documents.addDocument, { applicantId, type: 'passport' })
	const docs = await accountA.query(api.documents.listDocuments, { applicantId })
	const documentId = docs[0]._id

	// B cannot delete A's document...
	await expect(
		accountB.mutation(api.documents.deleteDocument, { documentId }),
	).rejects.toThrow('Document not found')
	// ...and it remains in A's vault.
	expect(await accountA.query(api.documents.listDocuments, { applicantId })).toHaveLength(1)
})

test('getDocumentUrl returns a URL for the owner but null for a non-owner', async () => {
	const t = convexTest(schema, modules)
	const accountA = t.withIdentity({ subject: 'account-a' })
	const accountB = t.withIdentity({ subject: 'account-b' })
	const applicantId = await makeApplicant(accountA)

	const storageId = await t.run((ctx) => ctx.storage.store(new Blob(['pretend pdf bytes'])))
	await accountA.mutation(api.documents.addDocument, { applicantId, type: 'passport', storageId })
	const docs = await accountA.query(api.documents.listDocuments, { applicantId })
	const documentId = docs[0]._id

	// The owner gets a signed download URL...
	const ownerUrl = await accountA.query(api.documents.getDocumentUrl, { documentId })
	expect(typeof ownerUrl).toBe('string')
	expect(ownerUrl?.length ?? 0).toBeGreaterThan(0)

	// ...but a non-owner is denied issuance (null, no leak).
	expect(await accountB.query(api.documents.getDocumentUrl, { documentId })).toBeNull()
})

test('listRecentDocuments returns the owner’s recent documents across applicants, owner-scoped', async () => {
	const t = convexTest(schema, modules)
	const accountA = t.withIdentity({ subject: 'account-a' })
	const accountB = t.withIdentity({ subject: 'account-b' })
	const applicantId = await makeApplicant(accountA)

	await accountA.mutation(api.documents.addDocument, { applicantId, type: 'passport' })
	await accountA.mutation(api.documents.addDocument, { applicantId, type: 'ead' })

	const recent = await accountA.query(api.documents.listRecentDocuments, { limit: 5 })
	expect(recent).toHaveLength(2)
	expect(recent[0].type).toBe('ead') // most recent first

	// Owner-scoped: account B sees none of A's documents.
	expect(await accountB.query(api.documents.listRecentDocuments, {})).toEqual([])
})

test('listDocumentsPaginated returns the owner’s documents and is owner-scoped', async () => {
	const t = convexTest(schema, modules)
	const accountA = t.withIdentity({ subject: 'account-a' })
	const accountB = t.withIdentity({ subject: 'account-b' })
	const applicantId = await makeApplicant(accountA)
	await accountA.mutation(api.documents.addDocument, { applicantId, type: 'passport' })

	const pageA = await accountA.query(api.documents.listDocumentsPaginated, {
		paginationOpts: { numItems: 10, cursor: null },
	})
	expect(pageA.page).toHaveLength(1)

	const pageB = await accountB.query(api.documents.listDocumentsPaginated, {
		paginationOpts: { numItems: 10, cursor: null },
	})
	expect(pageB.page).toEqual([])
})
