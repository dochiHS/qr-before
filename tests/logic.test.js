import test from "node:test";
import assert from "node:assert/strict";
import { recommendArea, findSimilar, matchPlans, compareLayout, toRects, estimate, needPerMonth } from "../logic.js";
import { readFile } from "node:fs/promises";

test("추천 면적: 방3·화장실2 = 84㎡ 국민평형", () => {
  const r = recommendArea(3, 2);
  assert.equal(r.area, 84); assert.equal(r.pyeong, 25.4); assert.match(r.label, /34평형/);
  assert.throws(() => recommendArea(4, 1));
});

test("비슷한 아파트: 서구 84㎡ 실거래가 나온다", async () => {
  const r = await findSimilar({ area: 84, gu: "서구", limit: 5 });
  assert.ok(r.summary.count > 20, `건수 ${r.summary.count}`);
  assert.ok(r.summary.medianSale > 10000);
  assert.equal(r.items.length, 5);
  r.items.forEach(it => { assert.equal(it.gu, "서구"); assert.ok(Math.abs(it.area - 84) <= 5); });
});

test("일치율: 같은 도면이면 100%, 뒤집은 도면은 낮다", async () => {
  const plans = JSON.parse(await readFile(new URL("../data/plans.json", import.meta.url))).items;
  const p = plans[0];
  assert.equal(compareLayout(p.rects, p).score, 100);
  const flipped = p.rects.map(r => ({ ...r, y: 1 - r.y - r.h }));
  assert.ok(compareLayout(flipped, p).score < 60);
});

test("일치율: 시안 예시 배치(남쪽 방2·거실·방1)는 84형 도면과 비교된다", async () => {
  const pieces = [
    { id: "room2", x: 0, y: 6, w: 6, h: 6 }, { id: "living", x: 6, y: 5, w: 9, h: 7 }, { id: "room1", x: 15, y: 6, w: 7, h: 6 },
    { id: "room3", x: 0, y: 0, w: 5, h: 5 }, { id: "kitchen", x: 6, y: 0, w: 7, h: 4 }, { id: "bath1", x: 14, y: 0, w: 3, h: 3 },
    { id: "bath2", x: 18, y: 0, w: 3, h: 3 }, { id: "entry", x: 22, y: 0, w: 2, h: 3 }
  ];
  const res = await matchPlans(toRects(pieces, 24, 12), { area: 84, rooms: 3 });
  assert.equal(res.length, 3);
  assert.ok(res[0].score >= res[1].score);
  assert.ok(res[0].score > 40, `1위 ${res[0].score}%`);
});

test("견적: 한 달에 얼마씩 모으면 / 몇 년 안에 사려면", () => {
  const e = estimate({ price: 40000, perMonth: 100 });
  assert.equal(e.months, 400); assert.equal(e.text, "한 달에 100만원씩 모으면 33년 4개월");
  assert.equal(estimate({ price: 30800, perMonth: 150 }).text, "한 달에 150만원씩 모으면 17년 2개월");
  const n = needPerMonth({ price: 40000, years: 10 });
  assert.equal(n.perMonth, 334); assert.equal(n.text, "10년 안에 사려면 한 달에 334만원씩");
  assert.equal(needPerMonth({ price: 115000, years: 5 }).text, "5년 안에 사려면 한 달에 1,917만원씩");
  assert.throws(() => estimate({ price: 40000 }));
});
