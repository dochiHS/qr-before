// 집그림 추천·비교·견적 로직. 화면(app.js)은 아래 export 함수만 쓴다.
// 데이터는 data/*.json 을 이 파일 위치 기준으로 읽는다 (브라우저·Node 18+ 둘 다 동작).

const PY = 3.3058; // 1평 = 3.3058㎡

const RECO = {
  "1-1": { area: 33, label: "13평형 안팎", note: "1인 가구 소형 아파트 크기예요." },
  "1-2": { area: 39, label: "16평형 안팎", note: "방 하나에 화장실 둘은 드문 구성이에요." },
  "2-1": { area: 49, label: "20평형대 초반", note: "신혼·2인 가구가 많이 고르는 크기예요." },
  "2-2": { area: 59, label: "24평형", note: "방 2개에 화장실 2개면 59㎡가 무난해요." },
  "3-1": { area: 59, label: "24평형", note: "방 3개가 들어가는 가장 작은 아파트 크기예요." },
  "3-2": { area: 84, label: "34평형 (국민평형)", note: "가장 많이 지어지는 크기로, 주택법의 국민주택규모(85㎡ 이하)에 맞춘 면적이에요." },
  "4-2": { area: 102, label: "40평형대", note: "방 4개면 전용 100㎡ 안팎으로, 흔히 40평형대라고 불러요." }
};

