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
 * Fill the bundled template from the application's own draft (ADR-0014),
 * flatten so the values are baked page content (not a clean editable form),
 * then watermark — AFTER flatten, so the baked values sit under the stamp.
 */
export async function renderDraftPreview(
	templateBase64: string,
	args: RenderDraftArgs,
): Promise<{ base64: string; filledCount: number }> {
	const doc = await PDFDocument.load(templateBase64, { ignoreEncryption: true })
	const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)
	const ops =
		args.formType === 'i765'
			? buildI765Ops(args.answers, args.applicationKind)
			: buildI90Ops(args.answers)
	const filledCount = applyOps(doc.getForm(), ops)
	doc.getForm().flatten()
	drawDraftWatermark(doc, boldFont)
	return { base64: await doc.saveAsBase64(), filledCount }
}
