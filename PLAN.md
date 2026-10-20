# 나만의 집 만들기 — 2인 작업 계획

- 마감: 2026-10-21(수) 17:00
- 채점: 사람 투표 (동점일 때만 LLM 판정)
- 팀: 강혜성 + Claude / 김경민 + Codex
- 저장소: https://github.com/dochiHS/zip-grim (시안은 `prototype/index.html`)
- 이전 QR BEFORE 작업은 `archive-qr` 브랜치에 보관

## 한 줄 소개

방·화장실 개수를 고르면 평수와 공간별 크기가 정해지고, 방·거실·주방·욕실·현관 조각을 끌어다 집 테두리 안을 채운다. 다 지은 집과 비슷한 크기의 아파트를 대전 구별 실거래가로 찾아 주고, "이 집 사려면 월급 몇 년"을 견적서로 보여 준다.

## 사용 흐름 (화면 4개)

1. 조건 고르기: 방 수(1~3), 화장실 수(1~2) → 평수가 정해지고(예: 방3·화장실2 = 전용 84㎡, 34평형) 그 평수에 맞춘 방1·방2·방3·거실·주방·욕실·현관 크기가 미터 단위로 나옴
2. 끌어다 채우기: 대기실의 조각을 0.5m 격자 집 테두리 안으로 끌어다 놓음. 겹치면 원위치, 돌리기 가능. 놓은 조각은 위·아래·좌·우 테두리를 끌어 크기 조절(처음 크기는 평수 기준, "원래 크기로" 버튼으로 복귀). 조각 합계는 집의 약 80%라 남는 칸이 복도·벽이 됨. 다 채우면 현관에서 거실·주방·복도를 거쳐 모든 방에 갈 수 있는지, 거실이 남쪽 벽에 붙었는지 검사
3. 비슷한 아파트: 지역(대전 5개 구) 선택 → 전용면적 ±5㎡ 아파트의 단지명, 최근 매매가·전세가, 건축년도
4. 견적서 카드: 내 집 그림 + 대전 시세 + 직업 고르면 "월급 안 쓰고 ○년" → 이미지로 저장·공유

## 쓰는 공공데이터

| 데이터 | 쓰는 곳 | 링크 |
|---|---|---|
| 국토교통부 아파트 매매 실거래가 | Step 3 매매가, 견적서 | https://www.data.go.kr/data/15126469/openapi.do |
| 국토교통부 아파트 전월세 실거래가 | Step 3 전세가 | https://www.data.go.kr/data/15126474/openapi.do |
| 한국토지주택공사 주택 평면도 현황 | 기본 배치 5개의 원본 | https://www.data.go.kr/data/15037046/fileData.do |
| 한국고용정보원 직업별 임금정보 | 견적서 "월급 몇 년" | https://www.data.go.kr/data/15122500/fileData.do |

실거래가는 앱이 실행될 때 API를 부르지 않는다. 미리 받아 JSON으로 저장해 두고 화면은 그 파일만 읽는다. 키 노출, 호출 한도, 발표 중 API 장애를 한 번에 피하기 위해서다.

## 역할

### 혜성 + Claude: 데이터·로직·문서

| 할 일 | 결과물 |
|---|---|
| 실거래가 API 2종 활용신청, 대전 5개 구 최근 12개월 매매·전세 수집 | `scripts/fetch-trades.py`, `data/trades-daejeon.json` |
| 단지별로 묶어 전용면적별 최근 매매가·전세가 정리 | `data/apartments-daejeon.json` |
| LH 평면도로 평수별 공간 크기 비율 검증, 예시 배치 근거 | `data/area-guide.json`, `docs/templates.md`(출처) |
| 직업별 임금 정리 (직업 30개 내외) | `data/wages.json` |
| 추천·견적 로직 | `logic.js` (아래 규격) |
| 로직 검사 | `tests/` |
| 기획안 4단계 다시 쓰기, 제출 도구 입력 | 제출 도구 저장본 |
| 발표 시나리오, 청중 참여 질문 | `docs/demo-script.md` |

### 경민 + Codex: 화면·연출·배포

| 할 일 | 결과물 |
|---|---|
| 시안(`prototype/index.html`)을 바탕으로 화면 4개 구성, 모바일 우선 | `index.html`, `styles.css`, `app.js` |
| 끌어다 놓기·테두리 크기 조절 조작감 다듬기 (손가락 끌기, 자석처럼 붙기, 놓을 때 효과) | |
| Step 3 비슷한 아파트 목록 화면 (`logic.js` 결과 사용) | |
| 견적서 카드 + 이미지 저장 | |
| 홈 화면 추가(manifest, 아이콘) | `manifest.json` |
| GitHub Pages 배포, 휴대폰 실기기 확인 | 배포 주소 |
| 발표용 화면 (청중 투표 결과 띄우기 등, 여유 있으면) | |

## 연결 규격 (logic.js)

화면은 아래 함수만 부른다. 바꿀 일이 생기면 먼저 공유한다.

