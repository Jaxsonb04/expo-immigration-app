import type {
	ApplicationKind,
	I765DraftAnswers,
	I90DraftAnswers,
} from '@convex/shared/applicationShapes'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { applyOps, drawDraftWatermark } from './pdf.fill'
import { buildI765Ops } from './pdf.i765-map'
import { buildI90Ops } from './pdf.i90-map'

// Lives apart from pdf.fill.ts so the engine stays a leaf module: the maps
// import the engine's helpers, and only this dispatcher imports the maps —
// a cycle here would trip Metro's require-cycle warning on every dev launch.

export type RenderDraftArgs = (
	| { formType: 'i765'; answers: I765DraftAnswers }
	| { formType: 'i90'; answers: I90DraftAnswers }
) & { applicationKind: ApplicationKind }

/**
 * Fill the bundled template from the application's own draft (ADR-0014) and
 * flatten so the values are baked page content (not a clean editable form).
 * The free preview stamps a DRAFT watermark AFTER flatten (so baked values sit
 * under the stamp); the filing package renders clean and FAILS CLOSED: if any
 * expected fill op does not land (renamed/dropped field on a template
 * edition), the clean render throws instead of sharing a partially filled
 * form that looks fileable.
 */
export async function renderFilledForm(
	templateBase64: string,
	args: RenderDraftArgs,
	options: { watermark: boolean },
): Promise<{ base64: string; filledCount: number }> {
	const doc = await PDFDocument.load(templateBase64, { ignoreEncryption: true })
	const ops =
		args.formType === 'i765'
			? buildI765Ops(args.answers, args.applicationKind)
			: buildI90Ops(args.answers, args.applicationKind)
	const { filledCount, failedFields } = applyOps(doc.getForm(), ops)
	if (!options.watermark && failedFields.length > 0) {
		const count = failedFields.length
		// User-facing message stays plain; the raw AcroForm paths ride along in
		// `cause` for debugging without leaking internals into the alert.
		throw new Error(
			`The filing package was not created: ${count} answer${count === 1 ? '' : 's'} could not ` +
				'be written to the official form. The bundled form edition may be out of date — ' +
				'nothing was exported.',
			{ cause: { failedFields } },
		)
	}
	doc.getForm().flatten()
	if (options.watermark) {
		const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)
		drawDraftWatermark(doc, boldFont)
	}
	return { base64: await doc.saveAsBase64(), filledCount }
}

/** Free watermarked draft preview (ADR-0007) — fail-open under the watermark. */
export function renderDraftPreview(
	templateBase64: string,
	args: RenderDraftArgs,
): Promise<{ base64: string; filledCount: number }> {
	return renderFilledForm(templateBase64, args, { watermark: true })
}

/** Clean render for the filing package — rejects unless every op landed. */
export function renderFilingPackage(
	templateBase64: string,
	args: RenderDraftArgs,
): Promise<{ base64: string; filledCount: number }> {
	return renderFilledForm(templateBase64, args, { watermark: false })
}
