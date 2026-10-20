"""data/raw 의 실거래 요약과 LH 평면도 좌표로 앱이 읽을 JSON 세 개를 만든다.

  python3 scripts/build-data.py
  → data/apartments-daejeon.json, data/plans.json, data/area-guide.json
"""
import json, math, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "data", "raw", "trades-daejeon-summary.txt")
GU = {"1": "동구", "2": "중구", "3": "서구", "4": "유성구", "5": "대덕구"}


def build_apartments():
    apts, rows, mode = [], [], None
    for line in open(RAW, encoding="utf-8"):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line in ("A", "R"):
            mode = line
            continue
        parts = line.split(",")
        if mode == "A":
            apts.append({"gu": GU[parts[0]], "dong": parts[1], "apt": parts[2]})
        else:
            i, area, built, sale, n, last, ym, jeonse, jn = parts
            a = apts[int(i)]
            rows.append({
                "apt": a["apt"], "gu": a["gu"], "dong": a["dong"],
                "area": float(area), "built": int(built),
                "sale": int(sale) * 100, "saleCount": int(n),           # 만원
                "lastSale": int(last) * 100, "lastDate": f"20{ym[:2]}-{ym[2:]}",
                "jeonse": int(jeonse) * 100 or None, "jeonseCount": int(jn),
            })
    out = {
        "source": "국토교통부 아파트 매매·전월세 실거래가 공개 API (공공데이터포털 15126469, 15126474)",
        "period": "2025-10 ~ 2026-09 계약분",
        "unit": "만원",
        "note": "단지·전용면적별 매매 중앙값과 최근 거래가. 전세는 월세 0원 계약의 보증금 중앙값. 해제 거래 제외, 매매 3건 이상만.",
        "items": rows,
    }
    return out


