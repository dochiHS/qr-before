// QR BEFORE — 보안 분석 엔진
//
// QR에 담긴 주소를 "열지 않고" 문자열만 검사한다. 네트워크 요청을 하지 않는다.
// 결과는 세 가지 중 하나다.
//   suspicious        : 의심 징후 발견 (강한 신호가 하나 이상)
//   matched_reference : 참고 도메인 목록과 일치 (공식 결제 페이지 보장이 아님)
//   unknown           : 확인 불가 (목록에 없거나 판단할 근거가 부족)
//
// 판정 원칙
// - 강한 신호(위험 스킴, @ 속임수, IP 주소, http, 유사 도메인, 다른 문자로 흉내 낸 도메인)만
//   suspicious로 올린다.
// - 약한 신호(단축 URL, 비표준 포트, 깊은 서브도메인, 한글 등 국제화 도메인)는
//   이유에만 적고 상태는 바꾸지 않는다. 정상 주소를 과하게 위험으로 몰지 않기 위해서다.
// - 공식 도메인이 확인되지 않으면 suspicious가 아니라 unknown이다.
// - 도메인 비교는 항상 URL 파서가 뽑은 실제 hostname 기준이다.

const DANGEROUS_SCHEMES = new Set(['javascript', 'data', 'vbscript', 'file', 'blob', 'filesystem']);

const NON_WEB_SCHEMES = {
  tel: '전화를 거는 QR입니다',
  sms: '문자를 보내는 QR입니다',
  smsto: '문자를 보내는 QR입니다',
  mailto: '메일을 보내는 QR입니다',
  wifi: '와이파이 접속 정보를 담은 QR입니다',
  geo: '위치 정보를 담은 QR입니다',
  market: '앱 설치 화면을 여는 QR입니다',
  intent: '휴대폰 앱을 바로 실행하는 QR입니다',
};

// 실제 목적지를 숨기는 단축·동적 QR 주소
const SHORTENERS = new Set([
  'bit.ly', 'han.gl', 'me2.do', 'vo.la', 'url.kr', 'lrl.kr', 'zrr.kr', 'buly.kr', 'c11.kr',
  'naver.me', 'kko.to', 'tinyurl.com', 'goo.gl', 'is.gd', 't.ly', 'rb.gy', 'cutt.ly',
  'ow.ly', 't.co', 'shorturl.at', 'tiny.cc', 'qrco.de', 'qr.codes', 'linktr.ee', 's.id',
]);

// 두 단계로 된 공공 접미사 (예: seogu.go.kr 의 go.kr)
const MULTI_PART_SUFFIXES = new Set([
  'go.kr', 'co.kr', 'or.kr', 'ne.kr', 're.kr', 'pe.kr', 'ac.kr', 'mil.kr', 'hs.kr',
  'ms.kr', 'es.kr', 'kg.kr', 'sc.kr',
  'seoul.kr', 'busan.kr', 'daegu.kr', 'incheon.kr', 'gwangju.kr', 'daejeon.kr',
  'ulsan.kr', 'sejong.kr', 'gyeonggi.kr', 'gangwon.kr', 'chungbuk.kr', 'chungnam.kr',
  'jeonbuk.kr', 'jeonnam.kr', 'gyeongbuk.kr', 'gyeongnam.kr', 'jeju.kr',
  'co.uk', 'org.uk', 'ac.uk', 'com.au', 'co.jp', 'com.cn',
]);

// 영문과 헷갈리는 다른 문자 → 영문
const CONFUSABLES = {
  'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'у': 'y', 'х': 'x', 'і': 'i', 'ј': 'j',
  'ѕ': 's', 'һ': 'h', 'ԁ': 'd', 'ԛ': 'q', 'ԝ': 'w', 'к': 'k', 'м': 'm', 'т': 't', 'в': 'b',
  'ο': 'o', 'α': 'a', 'ν': 'v', 'τ': 't', 'ι': 'i', 'κ': 'k', 'ρ': 'p', 'υ': 'u', 'ε': 'e',
};

const DEEP_SUBDOMAIN_LIMIT = 4;

// ---------------------------------------------------------------------------
// 공개 함수: 경민(Codex) 쪽과 합의한 규격. 입력·출력 구조를 바꾸지 않는다.
// ---------------------------------------------------------------------------

