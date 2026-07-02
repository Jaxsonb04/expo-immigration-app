# Bundled USCIS form templates

`i-765.pdf` is the official USCIS **Form I-765** (Application for Employment
Authorization), used to render the free, watermarked "DRAFT — NOT FOR FILING"
preview on the real current-edition form (ADR-0006/0007, issue #9). USCIS forms
are U.S. government works in the public domain.

## Why it's checked in (and pre-processed)

The form is downloaded from
<https://www.uscis.gov/sites/default/files/document/forms/i-765.pdf>, but the
original is an **encrypted LiveCycle/XFA** PDF that `pdf-lib` (our on-device
renderer) cannot load. `scripts/normalize-uscis-form.py` decrypts it, drops the
dynamic XFA layer (so the static AcroForm page content renders in the OS viewer),
and disables object streams so `pdf-lib` can parse every object. The page
geometry is unchanged, so the preview still renders onto the real form.

`i-765.meta.json` records the edition signals read from the source at build time
(OMB number + expiration, source revision date). The app stamps these on the
preview so the edition is verified from the bundled asset rather than hardcoded.

## Refreshing when USCIS publishes a new edition

```sh
curl -sSL -A "Mozilla/5.0" -o /tmp/i-765.source.pdf \
  https://www.uscis.gov/sites/default/files/document/forms/i-765.pdf
python3 scripts/normalize-uscis-form.py /tmp/i-765.source.pdf \
  assets/forms/i-765.pdf assets/forms/i-765.meta.json
```

Then re-check the field map in `src/components/filing/i765/i765.pdf.utils.ts` against
the new edition (field names occasionally change) and run the render test.
