import { test, expect } from "@playwright/test";
import { createSeed, validateState, makeDraft, metrics } from "../src/model.js";
test("backup validation rejects duplicate identities and orphaned records", () => {
  const seed = createSeed();
  expect(validateState(seed)).toBe(true);
  expect(
    validateState({
      ...seed,
      prospects: [...seed.prospects, seed.prospects[0]],
    }),
  ).toBe(false);
  expect(validateState({ ...seed, prospects: [null] })).toBe(false);
  expect(
    validateState({
      ...seed,
      drafts: [{ ...makeDraft(seed.prospects[0]), prospectId: "missing" }],
    }),
  ).toBe(false);
  expect(
    validateState({
      ...seed,
      drafts: [{ ...makeDraft(seed.prospects[0]), updatedAt: "invalid" }],
    }),
  ).toBe(false);
});
test("empty pipeline has finite zero totals", () => {
  expect(metrics([])).toEqual({ open: 0, pipeline: 0, weighted: 0, won: 0 });
});
