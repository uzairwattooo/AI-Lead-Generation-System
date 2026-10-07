import assert from "node:assert/strict";
import test from "node:test";

import { initialSmoothProgress, nextSmoothProgress } from "../src/lib/smooth-progress";

test("active progress advances gradually between backend updates", () => {
  assert.equal(nextSmoothProgress({ displayed: 30, reported: 30, elapsedSeconds: 240, terminal: false }), 31);
});

test("active progress never reaches 100 before the backend is terminal", () => {
  assert.equal(nextSmoothProgress({ displayed: 94, reported: 100, elapsedSeconds: 9999, terminal: false }), 94);
});

test("terminal progress immediately displays 100", () => {
  assert.equal(nextSmoothProgress({ displayed: 52, reported: 52, elapsedSeconds: 90, terminal: true }), 100);
  assert.equal(initialSmoothProgress(20, 10, true), 100);
});

test("initial progress honors the real backend floor", () => {
  assert.equal(initialSmoothProgress(45, 2, false), 45);
});
