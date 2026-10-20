// node --test tests/  로 실행
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { analyzeQR } from '../security-engine.js';

const trusted = JSON.parse(readFileSync(new URL('../data/trusted-domains.json', import.meta.url)));
const parking = JSON.parse(readFileSync(new URL('../data/parking-data.json', import.meta.url)));
const facilities = parking.facilities;
const GALLERIA = '185-1-000057'; // 둔산로31번길 / 갤러리아백화점 옆 (대전 서구청)

const run = (url, facilityId = GALLERIA) => analyzeQR({ url, facilityId }, facilities, trusted);

import { CASES, cyrillicSeogu } from './cases.js';

for (const [name, url, expected] of CASES) {
  test(`${expected.padEnd(17)} ${name}`, () => {
    const r = run(url);
    assert.equal(r.status, expected, `${url}\n${JSON.stringify(r.reasons, null, 1)}`);
    assert.ok(Array.isArray(r.reasons) && r.reasons.length > 0, '이유가 비어 있으면 안 됨');
  });
}

test('결과 구조가 합의한 규격과 같다', () => {
  for (const [, url] of CASES) {
    const r = run(url);
    assert.deepEqual(Object.keys(r).sort(), ['checkedUrl', 'facility', 'matchedDomain', 'reasons', 'status']);
    assert.deepEqual(Object.keys(r.facility).sort(), ['id', 'name', 'operator', 'phone', 'sourceDate']);
  }
});

test('일치하면 matchedDomain 에 참고 도메인이 들어간다', () => {
  assert.equal(run('https://parking.seogu.go.kr/pay').matchedDomain, 'seogu.go.kr');
});

test('유사 도메인이면 matchedDomain 에 흉내 낸 공식 도메인이 들어간다', () => {
  assert.equal(run('https://se0gu.com/pay').matchedDomain, 'seogu.go.kr');
});

test('@ 속임수는 실제 접속지를 이유에 밝히고 흉내 낸 도메인을 알려 준다', () => {
  const r = run('https://seogu.go.kr@evil-pay.com/pay');
  assert.ok(r.reasons.some((s) => s.includes('evil-pay.com')));
  assert.equal(r.matchedDomain, 'seogu.go.kr');
});

test('키릴 문자 흉내는 흉내 낸 공식 도메인을 알려 준다', () => {
  const r = run(cyrillicSeogu);
  assert.equal(r.matchedDomain, 'seogu.go.kr');
  assert.ok(!r.reasons.some((s) => s.includes('정부기관 전용')));
});

test('다른 관리기관 도메인과 일치하면 그 사실을 알려 준다', () => {
  const r = run('https://www.yuseong.go.kr/pay');
  assert.equal(r.status, 'matched_reference');
  assert.ok(r.reasons.some((s) => s.includes('다른 기관')));
});

test('확인 불가면 관리기관 연락처를 안내한다', () => {
  const r = run('https://example-pay.co.kr/p/123');
  assert.ok(r.reasons.some((s) => s.includes('042-288-4120')));
});

test('없는 시설 ID 는 facility 가 null', () => {
  assert.equal(run('https://seogu.go.kr', 'NO-SUCH-ID').facility, null);
});

test('입력이 이상해도 예외를 던지지 않는다', () => {
  for (const bad of [undefined, null, {}, { url: 123 }, { url: '   ' }]) {
    const r = analyzeQR(bad, facilities, trusted);
    assert.equal(r.status, 'unknown');
  }
  assert.equal(analyzeQR({ url: 'https://seogu.go.kr' }, null, null).status, 'unknown');
});

test('분석은 네트워크에 접속하지 않는다', () => {
  const original = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error('fetch 호출됨');
  };
  try {
    for (const [, url] of CASES) run(url);
  } finally {
    globalThis.fetch = original;
  }
});
