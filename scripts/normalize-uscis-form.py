#!/usr/bin/env python3
"""Normalize an encrypted USCIS XFA form into a pdf-lib-readable static PDF.

USCIS fillable forms (e.g. i-765.pdf) ship as *encrypted* LiveCycle/XFA PDFs.
`pdf-lib` (our on-device renderer, ADR-0006) cannot even load them: it can skip
the encryption *error* but not decrypt the object streams, so every object comes
back as an invalid ref. This build-time step, run once per form edition:

  1. Opens + decrypts the form (USCIS uses an empty user password).
  2. Drops the dynamic XFA layer so viewers — and our OS-viewer preview
     (Quick Look) — render the *static* AcroForm page content, on top of which
     we draw the applicant's answers + the "DRAFT — NOT FOR FILING" watermark.
  3. Disables cross-reference/object streams and re-linearizes so pdf-lib's
     parser can load the result.

The page geometry is unchanged, so the preview still renders onto the real
current-edition USCIS form. Re-run when a new edition is published (editions
rotate; ADR-0006 / ADR-0007).

The current I-765 form is downloaded from:
  https://www.uscis.gov/sites/default/files/document/forms/i-765.pdf

Usage: python3 scripts/normalize-uscis-form.py <in.pdf> <out.pdf> <out.meta.json>

The meta JSON records the edition signals we can verify from the source (OMB
number + expiration, source revision date, title). The app displays these on the
watermarked preview so the edition is stamped from the bundled asset at render
time rather than hardcoded (ADR-0006). Re-run when a new edition is published and
the values refresh automatically.
"""

import json
import os
import re
import sys
from typing import Optional

import pikepdf


def _pdf_date_to_iso(raw) -> Optional[str]:
    # PDF date: D:YYYYMMDDHHmmSS±... → YYYY-MM-DD
    if not raw:
        return None
    m = re.match(r"D:(\d{4})(\d{2})(\d{2})", str(raw))
    return f"{m.group(1)}-{m.group(2)}-{m.group(3)}" if m else None


def main(src: str, dst: str, meta_path: str) -> None:
    # Infer the form from the output filename (e.g. "i-90.pdf" → slug "i-90",
    # formType "i90"), so the meta is correct for whichever form is normalized.
    form_slug = os.path.basename(dst).rsplit(".", 1)[0]
    form_type = form_slug.replace("-", "")

    with pikepdf.open(src) as pdf:  # opens and decrypts (empty user password)
        info = dict(pdf.docinfo) if pdf.docinfo else {}
        acro = pdf.Root.get("/AcroForm")
        if acro is not None and "/XFA" in acro:
            del acro.XFA  # drop dynamic XFA → static AcroForm layer renders
        pdf.save(
            dst,
            # Plain xref + inline objects → pdf-lib can parse every object.
            object_stream_mode=pikepdf.ObjectStreamMode.disable,
            normalize_content=True,
        )

    # The OMB number + expiration are static footer text; readable now that the
    # content streams are uncompressed.
    body = open(dst, "rb").read()
    omb = re.search(rb"OMB No\.\s*([0-9-]+)", body)
    expires = re.search(rb"Expires\s*([0-9]{2}/[0-9]{2}/[0-9]{4})", body)

    meta = {
        "formType": form_type,
        "title": str(info.get("/Title", form_slug.upper())),
        "omb": omb.group(1).decode() if omb else None,
        "ombExpires": expires.group(1).decode() if expires else None,
        "sourceRevised": _pdf_date_to_iso(info.get("/CreationDate")),
        "source": f"https://www.uscis.gov/sites/default/files/document/forms/{form_slug}.pdf",
        "note": (
            "Decrypted + XFA-stripped from the USCIS original for on-device "
            "pdf-lib rendering; page geometry unchanged."
        ),
    }
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent="\t")
        f.write("\n")
    print(f"normalized {src} -> {dst}")
    print(f"meta {meta_path}: {meta['omb']} exp {meta['ombExpires']} rev {meta['sourceRevised']}")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        raise SystemExit("usage: normalize-uscis-form.py <in.pdf> <out.pdf> <out.meta.json>")
    main(sys.argv[1], sys.argv[2], sys.argv[3])
