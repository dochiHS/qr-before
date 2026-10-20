# 보안 엔진 · 데이터 연결 안내 (경민 → UI 연결용)

합의한 `analyzeQR()` 입력·출력 구조는 그대로입니다. 바뀐 점은 없고, 아래 "추가로 알아 둘 것"만 확인해 주세요.

## 파일

| 파일 | 내용 |
|---|---|
| `security-engine.js` | `analyzeQR(input, facilities, trustedDomains)` |
| `facility-data.js` | `loadParkingData()`, `searchFacilities()`, `findFacility()` |
| `data/parking-data.json` | 대전광역시 주차장 562곳 (공공데이터포털 전국주차장정보표준데이터) |
| `data/trusted-domains.json` | 대전 관리기관 공식 도메인 6건 (직접 접속해 확인) |
| `tests/` | 검사 42건, `npm test` 로 실행 |
| `docs/test-results.md` | 검사 결과표 (기획안·README용) |

## 붙이는 법

```html
<script type="module" src="app.js"></script>
```

```js
// app.js
import { analyzeQR } from './security-engine.js';
import { loadParkingData, searchFacilities } from './facility-data.js';

const { facilities, meta } = await loadParkingData();          // meta.sourceUrl, meta.downloadedAt 표시용
const trusted = await fetch('data/trusted-domains.json').then((r) => r.json());

const hits = searchFacilities(facilities, '갤러리아');           // 이름·주소·관리기관 검색, 띄어쓰기 무시
const result = analyzeQR({ url: qrText, facilityId: hits[0]?.id }, facilities, trusted);
```

`fetch`로 JSON을 읽기 때문에 `file://`로 열면 안 되고 GitHub Pages나 로컬 서버(`npx serve`)로 열어야 합니다.

## 결과 화면 문구 제안

| status | 표시 문구 | 색 |
|---|---|---|
| `suspicious` | 의심 징후 발견 | 빨강 |
| `matched_reference` | 참고 목록과 일치 | 초록 (단, "안전" 표현 금지) |
| `unknown` | 확인 불가 | 회색·노랑 |

`reasons`는 화면에 그대로 보여 줘도 되는 한국어 문장입니다. 첫 번째 줄이 가장 중요한 이유예요.

## 추가로 알아 둘 것

1. `facilityId`가 없거나 목록에 없으면 `facility`는 `null`입니다. 시설 선택 없이 URL만 검사해도 동작합니다.
2. `matchedDomain`은 일치했을 때는 그 참고 도메인, 의심일 때는 **흉내 낸 공식 도메인**이 들어갑니다 (예: `se0gu.com` → `seogu.go.kr`). 해당 없으면 `null`.
3. `checkedUrl`은 파서가 정리한 주소입니다. 한글·키릴 문자 도메인은 `xn--` 형태로 바뀌어 나옵니다. 화면에 원래 QR 글자를 보여 주고 싶으면 입력값을 따로 보관해 두세요.
4. 엔진은 네트워크에 접속하지 않습니다. 결과 화면에서도 **사용자가 버튼을 눌러 확인하기 전에는 자동으로 열지 않기**만 지켜 주세요.
5. 거리순 정렬용 좌표는 `lat`, `lng` (숫자 또는 `null`). 이번 대전 데이터 562곳은 모두 좌표가 있습니다.

## 시연용 QR 3종 (A4로 출력)

| 결과 | QR에 넣을 주소 |
|---|---|
| 참고 목록과 일치 | `https://www.seogu.go.kr/kor.do` |
| 의심 징후 발견 | `https://se0gu.com/pay` (숫자 0) |
| 확인 불가 | `https://example-pay.co.kr/p/123` |

의심용 주소는 실제로 열어 보지 마세요. 시연은 앱 결과 화면까지만 보여 줍니다.
