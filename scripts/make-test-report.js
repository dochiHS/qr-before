// 검사 사례를 엔진에 돌려 docs/test-results.md 를 만든다.
// 사용법: node scripts/make-test-report.js
import { readFileSync, writeFileSync } from 'node:fs';
import { analyzeQR } from '../security-engine.js';
import { CASES } from '../tests/cases.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const trusted = read('../data/trusted-domains.json');
const parking = read('../data/parking-data.json');
const FACILITY = '185-1-000057';

const LABEL = {
  matched_reference: '참고 목록과 일치',
  suspicious: '의심 징후 발견',
  unknown: '확인 불가',
};

const esc = (s) => String(s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rows = [];
let pass = 0;
for (const [name, url, expected] of CASES) {
  const r = analyzeQR({ url, facilityId: FACILITY }, parking.facilities, trusted);
  const ok = r.status === expected;
  if (ok) pass++;
  rows.push(`| ${esc(name)} | \`${esc(url || '(빈 값)')}\` | ${LABEL[expected]} | ${LABEL[r.status]} | ${ok ? '통과' : '실패'} | ${esc(r.reasons[0])} |`);
}

const count = (s) => CASES.filter((c) => c[2] === s).length;
const md = `# 보안 분석 엔진 검사 결과

- 검사일: ${new Date().toISOString().slice(0, 10)}
- 대상: \`security-engine.js\` 의 \`analyzeQR()\`
- 기준 시설: 둔산로31번길 / 갤러리아백화점 옆 (대전 서구청, 주차장관리번호 ${FACILITY})
- 결과: **URL 사례 ${CASES.length}건 중 ${pass}건 기대대로 판정** (구조·안전 검사 10건 포함 전체 ${CASES.length + 10}건, 아래 참고)
  (참고 목록과 일치 ${count('matched_reference')}건, 의심 징후 발견 ${count('suspicious')}건, 확인 불가 ${count('unknown')}건)

확인 불가 사례에는 정상 사이트(결제대행사, 포털, 지명이 들어간 관광 사이트, 다른 지역 구청)를 일부러 넣었다.
이 사이트들이 "의심"으로 잘못 찍히지 않는지가 오탐 검사다.

| 사례 | QR 내용 | 기대 | 실제 | 결과 | 첫 번째 이유 |
|---|---|---|---|---|---|
${rows.join('\n')}

## 구조·안전 검사 10건

위 URL 사례 ${CASES.length}건과 별도로 \`npm test\` 에서 아래 10건을 함께 검사한다. 전체 테스트는 ${CASES.length + 10}건이다.

1. 모든 결과가 합의한 출력 구조(status, reasons, facility, matchedDomain, checkedUrl)를 지킨다
2. 참고 목록과 일치하면 matchedDomain 에 그 도메인이 들어간다
3. 철자를 흉내 낸 주소면 matchedDomain 에 흉내 낸 공식 도메인이 들어간다
4. @ 속임수는 실제 접속지를 이유에 밝히고 흉내 낸 도메인을 알려 준다
5. 키릴 문자로 흉내 낸 주소도 흉내 낸 공식 도메인을 알려 준다
6. 다른 관리기관 도메인과 일치하면 그 사실을 알려 준다
7. 확인 불가일 때 관리기관 연락처를 안내한다
8. 없는 시설 ID 를 넣으면 facility 가 null 이다
9. undefined, 숫자, 공백 같은 잘못된 입력에도 오류 없이 "확인 불가"를 돌려준다
10. 분석하는 동안 네트워크에 접속하지 않는다

재현 방법: \`npm test\` (Node.js 18 이상), 표 다시 만들기: \`node scripts/make-test-report.js\`
`;

writeFileSync(new URL('../docs/test-results.md', import.meta.url), md);
console.log(`${pass}/${CASES.length} → docs/test-results.md`);
