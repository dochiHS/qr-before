"""전국주차장정보표준데이터 CSV에서 대전 주차장만 뽑아 data/parking-data.json을 만든다.

사용법:
    python3 scripts/build_parking_data.py <원본 CSV 경로> data/parking-data.json

원본: 공공데이터포털 전국주차장정보표준데이터 (https://www.data.go.kr/data/15012896/standard.do)
원본 인코딩은 CP949. 대전(도로명 또는 지번 주소가 '대전'으로 시작)만 남긴다.
위도·경도가 비었거나 숫자가 아니면 null로 둔다 (검색은 되고 거리순 정렬에서만 빠짐).
"""
import csv
import io
import json
import sys
from datetime import date


def to_float(value):
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return f if f != 0 else None


def main(src, dst):
    text = open(src, "rb").read().decode("cp949", errors="replace")
    facilities = []
    for r in csv.DictReader(io.StringIO(text)):
        road = (r.get("소재지도로명주소") or "").strip()
        jibun = (r.get("소재지지번주소") or "").strip()
        if not (road.startswith("대전") or jibun.startswith("대전")):
            continue
        facilities.append({
            "id": r["주차장관리번호"].strip(),
            "name": r["주차장명"].strip(),
            "category": r["주차장구분"].strip(),
            "type": r["주차장유형"].strip(),
            "roadAddress": road,
            "jibunAddress": jibun,
            "operator": r["관리기관명"].strip(),
            "phone": r["전화번호"].strip(),
            "payment": r["결제방법"].strip(),
            "fee": r["요금정보"].strip(),
            "lat": to_float(r.get("위도")),
            "lng": to_float(r.get("경도")),
            "sourceDate": r["데이터기준일자"].strip(),
        })

    out = {
        "source": "공공데이터포털 전국주차장정보표준데이터",
        "sourceUrl": "https://www.data.go.kr/data/15012896/standard.do",
        "region": "대전광역시",
        "downloadedAt": date.today().isoformat(),
        "count": len(facilities),
        "facilities": facilities,
    }
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f"{len(facilities)}건 저장: {dst}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