# ───── LH 주택 평면도 현황(공공데이터포털 15037046)을 보고 옮긴 방 사각형 ─────
# box = 집 외곽 (x1,y1,x2,y2), 방 = (종류, x1,y1,x2,y2). 화면 픽셀 기준이며 아래쪽이 남쪽(발코니 창)
LH = [
    dict(id="lh-guri-galmae-s1-84a", apt="구리갈매 S1블록", type="84A", region="경기 구리", area=84, rooms=3, baths=2,
         box=(440, 145, 1040, 575),
         r=[("room", 448, 388, 562, 555, "침실2"), ("room", 568, 388, 683, 555, "침실3"), ("living", 688, 330, 876, 555, None),
            ("kitchen", 708, 195, 845, 290, None), ("room", 882, 345, 1033, 510, "침실1"), ("bath", 450, 265, 520, 380, None),
            ("bath", 885, 245, 950, 345, None), ("entry", 540, 250, 600, 335, None)]),
    dict(id="lh-guri-galmae-s1-59a", apt="구리갈매 S1블록", type="59A", region="경기 구리", area=59, rooms=3, baths=2,
         box=(590, 145, 1050, 585),
         r=[("room", 598, 390, 738, 520, "침실1"), ("living", 745, 335, 920, 520, None), ("room", 928, 385, 1043, 520, "침실2"),
            ("room", 672, 215, 772, 335, "침실3"), ("kitchen", 782, 210, 905, 335, None), ("entry", 925, 245, 970, 330, None),
            ("bath", 975, 290, 1040, 380, None), ("bath", 600, 240, 668, 335, None)]),
    dict(id="lh-sejong-2-1m3-84a", apt="세종 행정중심복합도시 2-1M3블록", type="84A", region="세종", area=84, rooms=3, baths=2,
         box=(290, 28, 1275, 680),
         r=[("room", 316, 338, 556, 572, "침실1"), ("bath", 450, 175, 548, 315, None), ("kitchen", 598, 95, 832, 335, None),
            ("living", 576, 400, 868, 655, None), ("room", 890, 435, 1063, 640, "침실2"), ("room", 1075, 435, 1255, 640, "침실3"),
            ("entry", 1018, 215, 1118, 335, None), ("bath", 1150, 270, 1255, 412, None)]),
    dict(id="lh-sejong-2-1m3-74a", apt="세종 행정중심복합도시 2-1M3블록", type="74A", region="세종", area=74, rooms=3, baths=2,
         box=(330, 48, 1265, 668),
         r=[("room", 355, 345, 595, 562, "침실1"), ("bath", 487, 180, 588, 322, None), ("kitchen", 612, 135, 838, 330, None),
            ("living", 612, 410, 885, 640, None), ("room", 905, 425, 1060, 628, "침실2"), ("room", 1072, 425, 1245, 628, "침실3"),
            ("entry", 985, 222, 1130, 322, None), ("bath", 1142, 262, 1245, 400, None)]),
    dict(id="lh-sejong-2-1m3-59a", apt="세종 행정중심복합도시 2-1M3블록", type="59A", region="세종", area=59, rooms=3, baths=2,
         box=(435, 20, 1125, 700),
         r=[("room", 447, 402, 640, 608, "침실2"), ("living", 655, 390, 885, 608, None), ("room", 900, 402, 1113, 595, "침실1"),
            ("kitchen", 712, 120, 845, 310, None), ("room", 860, 68, 1005, 300, "침실3"), ("bath", 448, 250, 545, 385, None),
            ("bath", 1018, 140, 1100, 275, None), ("entry", 555, 205, 630, 305, None)]),
    dict(id="lh-goyang-hyangdong-s2-84", apt="고양향동 S-2블록", type="84", region="경기 고양", area=84, rooms=3, baths=2,
         box=(405, 140, 1055, 595),
         r=[("room", 410, 425, 530, 575, "침실3"), ("room", 537, 425, 657, 575, "침실2"), ("living", 665, 360, 865, 575, None),
            ("room", 877, 360, 1035, 520, "침실1"), ("kitchen", 700, 190, 865, 355, None), ("entry", 505, 280, 552, 355, None),
            ("bath", 415, 310, 482, 412, None), ("bath", 880, 248, 948, 350, None)]),
    dict(id="lh-gimpo-hangang-ac05-84a", apt="김포한강 Ac-05블록", type="84A", region="경기 김포", area=84, rooms=3, baths=2,
         box=(395, 95, 1150, 650),
         r=[("room", 402, 405, 540, 565, "침실3"), ("room", 548, 405, 690, 630, "침실2"), ("living", 697, 345, 945, 630, None),
            ("room", 957, 345, 1143, 548, "침실1"), ("kitchen", 780, 135, 945, 340, None), ("entry", 540, 232, 605, 330, None),
            ("bath", 405, 280, 485, 395, None), ("bath", 1060, 155, 1140, 280, None)]),
    dict(id="lh-goyang-hyangdong-s1-74a", apt="고양향동 S-1블록", type="74A", region="경기 고양", area=74, rooms=3, baths=2,
         box=(557, 90, 1105, 620),
         r=[("room", 565, 428, 712, 550, "침실2"), ("living", 722, 420, 908, 590, None), ("room", 918, 428, 1085, 588, "침실1"),
            ("room", 880, 225, 1002, 362, "침실3"), ("kitchen", 755, 165, 875, 370, None), ("entry", 640, 272, 695, 370, None),
            ("bath", 568, 320, 635, 418, None), ("bath", 1010, 265, 1078, 362, None)]),
    dict(id="lh-busan-mandeok5-59a", apt="부산만덕5 02블록", type="59A", region="부산", area=59, rooms=3, baths=2,
         box=(515, 122, 1055, 603),
         r=[("room", 525, 410, 683, 532, "침실2"), ("living", 692, 345, 870, 585, None), ("room", 880, 430, 1045, 585, "침실1"),
            ("room", 880, 208, 1045, 345, "침실3"), ("kitchen", 785, 140, 870, 280, None), ("entry", 607, 252, 665, 348, None),
            ("bath", 525, 265, 600, 402, None), ("bath", 930, 348, 1045, 428, None)]),
    dict(id="lh-busan-mandeok5-51", apt="부산만덕5 02블록", type="51", region="부산", area=51, rooms=2, baths=1,
         box=(598, 145, 950, 628),
         r=[("kitchen", 610, 240, 715, 385, None), ("living", 607, 385, 780, 610, None), ("room", 790, 375, 940, 520, "침실1"),
            ("room", 790, 160, 940, 283, "침실2"), ("bath", 785, 292, 860, 370, None), ("entry", 725, 148, 780, 238, None)]),
    dict(id="lh-busan-myeongji-b1-84a1", apt="부산명지 B-1블록", type="84A1", region="부산", area=84, rooms=3, baths=2,
         box=(445, 112, 1138, 592),
         r=[("room", 465, 325, 632, 488, "침실1"), ("bath", 468, 215, 545, 315, None), ("kitchen", 645, 135, 795, 315, None),
            ("living", 640, 320, 850, 545, None), ("room", 858, 375, 985, 545, "침실2"), ("room", 990, 375, 1128, 515, "침실3"),
            ("entry", 935, 225, 985, 310, None), ("bath", 1055, 265, 1125, 365, None)]),
    # ── 2차 (10/20 17시 이후) ──
    dict(id="lh-namyangju-byeollae-a25-46a", apt="남양주별내 A-25블록", type="46A", region="경기 남양주", area=46, rooms=2, baths=1,
         box=(35, 20, 300, 245),
         r=[("room", 40, 150, 110, 240, "침실2"), ("living", 110, 140, 205, 240, None), ("room", 205, 130, 295, 200, "침실1"),
            ("kitchen", 125, 40, 205, 130, None), ("entry", 80, 90, 120, 125, None), ("bath", 40, 95, 75, 150, None)]),
    dict(id="lh-namyangju-byeollae-a25-55a", apt="남양주별내 A-25블록", type="55A", region="경기 남양주", area=55, rooms=2, baths=2,
         box=(15, 25, 330, 245),
         r=[("room", 15, 130, 110, 200, "침실1"), ("living", 110, 135, 195, 245, None), ("room", 255, 150, 330, 245, "침실2"),
            ("kitchen", 120, 40, 235, 130, None), ("entry", 235, 75, 270, 120, None), ("bath", 280, 85, 325, 140, None),
            ("bath", 15, 65, 55, 125, None)]),
    dict(id="lh-suseo-ktx-a3-46a", apt="서울수서KTX A3블록", type="46A", region="서울", area=46, rooms=2, baths=1,
         box=(615, 125, 945, 585),
         r=[("room", 620, 180, 735, 295, "침실2"), ("bath", 675, 295, 780, 370, None), ("room", 620, 375, 778, 515, "침실1"),
            ("living", 783, 390, 938, 530, None), ("kitchen", 815, 135, 938, 390, None), ("entry", 738, 170, 790, 240, None)]),
    dict(id="lh-suseo-ktx-a3-55a", apt="서울수서KTX A3블록", type="55A", region="서울", area=55, rooms=2, baths=1,
         box=(628, 112, 945, 608),
         r=[("room", 632, 228, 780, 332, "침실2"), ("bath", 683, 338, 783, 405, None), ("room", 632, 410, 780, 540, "침실1"),
            ("living", 787, 410, 930, 555, None), ("kitchen", 787, 218, 930, 410, None), ("entry", 785, 118, 842, 205, None)]),
    dict(id="lh-wirye-a3-3b-46a", apt="위례 A3-3b블록", type="46A", region="경기 성남", area=46, rooms=2, baths=1,
         box=(440, 150, 965, 575),
         r=[("room", 457, 348, 620, 500, "침실1"), ("living", 628, 345, 808, 555, None), ("room", 815, 408, 955, 555, "침실2"),
            ("kitchen", 628, 170, 775, 340, None), ("entry", 818, 280, 865, 345, None), ("bath", 875, 290, 955, 400, None)]),
    dict(id="lh-busan-gijang-a2-59a", apt="부산기장 A-2블록", type="59A", region="부산", area=59, rooms=3, baths=2,
         box=(508, 198, 1037, 540),
         r=[("room", 517, 398, 625, 523, "침실3"), ("room", 632, 398, 727, 523, "침실2"), ("living", 733, 345, 878, 523, None),
            ("room", 888, 343, 1020, 468, "침실1"), ("kitchen", 733, 215, 878, 345, None), ("entry", 600, 285, 645, 345, None),
            ("bath", 520, 310, 578, 392, None), ("bath", 893, 250, 950, 338, None)]),
    dict(id="lh-busan-mandeok5-01-59a", apt="부산만덕5 01블록", type="59A", region="부산", area=59, rooms=3, baths=2,
         box=(565, 225, 922, 520),
         r=[("room", 580, 398, 665, 485, "침실2"), ("living", 672, 355, 790, 485, None), ("room", 800, 378, 900, 480, "침실1"),
            ("kitchen", 695, 258, 780, 355, None), ("room", 785, 240, 845, 338, "침실3"), ("entry", 635, 302, 690, 357, None),
            ("bath", 585, 350, 630, 392, None), ("bath", 853, 272, 905, 335, None)]),
    dict(id="lh-busan-mandeok5-01-84a", apt="부산만덕5 01블록", type="84A", region="부산", area=84, rooms=3, baths=2,
         box=(555, 175, 942, 535),
         r=[("room", 557, 390, 655, 505, "침실2"), ("living", 662, 350, 800, 525, None), ("room", 808, 385, 908, 490, "침실1"),
            ("kitchen", 708, 205, 785, 345, None), ("room", 790, 205, 875, 342, "침실3"), ("entry", 615, 290, 680, 345, None),
            ("bath", 557, 335, 625, 382, None), ("bath", 878, 262, 925, 330, None)]),
    dict(id="lh-busan-mandeok5-01-74a", apt="부산만덕5 01블록", type="74A", region="부산", area=74, rooms=3, baths=2,
         box=(575, 190, 955, 528),
         r=[("room", 577, 382, 678, 490, "침실2"), ("living", 685, 352, 818, 520, None), ("room", 825, 382, 918, 485, "침실1"),
            ("kitchen", 708, 205, 800, 345, None), ("room", 805, 220, 880, 340, "침실3"), ("entry", 648, 285, 690, 345, None),
            ("bath", 577, 330, 645, 378, None), ("bath", 890, 270, 935, 338, None)]),
    dict(id="lh-busan-myeongji-b8-84a", apt="부산명지 B-8블록", type="84A", region="부산", area=84, rooms=3, baths=2,
         box=(430, 135, 1115, 605),
         r=[("room", 438, 380, 575, 512, "침실3"), ("room", 582, 380, 705, 555, "침실2"), ("living", 712, 320, 920, 555, None),
            ("room", 932, 330, 1098, 500, "침실1"), ("kitchen", 732, 150, 878, 320, None), ("entry", 513, 232, 610, 320, None),
            ("bath", 440, 268, 505, 370, None), ("bath", 932, 225, 1000, 322, None)]),
    dict(id="lh-goyang-hyangdong-a3-59a", apt="고양향동 A-3블록", type="59A", region="경기 고양", area=59, rooms=3, baths=2,
         box=(540, 135, 1017, 605),
         r=[("room", 548, 410, 682, 532, "침실2"), ("living", 690, 350, 850, 555, None), ("room", 860, 410, 1005, 555, "침실1"),
            ("kitchen", 735, 180, 832, 350, None), ("room", 840, 232, 932, 350, "침실3"), ("entry", 622, 270, 668, 345, None),
            ("bath", 548, 305, 612, 398, None), ("bath", 940, 240, 1003, 338, None)]),
    dict(id="lh-siheung-mokgam-a2-59a", apt="시흥목감 A-2블록", type="59A", region="경기 시흥", area=59, rooms=3, baths=2,
         box=(488, 140, 992, 582),
         r=[("room", 507, 410, 658, 562, "침실1"), ("living", 667, 355, 838, 562, None), ("room", 847, 410, 985, 518, "침실2"),
            ("room", 585, 215, 685, 345, "침실3"), ("kitchen", 697, 215, 792, 355, None), ("entry", 853, 270, 910, 345, None),
            ("bath", 918, 345, 982, 402, None), ("bath", 510, 218, 578, 318, None)]),
    dict(id="lh-busan-mandeok5-02-39", apt="부산만덕5 02블록", type="39", region="부산", area=39, rooms=1, baths=1,
         box=(650, 122, 910, 555),
         r=[("room", 790, 140, 902, 270, "침실"), ("bath", 823, 280, 902, 392, None), ("kitchen", 660, 215, 785, 340, None),
            ("living", 660, 395, 902, 545, None), ("entry", 728, 125, 785, 210, None)]),
    dict(id="lh-siheung-mokgam-b3-84a", apt="시흥목감 B-3블록", type="84A", region="경기 시흥", area=84, rooms=3, baths=2,
         box=(487, 115, 1043, 635),
         r=[("room", 497, 415, 668, 592, "침실1"), ("living", 678, 410, 878, 620, None), ("room", 890, 415, 1033, 565, "침실2"),
            ("room", 568, 190, 688, 348, "침실3"), ("kitchen", 697, 190, 855, 350, None), ("entry", 888, 262, 940, 345, None),
            ("bath", 963, 305, 1030, 402, None), ("bath", 497, 190, 560, 295, None)]),
    dict(id="lh-uijeongbu-minrak2-a6-59a", apt="의정부민락2 A-6블록", type="59A", region="경기 의정부", area=59, rooms=3, baths=2,
         box=(500, 100, 1062, 622),
         r=[("room", 510, 400, 662, 570, "침실2"), ("living", 672, 395, 860, 605, None), ("room", 870, 395, 1043, 548, "침실1"),
            ("kitchen", 718, 195, 825, 390, None), ("room", 832, 195, 948, 325, "침실3"), ("entry", 598, 240, 652, 320, None),
            ("bath", 510, 280, 590, 385, None), ("bath", 960, 195, 1035, 300, None)]),
]


