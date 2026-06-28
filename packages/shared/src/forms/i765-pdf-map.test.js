import { describe, expect, test } from "bun:test";

import { buildI765PdfOps, formatI765Date, splitEligibilityCode } from "./i765-pdf-map.ts";

describe("I-765 PDF field mapping", () => {
  test("splits eligibility codes across the three Item 27 boxes", () => {
    expect(splitEligibilityCode("(c)(3)(B)")).toEqual(["(c)(", "3)(", "B)"]);
    expect(splitEligibilityCode("(c)(8)")).toEqual(["(c)(", "8)", ""]);
    expect(splitEligibilityCode("(c)(33)")).toEqual(["(c)(", "33)", ""]);
    expect(splitEligibilityCode(undefined)).toEqual(["", "", ""]);
  });

  test("formats ISO dates to MM/DD/YYYY and passes through other strings", () => {
    expect(formatI765Date("1995-03-09")).toBe("03/09/1995");
    expect(formatI765Date("03/09/1995")).toBe("03/09/1995");
    expect(formatI765Date(undefined)).toBe("");
  });

  test("maps core answers to the verified AcroForm field names", () => {
    const ops = buildI765PdfOps({
      reason: "renewal",
      familyName: "Doe",
      givenName: "Jane",
      mailingAddress: { street: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
      sex: "female",
      maritalStatus: "single",
      dateOfBirth: "1995-03-09",
      eligibilityCode: "(c)(3)(B)",
    });

    const text = (field) => ops.find((op) => op.kind === "text" && op.field.endsWith(field));
    const hasCheck = (suffix) => ops.some((op) => op.kind === "check" && op.field.endsWith(suffix));

    expect(text("Line1a_FamilyName[0]")?.value).toBe("Doe");
    expect(text("Line1b_GivenName[0]")?.value).toBe("Jane");
    expect(hasCheck("Part1_Checkbox[2]")).toBe(true); // renewal
    expect(hasCheck("Line9_Checkbox[0]")).toBe(true); // female
    expect(hasCheck("Line10_Checkbox[2]")).toBe(true); // single
    expect(text("Line19_DOB[0]")?.value).toBe("03/09/1995");
    expect(text("Line4b_StreetNumberName[0]")?.value).toBe("1 Main St");
    expect(
      ops.find((op) => op.kind === "dropdown" && op.field.endsWith("Pt2Line5_State[0]"))?.value
    ).toBe("TX");
    expect(text("#area[1].section_1[0]")?.value).toBe("(c)(");
    expect(text("#area[1].section_3[0]")?.value).toBe("B)");
  });

  test("emits STEM Item 28 fields only for (c)(3)(C)", () => {
    const c3b = buildI765PdfOps({ eligibilityCode: "(c)(3)(B)", stemDegree: "MS CS" });
    expect(c3b.some((op) => op.field.endsWith("Line27a_Degree[0]"))).toBe(false);

    const c3c = buildI765PdfOps({ eligibilityCode: "(c)(3)(C)", stemDegree: "MS CS" });
    expect(c3c.some((op) => op.kind === "text" && op.field.endsWith("Line27a_Degree[0]"))).toBe(
      true
    );
  });

  test("never emits signature fields (applicant signs the printed copy)", () => {
    const ops = buildI765PdfOps({ familyName: "Doe", givenName: "Jane", reason: "initial" });
    expect(ops.some((op) => op.field.includes("Signature"))).toBe(false);
  });

  test("checks the English-attestation box only when explicitly answered", () => {
    // Unanswered → no false attestation under penalty of perjury.
    expect(buildI765PdfOps({}).some((op) => op.field.endsWith("Pt3Line1Checkbox[0]"))).toBe(false);
    expect(
      buildI765PdfOps({ readsEnglish: true }).some((op) => op.field.endsWith("Pt3Line1Checkbox[0]"))
    ).toBe(true);
    expect(
      buildI765PdfOps({ usedInterpreter: true }).some((op) =>
        op.field.endsWith("Pt3Line1Checkbox[1]")
      )
    ).toBe(true);
  });

  test("fills the physical address only when it differs from mailing", () => {
    const same = buildI765PdfOps({ mailingSameAsPhysical: true });
    expect(same.some((op) => op.field.endsWith("Part2Line5_Checkbox[1]"))).toBe(true);
    expect(same.some((op) => op.field.includes("Pt2Line7"))).toBe(false);

    const diff = buildI765PdfOps({
      mailingSameAsPhysical: false,
      physicalAddress: { street: "2 Oak Ave", city: "Reno", state: "NV", zip: "89501" },
    });
    expect(diff.some((op) => op.field.endsWith("Part2Line5_Checkbox[0]"))).toBe(true);
    expect(
      diff.some((op) => op.kind === "text" && op.field.endsWith("Pt2Line7_StreetNumberName[0]"))
    ).toBe(true);
  });
});
