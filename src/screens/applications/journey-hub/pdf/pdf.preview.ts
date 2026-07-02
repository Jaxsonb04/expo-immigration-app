import i90Meta from '@/assets/forms/i-90.meta.json'
import i765Meta from '@/assets/forms/i-765.meta.json'
import { situationLabel } from '@/lib/application-labels'
import type { FormType } from '@convex/shared/applicationShapes'
import { Asset } from 'expo-asset'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { renderDraftPreview, type RenderDraftArgs } from './pdf.render'

// On-device glue for the watermarked draft Preview: resolve the bundled
// current-edition USCIS template, render it via the pure engine (pdf.render.ts),
// write the result to the cache directory only — generated on demand, never
// persisted (ADR-0007) — and hand it to the OS share sheet. Uses the legacy
// expo-file-system subpath deliberately: pdf-lib wants the string base64 API.

// Metro bundles the normalized templates as static assets (metro.config assetExts).
const TEMPLATE_MODULES: Record<FormType, number> = {
	i765: require('@/assets/forms/i-765.pdf'),
	i90: require('@/assets/forms/i-90.pdf'),
}

const FORM_META: Record<FormType, { title: string; omb: string; ombExpires: string }> = {
	i765: i765Meta,
	i90: i90Meta,
}

/** Edition signals (title, OMB number + expiration) read from the bundled asset. */
export function formMetaFor(formType: FormType): {
	title: string
	omb: string
	ombExpires: string
} {
	return FORM_META[formType]
}

const OUTPUT_FILENAMES: Record<FormType, string> = {
	i765: 'i-765-draft-preview.pdf',
	i90: 'i-90-draft-preview.pdf',
}

/**
 * Render the draft's answers onto the bundled USCIS form and open the
 * watermarked result in the OS share sheet (print/save happen there).
 * Rejects on any asset, render, or share failure so the caller can surface it.
 */
export async function openDraftPreview(args: RenderDraftArgs): Promise<void> {
	const asset = Asset.fromModule(TEMPLATE_MODULES[args.formType])
	if (!asset.localUri) {
		await asset.downloadAsync()
	}
	const templateBase64 = await FileSystem.readAsStringAsync(asset.localUri ?? asset.uri, {
		encoding: FileSystem.EncodingType.Base64,
	})

	const { base64 } = await renderDraftPreview(templateBase64, args)

	const outUri = `${FileSystem.cacheDirectory}${OUTPUT_FILENAMES[args.formType]}`
	await FileSystem.writeAsStringAsync(outUri, base64, {
		encoding: FileSystem.EncodingType.Base64,
	})

	// Fail loudly rather than silently no-op: without the share sheet the
	// preview never appears, so the caller must be able to surface an error.
	if (!(await Sharing.isAvailableAsync())) {
		throw new Error("Opening files isn't available on this device.")
	}
	await Sharing.shareAsync(outUri, {
		mimeType: 'application/pdf',
		UTI: 'com.adobe.pdf',
		dialogTitle: `${situationLabel(args.formType, args.applicationKind).primary} — draft preview`,
	})
}