def build_plans():
    items = []
    for p in LH:
        x1, y1, x2, y2 = p["box"]
        W, H = x2 - x1, y2 - y1
        rects = []
        for t, a, b, c, d, n in p["r"]:
            r = {"t": t, "x": round((a - x1) / W, 3), "y": round((b - y1) / H, 3),
                 "w": round((c - a) / W, 3), "h": round((d - b) / H, 3)}
            if n:
                r["n"] = n
            rects.append(r)
        items.append({k: p[k] for k in ("id", "apt", "type", "region", "area", "rooms", "baths")} | {
            "aspect": round(W / H, 2), "rects": rects,
            "source": "https://www.data.go.kr/data/15037046/fileData.do",
            "sourceName": "LH 주택 평면도 현황, 공공데이터포털",
        })
    return {
        "note": "남쪽이 아래. 좌표는 집 외곽 사각형을 0~1로 둔 값. t = living|kitchen|room|bath|entry. 발코니·드레스룸·팬트리는 뺐다.",
        "items": items,
    }


# ───── 평수별 공간 크기 (0.5m 단위) ─────
RECO = {
    (1, 1): (33, "13평형 안팎", "1인 가구 소형 아파트 크기예요."),
    (1, 2): (39, "16평형 안팎", "방 하나에 화장실 둘은 드문 구성이에요."),
    (2, 1): (49, "20평형대 초반", "신혼·2인 가구가 많이 고르는 크기예요."),
    (2, 2): (59, "24평형", "방 2개에 화장실 2개면 59㎡가 무난해요."),
    (3, 1): (59, "24평형", "방 3개가 들어가는 가장 작은 아파트 크기예요."),
    (3, 2): (84, "34평형 (국민평형)", "가장 많이 지어지는 크기로, 주택법의 국민주택규모(85㎡ 이하)에 맞춘 면적이에요."),
}
SHARE = {"living": (.24, 1.35), "kitchen": (.12, 1.4), "room1": (.15, 1.2), "room2": (.11, 1.15), "room3": (.10, 1.1),
         "bath1": (.045, 1.4), "bath2": (.04, 1.3), "entry": (.035, 1.0)}