const cache = {};
async function load(name) {
  if (cache[name]) return cache[name];
  const url = new URL(`./data/${name}`, import.meta.url);
  let data;
  if (url.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    data = JSON.parse(await readFile(url, "utf8"));
  } else {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${name} 응답 오류 ${res.status}`);
    data = await res.json();
  }
  cache[name] = data;
  return data;
}

const median = a => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y);
  return b[Math.floor(b.length / 2)];
};

// ───── 1. 방·화장실 → 추천 면적 ─────
export function recommendArea(rooms, baths) {
  const r = RECO[`${rooms}-${baths}`];
  if (!r) throw new Error(`방 ${rooms}개·화장실 ${baths}개 조합은 추천 데이터가 없어요.`);
  return { area: r.area, pyeong: Math.round((r.area / PY) * 10) / 10, label: r.label, note: r.note };
}

// ───── 2. 비슷한 크기의 대전 아파트 (실거래) ─────
// area: 전용㎡, gu: '동구'|'중구'|'서구'|'유성구'|'대덕구'|undefined(전체), range: ±㎡
export async function findSimilar({ area, gu, limit = 10, range = 5 } = {}) {
  const { items, period, source } = await load("apartments-daejeon.json");
  const hits = items.filter(it => Math.abs(it.area - area) <= range && (!gu || it.gu === gu));
  hits.sort((a, b) => b.saleCount - a.saleCount || Math.abs(a.area - area) - Math.abs(b.area - area));
  return {
    summary: {
      count: hits.length,
      medianSale: median(hits.map(h => h.sale)),
      medianJeonse: median(hits.filter(h => h.jeonse).map(h => h.jeonse)),
      period, source
    },
    items: hits.slice(0, limit).map(h => ({
      apt: h.apt, gu: h.gu, dong: h.dong, area: h.area, built: h.built,
      sale: h.sale, saleCount: h.saleCount, lastSale: h.lastSale, saleDate: h.lastDate, jeonse: h.jeonse
    }))
  };
}

// ───── 3. 내 그림 ↔ 실제 평면도 배치 일치율 ─────
const CAT = { living: "living", kitchen: "kitchen", room1: "room", room2: "room", room3: "room", room4: "room", bath1: "bath", bath2: "bath", entry: "entry" };
export const CAT_NAME = { living: "거실", kitchen: "주방", room: "방", bath: "욕실", entry: "현관" };
const GX = 24, GY = 12;

// 화면의 조각 배열(격자 칸 단위)을 0~1 좌표 사각형으로 바꾼다. 집 밖(대기실) 조각은 뺀다.
export function toRects(pieces, cols, rows) {
  return pieces.filter(p => p.x !== null && p.x !== undefined)
    .map(p => ({ t: CAT[p.id] || p.id, x: p.x / cols, y: p.y / rows, w: p.w / cols, h: p.h / rows }));
}

function raster(rects) {
  const g = new Array(GX * GY).fill(null);
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) {
    const cx = (i + .5) / GX, cy = (j + .5) / GY;
    const r = rects.find(r => cx >= r.x && cx < r.x + r.w && cy >= r.y && cy < r.y + r.h);
    if (r) g[j * GX + i] = r.t;
  }
  return g;
}
function centroids(rects) {
  const c = {};
  for (const r of rects) {
    const a = r.w * r.h, k = c[r.t] || (c[r.t] = { x: 0, y: 0, a: 0 });
    k.x += (r.x + r.w / 2) * a; k.y += (r.y + r.h / 2) * a; k.a += a;
  }
  for (const k of Object.values(c)) { k.x /= k.a; k.y /= k.a; }
  return c;
}

// 일치율 = 겹침 55% (같은 칸에 같은 종류) + 위치 45% (종류별 무게중심 거리) − 방·욕실 개수 차이
export function compareLayout(mine, plan) {
  const a = raster(mine), b = raster(plan.rects);
  let same = 0, union = 0;
  a.forEach((v, i) => { if (v || b[i]) union++; if (v && v === b[i]) same++; });
  const overlap = union ? same / union : 0;
  const ca = centroids(mine), cb = centroids(plan.rects);
  const parts = Object.keys(CAT_NAME).map(t => {
    const d = ca[t] && cb[t] ? Math.hypot(ca[t].x - cb[t].x, (ca[t].y - cb[t].y) * .5) : 1;
    return { t, name: CAT_NAME[t], d: Math.round(d * 100) / 100, same: d < .18 };
  });
  const place = parts.reduce((s, p) => s + Math.max(0, 1 - p.d / .45), 0) / parts.length;
  const myRooms = mine.filter(r => r.t === "room").length, myBaths = mine.filter(r => r.t === "bath").length;
  const penalty = Math.abs(myRooms - plan.rooms) * .08 + Math.abs(myBaths - plan.baths) * .05;
  const score = Math.max(0, Math.min(1, .55 * overlap + .45 * place - penalty));
  return { score: Math.round(score * 100), overlap: Math.round(overlap * 100), place: Math.round(place * 100), parts };
}

// mine: toRects() 결과. 비슷한 면적(±16㎡) 또는 같은 방 개수인 도면 중 일치율 높은 순
// daejeonOnly: 대전 단지 도면만. 대전 도면은 같은 단지의 실거래가(trade)를 붙여 돌려준다.
// 방·욕실 개수가 같은 도면을 먼저, 그다음 일치율 순. daejeonOnly면 대전 단지 도면만 (같은 구성이 없으면 비슷한 면적의 대전 도면).
export async function matchPlans(mine, { area, rooms, baths, limit = 3, daejeonOnly = false } = {}) {
  const { items } = await load("plans.json");
  const myRooms = rooms ?? mine.filter(r => r.t === "room").length;
  const myBaths = baths ?? mine.filter(r => r.t === "bath").length;
  const near = p => !area || Math.abs(p.area - area) <= 16 || p.rooms === myRooms;
  const same = p => p.rooms === myRooms && p.baths === myBaths;
  const rank = (list, filter) => list.filter(filter).map(p => ({ plan: p, sameConfig: same(p), ...compareLayout(mine, p) }))
    .sort((x, y) => (y.sameConfig - x.sameConfig) || (y.score - x.score));
  const pool = items.filter(p => !daejeonOnly || p.daejeon);
  let ranked = rank(pool, near);
  if (ranked.length < limit) ranked = rank(pool, () => true); // 비슷한 면적이 모자라면 면적 조건 없이
  ranked = ranked.slice(0, limit);
  ranked.total = items.length;
  if (ranked.some(r => r.plan.trade)) {
    const { items: apts } = await load("apartments-daejeon.json");
    for (const r of ranked) {
      const t = r.plan.trade;
      if (!t) continue;
      const same = apts.filter(a => a.gu === t.gu && a.apt === t.apt)
        .sort((a, b) => Math.abs(a.area - r.plan.area) - Math.abs(b.area - r.plan.area));
      const hit = same[0];
      if (!hit) continue;
      if (Math.abs(hit.area - r.plan.area) <= 3) {
        r.trade = { apt: hit.apt, gu: hit.gu, dong: hit.dong, area: hit.area, built: hit.built,
          sale: hit.sale, lastSale: hit.lastSale, saleDate: hit.lastDate, jeonse: hit.jeonse, saleCount: hit.saleCount };
      } else {
        // 같은 평형 거래가 없으면 같은 단지의 가장 가까운 평형 실거래가를 전용면적 비율로 환산한다.
        const k = r.plan.area / hit.area, sc = v => (v ? Math.round((v * k) / 100) * 100 : v);
        r.trade = { apt: hit.apt, gu: hit.gu, dong: hit.dong, area: r.plan.area, built: hit.built,
          sale: sc(hit.sale), lastSale: sc(hit.lastSale || hit.sale), saleDate: hit.lastDate, jeonse: sc(hit.jeonse),
          saleCount: hit.saleCount, estimated: true, baseArea: hit.area };
      }
    }
  }
  return ranked;
}

// ───── 4. 견적: 한 달에 얼마씩 모으면 살 수 있나 ─────
const span = months => { const y = Math.floor(months / 12), mo = months % 12; return `${y ? `${y}년` : ""}${y && mo ? " " : ""}${mo ? `${mo}개월` : ""}` || "0개월"; };
const won = v => v >= 10000 ? `${Math.floor(v / 10000)}억${v % 10000 ? ` ${(v % 10000).toLocaleString()}만` : ""}원` : `${v.toLocaleString()}만원`;

// price: 집값(만원), perMonth: 한 달에 모을 수 있는 돈(만원) → 걸리는 기간
export function estimate({ price, perMonth } = {}) {
  const p = Number(price), m = Number(perMonth);
  if (!(p > 0) || !(m > 0)) throw new Error("집값(price)과 한 달에 모을 돈(perMonth)이 필요해요.");
  const months = Math.ceil(p / m);
  return { price: p, perMonth: m, months, years: Math.round((months / 12) * 10) / 10,
    text: `한 달에 ${won(m)}씩 모으면 ${span(months)}` };
}

// 거꾸로: years 년 안에 사려면 한 달에 얼마씩 모아야 하나
export function needPerMonth({ price, years } = {}) {
  const p = Number(price), y = Number(years);
  if (!(p > 0) || !(y > 0)) throw new Error("집값(price)과 목표 기간(years)이 필요해요.");
  const perMonth = Math.ceil(p / (y * 12));
  return { price: p, years: y, perMonth, text: `${y}년 안에 사려면 한 달에 ${won(perMonth)}씩` };
}
