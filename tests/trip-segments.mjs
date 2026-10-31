// Run with Node: node tests/trip-segments.mjs. Uses the app's pure helpers, no browser or diary data.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Script } from "node:vm";

const html = await readFile(new URL("../trip.html", import.meta.url), "utf8");
const helpers = html.match(/\/\/ BEGIN_SEGMENT_HELPERS([\s\S]*?)\/\/ END_SEGMENT_HELPERS/)[1];
const sandbox = {};
new Script(helpers + "; this.helpers = { segmentRanges, segmentProblem };").runInNewContext(sandbox);
const segmentRanges = (...args) => JSON.parse(JSON.stringify(sandbox.helpers.segmentRanges(...args)));
const segmentProblem = (...args) => sandbox.helpers.segmentProblem(...args);
export const results = [];
const check = (name, fn) => { fn(); results.push(name); };
const sections = [{ id: "a", name: "城市探索", startDay: 1 }, { id: "b", name: "山海生活", startDay: 21 }, { id: "c", name: "地方觀察", startDay: 46 }];

check("70 days are partitioned exactly once, with no gaps", () => {
  const ranges = segmentRanges(sections, 70);
  assert.deepEqual(ranges.map(({ startDay, endDay }) => [startDay, endDay]), [[1, 20], [21, 45], [46, 70]]);
  assert.deepEqual(ranges.flatMap((s) => Array.from({ length: s.endDay - s.startDay + 1 }, (_, i) => s.startDay + i)), Array.from({ length: 70 }, (_, i) => i + 1));
  assert.equal(segmentProblem(sections, 70), "");
});
check("legacy trips without sections show every day", () => {
  assert.deepEqual(segmentRanges(undefined, 70).map(({ startDay, endDay }) => [startDay, endDay]), [[1, 70]]);
});
check("editing order does not change chronological order or mutate source", () => {
  const unsorted = [sections[2], sections[0], sections[1]];
  const before = JSON.stringify(unsorted);
  assert.deepEqual(segmentRanges(unsorted, 70).map((s) => s.id), ["a", "b", "c"]);
  assert.equal(JSON.stringify(unsorted), before);
});
check("resizing extends the final section and flags out-of-range starts", () => {
  assert.equal(segmentRanges(sections, 365).at(-1).endDay, 365);
  assert.notEqual(segmentProblem(sections, 40), "");
});
check("invalid section boundaries cannot be saved", () => {
  for (const startDay of [0, -1, 71, 1.5, NaN, "1"]) {
    assert.notEqual(segmentProblem([{ id: "x", name: "旅行", startDay }], 70), "");
  }
  assert.notEqual(segmentProblem([{ id: "x", name: "旅行", startDay: 2 }], 70), "");
  assert.notEqual(segmentProblem([sections[0], { id: "z", name: "重複", startDay: 1 }], 70), "");
});
check("blank names and duplicate identifiers are rejected", () => {
  assert.notEqual(segmentProblem([{ id: "x", name: "  ", startDay: 1 }], 70), "");
  assert.notEqual(segmentProblem([sections[0], { id: "a", name: "第二段", startDay: 21 }], 70), "");
});
check("malformed imported sections still render complete safe coverage", () => {
  const ranges = segmentRanges([null, { id: "x", name: "後段", startDay: 50 }, { id: "x", name: "尾段", startDay: 60 }, { startDay: 999 }], 70);
  assert.equal(ranges[0].startDay, 1);
  assert.equal(ranges.at(-1).endDay, 70);
  assert.equal(new Set(ranges.map((s) => s.id)).size, ranges.length);
});
check("all embedded application scripts parse", () => {
  for (const [i, match] of [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].entries()) new Script(match[1], { filename: "inline-" + i + ".js" });
});
console.log(results.length + " trip segment checks passed");
