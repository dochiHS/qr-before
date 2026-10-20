// QR BEFORE — 주차장 공공데이터 불러오기·검색
// 데이터: data/parking-data.json (공공데이터포털 전국주차장정보표준데이터 중 대전광역시)
// 거리순 정렬은 화면 쪽(경민) 담당이라 여기서는 검색만 제공한다.

export async function loadParkingData(url = 'data/parking-data.json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`주차장 데이터를 불러오지 못했습니다 (${res.status})`);
  const data = await res.json();
  return {
    facilities: Array.isArray(data.facilities) ? data.facilities : [],
    meta: {
      source: data.source,
      sourceUrl: data.sourceUrl,
      region: data.region,
      downloadedAt: data.downloadedAt,
      count: data.count,
    },
  };
}

// 이름·주소·관리기관에서 찾는다. 띄어쓰기는 무시한다.
export function searchFacilities(facilities, query, limit = 20) {
  const q = normalize(query);
  if (!q) return [];
  const hits = [];
  for (const f of facilities) {
    const name = normalize(f.name);
    const hay = name + normalize(f.roadAddress) + normalize(f.jibunAddress) + normalize(f.operator);
    if (!hay.includes(q)) continue;
    hits.push({ f, rank: name.startsWith(q) ? 0 : name.includes(q) ? 1 : 2 });
  }
  hits.sort((a, b) => a.rank - b.rank || a.f.name.localeCompare(b.f.name, 'ko'));
  return hits.slice(0, limit).map((h) => h.f);
}

export function findFacility(facilities, id) {
  return facilities.find((f) => f.id === id) || null;
}

function normalize(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, '');
}