```js
import { recommendArea, findSimilar, estimate } from './logic.js';

recommendArea(rooms, baths)
// → { area: 84, pyeong: 25.4, label: '34평형 (국민평형)', note: '...' }

findSimilar({ area: 84, gu: '서구', limit: 10 })
// → {
//   summary: { count: 37, medianSale: 52000, medianJeonse: 31000 },  // 만원
//   items: [{ apt: '○○아파트', dong: '둔산동', area: 84.9,
//             sale: 61000, saleDate: '2026-09', jeonse: 36000, built: 1994 }]
// }

estimate({ price: 52000, job: '응용소프트웨어 개발자' })
// → { monthly: 380, years: 11.4, text: '월급을 한 푼도 안 쓰면 11년 5개월' }
```

평수·공간 크기 데이터 (`data/area-guide.json`) 한 건의 모양:

```json
{ "rooms": 3, "baths": 2, "area": 84, "label": "34평형 (국민평형)",
  "pieces": { "living": [5.0, 4.0], "room1": [4.0, 3.0], "kitchen": [4.0, 2.5] },
  "source": "LH 주택 평면도 현황 ○○형 참고" }
```

공간 id: living, kitchen, room1~room3(방1이 가장 큰 방), bath1~bath2, entry. 크기는 [가로m, 세로m], 격자 한 칸 0.5m.


## 추가: 실제 도면과 배치 일치율 (10/20 17시)

- `data/plans.json`: LH 주택 평면도 현황(공공데이터포털 15037046)에서 59·74·84형 등 11장을 방 사각형으로 옮김. 좌표는 집 외곽을 0~1로 둔 값, 남쪽이 아래
- `data/apartments-daejeon.json`: 국토부 매매·전월세 실거래 API로 받은 대전 5개 구 2025-10~2026-09 계약분을 단지·면적별로 묶음 (711건, 474개 단지)
- `data/area-guide.json`: 방·화장실 조합 6개의 평수와 조각 크기(0.5m 단위). LH 도면 11장에서 잰 거실:주방:안방 비율(1:0.50:0.63)과 맞춤
- 시안 `prototype/index.html`에 Step 3 "내 그림과 가장 닮은 실제 집" 화면(나란히/겹쳐 보기, 공간별 위치 같음/다름) 추가

```js
import { recommendArea, findSimilar, toRects, matchPlans, estimate } from './logic.js';
const mine = toRects(state.pieces, state.cols, state.rows);      // 집 안에 놓은 조각만
const top3 = await matchPlans(mine, { area: 84, rooms: 3 });
// → [{ plan: {apt, type, region, area, rooms, baths, rects, source}, score: 53, parts: [{name:'거실', same:true}, ...] }]
const near = await findSimilar({ area: top3[0].plan.area, gu: '서구', limit: 10 });
const quote = await estimate({ price: near.summary.medianSale, monthly: 300 });  // job 연결은 wages.json 준비 후
```

## 일정

| 시간 | 혜성 + Claude | 경민 + Codex |
|---|---|---|
| 10/20 16:30~19:00 | API 신청, 실거래 수집, 평수·공간 크기표 | 시안 옮겨 화면 뼈대 |
| 19:00~22:00 | 단지별 정리, `logic.js` 1차, LH 평면도 대조 | Step 1·2 화면, 끌어다 놓기 |
| 22:00 | **1차 통합**: 실제 데이터로 Step 3까지 동작 | |
| 10/21 ~11:00 | 직업 임금·견적 로직, 검사, 기획안 초안 | 견적서 카드, 모바일, manifest |
| 11:00~13:00 | 발표 시나리오, 기획안 제출 도구 입력 | 배포, 휴대폰 확인 |
| 13:00~15:00 | 기능과 기획안 문장 대조 | 버그 수정 |
| 15:00~16:00 | 발표 리허설 (같이) | |
| 16:00 | **기능 동결** | |
| 16:00~17:00 | 최종 확인, 제출 | |

## 발표에서 표를 받는 장면

1. "여러분 꿈의 집은 방 몇 개예요?" 청중에게 방·화장실 개수를 물어 그 자리에서 입력
2. 거실을 어디에 둘지 손들기로 정하고, 그 자리에서 조각을 끌어다 집을 채우는 장면 (방이 갇히면 경고가 뜨는 것도 웃음 포인트)
3. 대전 서구에서 이 크기 아파트 실제 시세 공개
4. 마지막 견적서: "이 집 사려면 월급 한 푼 안 쓰고 ○년" → 웃음과 탄식

## 정할 것

- 앱 이름: "나만의 집 만들기" 그대로 갈지

## 주의

- 면적 배분은 비율로 계산한 예시라는 문구를 화면에 둔다
- 실거래 데이터에는 방 개수가 없다. "비슷한 아파트"는 전용면적과 지역 기준이라고 화면과 기획안에 밝힌다
- 시세·연봉은 데이터 기준일을 함께 표시한다