export function analyzeQR(input, facilities, trustedDomains) {
  const strong = [];
  const weak = [];
  const facility = pickFacility(facilities, input && input.facilityId);
  const raw = input && typeof input.url === 'string' ? input.url.trim() : '';

  const result = (status, extra = {}) => ({
    status,
    reasons: extra.reasons || [...strong, ...weak],
    facility,
    matchedDomain: extra.matchedDomain || null,
    checkedUrl: extra.checkedUrl || raw,
  });

  if (!raw) {
    return result('unknown', { reasons: ['QR에서 읽은 내용이 비어 있습니다'] });
  }

  // 브라우저는 주소의 탭·줄바꿈을 지우고 해석한다. 스킴 판단도 같은 방식으로 한다.
  const compact = raw.replace(/[\u0000- ]/g, '').toLowerCase();
  const schemeMatch = compact.match(/^([a-z][a-z0-9+.-]*):/);
  const scheme = schemeMatch ? schemeMatch[1] : null;

  if (scheme && DANGEROUS_SCHEMES.has(scheme)) {
    strong.push(`위험한 주소 형식(${scheme}:)입니다. 웹페이지가 아니라 코드나 파일을 바로 실행할 수 있습니다`);
    return result('suspicious');
  }
  if (scheme && NON_WEB_SCHEMES[scheme]) {
    return result('unknown', {
      reasons: [`${NON_WEB_SCHEMES[scheme]}. 결제 페이지 주소가 아니므로 내용을 직접 확인하세요`],
    });
  }

  let text = raw;
  const hasWebScheme = /^https?:\/\//i.test(compact);
  if (!hasWebScheme) {
    if (scheme && compact.startsWith(scheme + '://')) {
      return result('unknown', { reasons: [`웹 주소가 아닌 형식(${scheme}:)이라 판단할 수 없습니다`] });
    }
    text = 'https://' + raw;
    weak.push('주소에 http/https 표시가 없어 https로 가정하고 검사했습니다');
  }

  let url;
  try {
    url = new URL(text);
  } catch (e) {
    return result('unknown', { reasons: ['주소 형식이 올바르지 않아 검사할 수 없습니다'] });
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const checkedUrl = url.href;
  if (!host) {
    return result('unknown', { reasons: ['주소에서 접속 대상(도메인)을 찾을 수 없습니다'], checkedUrl });
  }

  // 1) @ 속임수: https://seogu.go.kr@evil.com 은 실제로 evil.com 에 접속한다
  if (url.username || url.password) {
    strong.push(`주소 앞부분(${decodeSafe(url.username)})은 꾸밈이고 실제 접속지는 ${host} 입니다 (@ 속임수)`);
  }

  // 2) IP 주소 직접 사용
  const isIP = isIPv4(host) || host.startsWith('[');
  if (isIP) {
    strong.push(`도메인 이름 대신 IP 주소(${host})로 바로 접속합니다`);
  }

  // 3) 암호화되지 않은 http
  if (url.protocol === 'http:') {
    strong.push('암호화되지 않은 http 주소입니다. 결제·개인정보 입력에 쓰면 안 됩니다');
  }

  // 4) 비표준 포트 (약한 신호)
  if (url.port) {
    weak.push(`일반적이지 않은 포트(:${url.port})를 씁니다`);
  }

  if (isIP) {
    return result('suspicious', { checkedUrl });
  }

  const labels = host.split('.');
  const { registrable, suffixLength } = splitDomain(labels);
  const subdomainCount = labels.length - registrable.split('.').length;

  // 5) 퓨니코드(국제화 도메인)
  const unicodeLabels = labels.map(decodeLabel);
  const shownHost = unicodeLabels.join('.');
  if (labels.some((l) => l.startsWith('xn--'))) {
    const spoofed = unicodeLabels.some(isSpoofLabel);
    if (spoofed) {
      strong.push(`영문처럼 보이지만 다른 나라 문자가 섞인 도메인입니다 (화면 표시: ${shownHost}, 실제: ${host})`);
    } else {
      weak.push(`한글 등 국제화 도메인입니다 (화면 표시: ${shownHost}). 글자를 직접 확인하세요`);
    }
  }

  // 6) 깊은 서브도메인 (약한 신호)
  if (subdomainCount >= DEEP_SUBDOMAIN_LIMIT) {
    weak.push(`하위 도메인이 ${subdomainCount}단계로 지나치게 깊습니다. 실제 기관 주소는 맨 끝의 ${registrable} 입니다`);
  }

  // 7) 단축 URL (약한 신호, 목적지를 알 수 없음)
  const isShortener = SHORTENERS.has(registrable) || SHORTENERS.has(host);
  if (isShortener) {
    weak.push(`단축 주소(${host})라 실제 목적지를 열기 전에는 알 수 없습니다`);
  }

  // 8) 참고 도메인과 비교
  const refs = normalizeTrusted(trustedDomains);
  const exact = refs.find((r) => host === r.domain || host.endsWith('.' + r.domain));
  let lookalike = null;
  if (!exact) {
    lookalike = findLookalike(host, labels, suffixLength, unicodeLabels, refs);
    if (lookalike && lookalike.strong) {
      strong.push(lookalike.reason);
    } else if (lookalike) {
      weak.push(lookalike.reason);
    }
    if (registrable.endsWith('.go.kr') && !lookalike) {
      weak.push('정부기관 전용 도메인(go.kr)이지만 이 주차장 관리기관의 참고 목록에는 없습니다');
    }
  }

  if (strong.length > 0) {
    // @ 앞부분에 공식 도메인을 적어 흉내 낸 경우 그 도메인을 알려 준다
    const userinfo = decodeSafe(url.username).toLowerCase();
    const imitated = userinfo ? refs.find((r) => userinfo.includes(r.domain)) : null;
    return result('suspicious', {
      checkedUrl,
      matchedDomain:
        lookalike && lookalike.strong ? lookalike.domain
        : imitated ? imitated.domain
        : exact ? exact.domain
        : null,
    });
  }

  if (exact) {
    const reasons = [
      `참고 도메인 목록(${exact.operator}, ${exact.domain})과 일치합니다. 공식 결제 페이지임을 보장하지는 않습니다`,
      ...weak,
    ];
    if (facility && facility.operator && !sameOperator(exact.operators, facility.operator)) {
      reasons.push(`선택한 주차장의 관리기관(${facility.operator})과 다른 기관의 도메인입니다`);
    }
    return result('matched_reference', { reasons, checkedUrl, matchedDomain: exact.domain });
  }

  const reasons = [
    `${registrable} 은(는) 참고 도메인 목록에 없어 공식 주소인지 확인할 수 없습니다`,
    ...weak,
  ];
  if (facility && facility.phone) {
    reasons.push(`결제 전에 관리기관(${facility.operator}, ${facility.phone})에 직접 확인하세요`);
  }
  return result('unknown', { reasons, checkedUrl });
}

// ---------------------------------------------------------------------------
// 내부 도우미 (테스트용으로 일부 내보냄)
// ---------------------------------------------------------------------------

function pickFacility(facilities, id) {
  if (!id) return null;
  const list = Array.isArray(facilities) ? facilities : facilities && facilities.facilities;
  if (!Array.isArray(list)) return null;
  const f = list.find((x) => x && x.id === id);
  if (!f) return null;
  return {
    id: f.id,
    name: f.name,
    operator: f.operator,
    phone: f.phone || '',
    sourceDate: f.sourceDate || '',
  };
}

function normalizeTrusted(trustedDomains) {
  const byDomain = new Map();
  for (const entry of Array.isArray(trustedDomains) ? trustedDomains : []) {
    if (!entry || entry.checked === false) continue;
    for (const d of entry.domains || []) {
      const domain = String(d).toLowerCase().trim().replace(/^\.+|\.+$/g, '');
      if (!domain) continue;
      if (!byDomain.has(domain)) byDomain.set(domain, { domain, operator: entry.operator, operators: [] });
      byDomain.get(domain).operators.push(entry.operator);
    }
  }
  return [...byDomain.values()];
}

function sameOperator(operators, name) {
  return operators.some((o) => o === name);
}

export function splitDomain(labels) {
  const lastTwo = labels.slice(-2).join('.');
  const suffixLength = labels.length >= 3 && MULTI_PART_SUFFIXES.has(lastTwo) ? 2 : 1;
  const registrable = labels.slice(-(suffixLength + 1)).join('.');
  return { registrable, suffixLength };
}

function findLookalike(host, labels, suffixLength, unicodeLabels, refs) {
  // 공공 접미사(go.kr, daejeon.kr 등)를 뺀 앞부분만 비교한다
  const ownLabels = labels.slice(0, labels.length - suffixLength);
  const tokens = ownLabels.flatMap((l) => l.split('-')).filter(Boolean);
  const mainLabel = ownLabels[ownLabels.length - 1] || '';
  const mainUnicode = unicodeLabels[ownLabels.length - 1] || mainLabel;

  const registrable = splitDomain(labels).registrable;
  // go.kr 은 정부기관만 등록할 수 있어 철자 흉내 도메인을 만들 수 없다
  // 단, 다른 나라 문자를 섞은 퓨니코드 주소는 이 예외를 적용하지 않는다
  const isGovDomain = registrable.endsWith('.go.kr') && !labels.some((l) => l.startsWith('xn--'));
  let weakHit = null;

  for (const ref of refs) {
    const refLabels = ref.domain.split('.');
    const refSplit = splitDomain(refLabels);
    const refMain = refLabels[refLabels.length - refSplit.suffixLength - 1] || '';

    // 공식 도메인 전체를 주소 안에 끼워 넣은 경우: seogu.go.kr.pay-check.com
    if (host.includes(ref.domain)) {
      return {
        strong: true,
        domain: ref.domain,
        reason: `주소 안에 ${ref.domain} 이 들어 있지만 실제 도메인은 ${registrable} 입니다`,
      };
    }
    if (isGovDomain || refMain.length < 5) continue;

    // 철자를 살짝 바꾼 경우: se0gu(숫자 0), sеogu(키릴 е), seo-gu, soegu, seoggu
    if (mainLabel !== refMain && (skeleton(mainUnicode) === skeleton(refMain) || isTypo(mainLabel, refMain))) {
      return {
        strong: true,
        domain: ref.domain,
        reason: `공식 참고 도메인(${ref.domain})과 철자가 비슷하지만 일치하지 않습니다`,
      };
    }

    // 기관 이름을 그대로 쓰되 다른 도메인: seogu-parking.com
    // 지명이라 정상 사이트에도 흔히 쓰이므로 약한 신호로만 남긴다
    if (!weakHit && tokens.includes(refMain)) {
      weakHit = {
        strong: false,
        domain: ref.domain,
        reason: `기관 이름 '${refMain}'이 들어 있지만 ${ref.operator}의 참고 도메인(${ref.domain})은 아닙니다`,
      };
    }
  }
  return weakHit;
}

// 한 글자 추가·누락, 또는 이웃한 두 글자 순서 바뀜만 오타로 본다.
// 다른 글자로 바꾼 경우(donggu→dongbu)는 정상 단어일 수 있어 잡지 않는다.
// 헷갈리는 글자 치환(0↔o, rn↔m 등)은 skeleton 비교가 맡는다.
function isTypo(a, b) {
  if (Math.abs(a.length - b.length) === 1) return levenshtein(a, b) === 1;
  if (a.length !== b.length) return false;
  const diff = [];
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
  return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
}

function skeleton(s) {
  let out = '';
  for (const ch of s.toLowerCase()) out += CONFUSABLES[ch] || ch;
  return out
    .replace(/0/g, 'o')
    .replace(/[1i]/g, 'l')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/-/g, '');
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function isIPv4(host) {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isSpoofLabel(label) {
  const hasLatin = /[a-z]/.test(label);
  const hasLookalikeScript = /[Ͱ-ϿЀ-ӿԀ-ԯ]/.test(label);
  if (hasLatin && hasLookalikeScript) return true;
  // 키릴·그리스 문자만으로 영문 단어처럼 보이게 만든 경우 (раураl)
  if (hasLookalikeScript) {
    return [...label].every((ch) => CONFUSABLES[ch] || /[0-9-]/.test(ch));
  }
  return false;
}

function decodeSafe(s) {
  try {
    return decodeURIComponent(s);
  } catch (e) {
    return s;
  }
}

function decodeLabel(label) {
  if (!label.startsWith('xn--')) return label;
  try {
    return punycodeDecode(label.slice(4));
  } catch (e) {
    return label;
  }
}

// RFC 3492 퓨니코드 디코더 (브라우저 내장 기능이 없어 직접 구현)
export function punycodeDecode(input) {
  const base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700;
  const adapt = (delta, numPoints, first) => {
    delta = first ? Math.floor(delta / damp) : delta >> 1;
    delta += Math.floor(delta / numPoints);
    let k = 0;
    while (delta > ((base - tMin) * tMax) >> 1) {
      delta = Math.floor(delta / (base - tMin));
      k += base;
    }
    return k + Math.floor(((base - tMin + 1) * delta) / (delta + skew));
  };
  const output = [];
  const basic = Math.max(input.lastIndexOf('-'), 0);
  for (let j = 0; j < basic; j++) output.push(input.charCodeAt(j));
  let n = 128, bias = 72, i = 0;
  for (let idx = basic > 0 ? basic + 1 : 0; idx < input.length;) {
    const oldi = i;
    let w = 1;
    for (let k = base; ; k += base) {
      if (idx >= input.length) throw new Error('invalid punycode');
      const c = input.charCodeAt(idx++);
      const digit = c >= 48 && c <= 57 ? c - 22 : c >= 65 && c <= 90 ? c - 65 : c >= 97 && c <= 122 ? c - 97 : base;
      if (digit >= base) throw new Error('invalid punycode');
      i += digit * w;
      const t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
      if (digit < t) break;
      w *= base - t;
    }
    const len = output.length + 1;
    bias = adapt(i - oldi, len, oldi === 0);
    n += Math.floor(i / len);
    i %= len;
    output.splice(i++, 0, n);
  }
  return String.fromCodePoint(...output);
}
