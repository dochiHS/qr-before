// 검사 사례 목록: 테스트와 결과표 생성에 함께 쓴다

// 키릴 문자 е, о 를 섞은 "seogu" (화면에는 seogu 처럼 보임)
export const cyrillicSeogu = 'https://sеоgu.go.kr/pay';

export const CASES = [
  // [이름, URL, 기대 상태]
  ['공식 홈페이지', 'https://www.seogu.go.kr/kor.do', 'matched_reference'],
  ['공식 도메인 루트', 'https://seogu.go.kr', 'matched_reference'],
  ['공식 하위 도메인 결제 경로', 'https://parking.seogu.go.kr/pay?lot=57', 'matched_reference'],
  ['스킴 없는 공식 도메인', 'seogu.go.kr/parking', 'matched_reference'],
  ['공식 도메인 + 비표준 포트', 'https://seogu.go.kr:8443/pay', 'matched_reference'],

  ['공식 도메인을 앞에 끼운 가짜', 'https://seogu.go.kr.pay-check.com/pay', 'suspicious'],
  ['@ 속임수', 'https://seogu.go.kr@evil-pay.com/pay', 'suspicious'],
  ['암호화 안 된 http', 'http://seogu.go.kr/pay', 'suspicious'],
  ['숫자 0으로 바꾼 철자', 'https://se0gu.com/pay', 'suspicious'],
  ['글자 순서 바꿈', 'https://soegu.co.kr/pay', 'suspicious'],
  ['한 글자 추가', 'https://seoggu.kr/pay', 'suspicious'],
  ['하이픈 끼워 넣기', 'https://seo-gu.com/pay', 'suspicious'],
  ['키릴 문자로 흉내 낸 도메인', cyrillicSeogu, 'suspicious'],
  ['javascript 스킴', 'javascript:alert(document.cookie)', 'suspicious'],
  ['공백·탭을 섞은 javascript 스킴', '  java\tscript:alert(1)', 'suspicious'],
  ['data 스킴', 'data:text/html,<script>alert(1)</script>', 'suspicious'],
  ['IP 주소 직접 접속', 'https://192.168.0.10/pay', 'suspicious'],
  ['정수로 숨긴 IP 주소', 'http://3232235530/pay', 'suspicious'],

  ['목록에 없는 결제 사이트', 'https://example-pay.co.kr/p/123', 'unknown'],
  ['단축 URL', 'https://bit.ly/3abcde', 'unknown'],
  ['정상 결제대행사(목록 없음)', 'https://pay.tosspayments.com/checkout', 'unknown'],
  ['정상 포털', 'https://m.naver.com', 'unknown'],
  ['지명이 들어간 정상 사이트', 'https://www.daejeon-tour.co.kr', 'unknown'],
  ['비슷한 정상 단어(동부)', 'https://www.dongbu.co.kr', 'unknown'],
  ['다른 지역 서구청', 'https://www.seogu.gwangju.kr', 'unknown'],
  ['목록에 없는 정부 도메인', 'https://www.gov.kr', 'unknown'],
  ['한글 도메인', 'https://주차요금.kr/pay', 'unknown'],
  ['지나치게 깊은 하위 도메인', 'https://a.b.c.d.pay.example.com', 'unknown'],
  ['전화번호 QR', 'tel:042-288-4120', 'unknown'],
  ['와이파이 QR', 'WIFI:T:WPA;S:cafe;P:1234;;', 'unknown'],
  ['빈 문자열', '', 'unknown'],
  ['주소가 아닌 글자', '안녕하세요 반갑습니다', 'unknown'],
];
