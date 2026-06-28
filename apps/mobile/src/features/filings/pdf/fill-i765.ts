import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { PDFDocument } from "pdf-lib";
import { buildI765PdfOps, I765_FORM_EDITION, type I765FullAnswers } from "@immigration/shared";

/**
 * On-device I-765 fill engine.
 *
 * Mirrors the headless pipeline verified against the live form: load the
 * bundled (decrypted) official PDF, apply the mapped field operations with
 * pdf-lib, then `flatten()` — which bakes values into page content and drops
 * the XFA layer so the values render in every viewer. Everything runs on the
 * device; no answer data leaves the phone.
 *
 * The bundled asset is the official USCIS PDF with its empty-password
 * permissions wrapper removed (pdf-lib cannot fill an encrypted PDF). The form
 * content is byte-for-byte the government form; the footer prints the edition.
 */
const I765_TEMPLATE = require("../../../../assets/forms/i-765-08-21-25.pdf");

export interface FilledI765Result {
  /** file:// URI of the flattened, filled PDF in the cache directory. */
  uri: string;
  fileName: string;
  edition: string;
  /** Number of mapped fields successfully written (diagnostics). */
  filledCount: number;
}

async function loadTemplateBase64(): Promise<string> {
  const asset = Asset.fromModule(I765_TEMPLATE);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  return FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
}

function buildFileName(answers: I765FullAnswers): string {
  const last = (answers.familyName ?? "").replace(/[^A-Za-z0-9]/g, "");
  const first = (answers.givenName ?? "").replace(/[^A-Za-z0-9]/g, "");
  const stem = [last, first].filter(Boolean).join("-") || "applicant";
  return `I-765-${stem}.pdf`;
}

/**
 * Generate a signature-ready, flattened I-765 PDF from the draft answers.
 * Returns a cache-directory file URI the preview screen can render, print,
 * and share. Throws only on catastrophic load/save failure — individual
 * unmatched fields are skipped so one bad value never aborts the export.
 */
export async function generateFilledI765(answers: I765FullAnswers): Promise<FilledI765Result> {
  const templateBase64 = await loadTemplateBase64();
  const doc = await PDFDocument.load(templateBase64);
  const form = doc.getForm();
  const ops = buildI765PdfOps(answers);

  let filledCount = 0;
  for (const op of ops) {
    try {
      if (op.kind === "text") {
        const field = form.getTextField(op.field);
        const max = field.getMaxLength();
        const overflows = typeof max === "number" && max > 0 && op.value.length > max;
        field.setText(overflows ? op.value.slice(0, max) : op.value);
      } else if (op.kind === "check") {
        form.getCheckBox(op.field).check();
      } else if (op.kind === "dropdown") {
        form.getDropdown(op.field).select(op.value);
      }
      filledCount += 1;
    } catch {
      // A single unmatched field (e.g. an edition that renamed it) must never
      // abort the whole export — skip it and keep going.
    }
  }

  form.flatten();
  const filledBase64 = await doc.saveAsBase64();

  const fileName = buildFileName(answers);
  const uri = `${FileSystem.cacheDirectory ?? ""}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, filledBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { uri, fileName, edition: I765_FORM_EDITION, filledCount };
}