CELL = 0.5


def lh_shares(plans):
    """LH 도면에서 종류별 면적 비율(외곽 대비)을 평균 낸다. 근거 확인용."""
    acc = {}
    for p in plans:
        rooms = sorted([r for r in p["rects"] if r["t"] == "room"], key=lambda r: -r["w"] * r["h"])
        named = {"living": [r for r in p["rects"] if r["t"] == "living"], "kitchen": [r for r in p["rects"] if r["t"] == "kitchen"]}
        for i, r in enumerate(rooms):
            named[f"room{i+1}"] = [r]
        for k, rs in named.items():
            acc.setdefault(k, []).append(sum(r["w"] * r["h"] for r in rs))
    return {k: round(sum(v) / len(v), 3) for k, v in acc.items()}


def build_guide(plans):
    items = []
    for (rooms, baths), (area, label, note) in RECO.items():
        ids = ["living", "kitchen"] + [f"room{i}" for i in range(1, rooms + 1)] + [f"bath{i}" for i in range(1, baths + 1)] + ["entry"]
        cells_total = area / (CELL * CELL)
        cols = round(math.sqrt(cells_total * 1.95)); rows_ = round(cells_total / cols)
        pieces = {}
        for pid in ids:
            share, ratio = SHARE[pid]
            cells = area * share / (CELL * CELL)
            w = max(2, round(math.sqrt(cells * ratio))); h = max(2, round(cells / w))
            pieces[pid] = [w, h]
        box = cols * rows_
        g = 0
        while sum(w * h for w, h in pieces.values()) < box * 0.78 and g < 40:
            p = pieces["room1" if g % 2 else "living"]
            if p[0] <= p[1]: p[0] += 1
            else: p[1] += 1
            g += 1
        items.append({"rooms": rooms, "baths": baths, "area": area, "label": label, "note": note,
                      "box": [cols * CELL, rows_ * CELL],
                      "pieces": {k: [w * CELL, h * CELL] for k, (w, h) in pieces.items()},
                      "source": "전용면적 대비 공간 비율 예시(거실 24%·주방 12%·안방 15% 등). LH 주택 평면도(공공데이터포털) 39~84형 26장과 비율 대조"})
    return {"note": "크기는 [가로m, 세로m], 0.5m 단위. box는 집 테두리 크기", "lhShares": lh_shares(plans), "items": items}


if __name__ == "__main__":
    apts = build_apartments()
    plans = build_plans()
    guide = build_guide(plans["items"])
    for name, obj in (("apartments-daejeon.json", apts), ("plans.json", plans), ("area-guide.json", guide)):
        with open(os.path.join(ROOT, "data", name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1 if name != "apartments-daejeon.json" else None)
    print("apartments", len(apts["items"]), "plans", len(plans["items"]), "guide", len(guide["items"]))
    print("LH 평균 비율", guide["lhShares"])
