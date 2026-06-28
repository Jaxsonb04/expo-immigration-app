import { describe, expect, test } from "bun:test";

import {
  getI765FullCompletionPercent,
  getI765MissingCoreFields,
  isValidDate,
  validateI765Answers,
} from "./i765-answers.ts";

const COMPLETE = {
  reason: "renewal",
  familyName: "Doe",
  givenName: "Jane",
  sex: "female",
  maritalStatus: "single",
  countriesOfCitizenship: ["Mexico"],
  birthCountry: "Mexico",
  dateOfBirth: "03/09/1995",
  eligibilityCode: "(c)(8)",
  mailingAddress: { street: "1 Main St", city: "Austin", state: "TX", zip: "78701" },
};

describe("I-765 answer completion + validation", () => {
  test("reports no missing core fields for a complete draft", () => {
    expect(getI765MissingCoreFields(COMPLETE)).toEqual([]);
    expect(getI765FullCompletionPercent(COMPLETE)).toBe(100);
  });

  test("an empty draft is 0% complete and missing every core field", () => {
    expect(getI765FullCompletionPercent({})).toBe(0);
    expect(getI765MissingCoreFields({}).length).toBeGreaterThan(0);
  });

  test("requires the physical address only when it differs from mailing", () => {
    expect(getI765MissingCoreFields({ ...COMPLETE, mailingSameAsPhysical: false })).toContain(
      "physicalAddress"
    );
    expect(
      getI765MissingCoreFields({
        ...COMPLETE,
        mailingSameAsPhysical: false,
        physicalAddress: { street: "2 Oak Ave", city: "Reno", state: "NV", zip: "89501" },
      })
    ).not.toContain("physicalAddress");
    expect(getI765MissingCoreFields({ ...COMPLETE, mailingSameAsPhysical: true })).not.toContain(
      "physicalAddress"
    );
  });

  test("accepts MM/DD/YYYY and ISO dates, rejects impossible ones", () => {
    expect(isValidDate("03/09/1995")).toBe(true);
    expect(isValidDate("1995-03-09")).toBe(true);
    expect(isValidDate("13/40/1995")).toBe(false);
    expect(isValidDate("not-a-date")).toBe(false);
  });

  test("surfaces format issues for malformed numeric fields", () => {
    const fields = validateI765Answers({ ...COMPLETE, ssn: "12", aNumber: "xyz" }).map(
      (issue) => issue.field
    );
    expect(fields).toContain("ssn");
    expect(fields).toContain("aNumber");
  });
});
