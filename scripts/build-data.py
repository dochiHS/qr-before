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

# ───── 대전 기존 단지: KB부동산 단지 평면도(923×676 이미지)를 보고 옮김 ─────
# rot: 남향 발코니가 있는 면. left/right 면 아래로 오도록 돌린다. trade = 실거래 데이터의 (구, 단지명)
KB = [
    dict(id="dj-dunsan-crova-102", apt="둔산 크로바", type="102㎡ (전용 84.93)", region="대전 서구 둔산동", area=85, rooms=3, baths=2,
         rot="left", trade=("서구", "크로바"), kb=8333, box=(500, 130, 1072, 575),
         r=[("living", 582, 135, 810, 355, None), ("entry", 740, 135, 795, 200, None), ("room", 815, 135, 958, 272, None),
            ("kitchen", 812, 275, 1045, 415, None), ("room", 582, 358, 758, 572, "안방"), ("bath", 762, 418, 835, 498, None),
            ("bath", 762, 502, 835, 572, None), ("room", 865, 420, 992, 572, None)]),
    dict(id="dj-dunsan-mokryeon-92", apt="둔산 목련", type="92㎡ (전용 75.96)", region="대전 서구 둔산동", area=76, rooms=3, baths=1,
         rot="left", trade=("서구", "목련"), kb=8330, box=(440, 120, 1130, 620),
         r=[("living", 525, 138, 830, 385, None), ("entry", 743, 138, 810, 225, None), ("room", 835, 122, 1052, 298, None),
            ("kitchen", 752, 300, 1100, 452, None), ("room", 525, 385, 750, 618, "안방"), ("bath", 752, 455, 852, 595, None),
            ("room", 855, 455, 1030, 618, None)]),
    dict(id="dj-dunsan-hanmaru-94", apt="둔산 한마루", type="94㎡ (전용 76.22)", region="대전 서구 둔산동", area=76, rooms=3, baths=1,
         rot="right", trade=("서구", "한마루아파트"), box=(430, 128, 1140, 608),
         r=[("room", 540, 150, 725, 297, None), ("entry", 752, 150, 820, 228, None), ("living", 730, 130, 1048, 365, None),
            ("kitchen", 458, 300, 815, 435, None), ("room", 540, 438, 712, 605, None), ("bath", 717, 438, 815, 578, None),
            ("room", 820, 368, 1048, 605, "안방")]),
    dict(id="dj-jijok-yeolmae1-113", apt="노은 열매마을1단지(삼부)", type="113㎡ (전용 84.83)", region="대전 유성구 지족동", area=85, rooms=3, baths=2,
         rot="left", trade=("유성구", "열매마을1단지(삼부)"), box=(560, 150, 1015, 578),
         r=[("room", 627, 150, 762, 258, None), ("bath", 808, 205, 893, 270, None), ("entry", 815, 290, 873, 330, None),
            ("living", 627, 262, 812, 432, None), ("kitchen", 812, 332, 948, 440, None), ("room", 627, 435, 772, 573, "안방"),
            ("bath", 777, 488, 830, 573, None), ("room", 835, 445, 950, 573, None)]),
    dict(id="dj-jijok-yeolmae1-101", apt="노은 열매마을1단지(삼부)", type="101㎡ (전용 73.54)", region="대전 유성구 지족동", area=74, rooms=3, baths=2,
         rot="left", trade=("유성구", "열매마을1단지(삼부)"), box=(555, 150, 1043, 578),
         r=[("room", 607, 152, 757, 267, None), ("entry", 760, 152, 840, 235, None), ("bath", 808, 235, 908, 305, None),
            ("living", 607, 267, 805, 410, None), ("kitchen", 805, 308, 972, 428, None), ("room", 607, 412, 765, 575, "안방"),
            ("bath", 768, 475, 835, 575, None), ("room", 840, 430, 972, 575, None)]),
    dict(id="dj-gwanjeo-gubong5-108a", apt="관저 구봉마을5단지", type="108A㎡ (전용 84.71)", region="대전 서구 관저동", area=85, rooms=3, baths=2,
         rot="left", trade=("서구", "구봉마을5"), box=(537, 183, 1048, 570),
         r=[("living", 600, 185, 828, 385, None), ("entry", 778, 185, 825, 240, None), ("room", 830, 185, 952, 322, None),
            ("kitchen", 765, 325, 1015, 437, None), ("room", 600, 385, 762, 565, "안방"), ("bath", 765, 440, 860, 508, None),
            ("bath", 765, 510, 830, 565, None), ("room", 862, 440, 982, 565, None)]),
    dict(id="dj-songgang-hanmaeul-107", apt="송강 한마을", type="107㎡ (전용 84.88)", region="대전 유성구 송강동", area=85, rooms=3, baths=2,
         rot=None, trade=("유성구", "한마을"), box=(557, 150, 1010, 578),
         r=[("room", 560, 208, 678, 315, None), ("kitchen", 682, 208, 835, 318, None), ("bath", 838, 230, 908, 318, None),
            ("bath", 578, 318, 640, 370, None), ("entry", 935, 322, 988, 370, None), ("room", 560, 372, 722, 515, "안방"),
            ("living", 728, 320, 895, 515, None), ("room", 898, 372, 1005, 515, None)]),
    dict(id="dj-gao-euneosong3-119a", apt="가오 은어송마을3단지(가오아이파크)", type="119A㎡ (전용 84.98)", region="대전 동구 가오동", area=85, rooms=3, baths=2,
         rot=None, trade=("동구", "은어송마을3단지(가오아이파크)"), kb=14228, box=(523, 108, 1040, 618),
         r=[("entry", 610, 132, 698, 320, None), ("kitchen", 733, 222, 845, 338, None), ("room", 847, 222, 965, 338, None),
            ("bath", 968, 222, 1035, 338, None), ("bath", 525, 330, 618, 390, None), ("living", 668, 338, 852, 538, None),
            ("room", 525, 393, 662, 538, None), ("room", 857, 393, 1035, 552, "안방")]),
    dict(id="dj-jijok-yeolmae4-80", apt="노은 열매마을4단지(계룡 현대)", type="80㎡ (전용 59.98)", region="대전 유성구 지족동", area=60, rooms=3, baths=1,
         rot=None, trade=("유성구", "열매마을4단지(계룡 현대)"), box=(535, 115, 1003, 608),
         r=[("room", 537, 183, 700, 290, None), ("bath", 540, 293, 700, 367, None), ("kitchen", 703, 183, 828, 335, None),
            ("room", 862, 213, 1000, 328, None), ("entry", 927, 348, 1000, 403, None), ("living", 775, 335, 1000, 518, None),
            ("room", 537, 370, 772, 518, "안방")]),
    dict(id="dj-jijok-yeolmae4-79", apt="노은 열매마을4단지(계룡 현대)", type="79㎡ (전용 59.81)", region="대전 유성구 지족동", area=60, rooms=2, baths=1,
         rot=None, trade=("유성구", "열매마을4단지(계룡 현대)"), box=(508, 113, 1017, 610),
         r=[("room", 510, 173, 735, 313, None), ("bath", 740, 198, 838, 313, None), ("kitchen", 842, 170, 1013, 315, None),
            ("entry", 948, 330, 1013, 388, None), ("living", 765, 318, 1013, 525, None), ("room", 510, 373, 760, 525, "안방")]),
    dict(id="dj-mannyeon-sangroksu-57", apt="만년 상록수", type="57㎡ (전용 43.20)", region="대전 서구 만년동", area=43, rooms=1, baths=1,
         rot="left", trade=None, box=(432, 218, 1113, 505),
         r=[("living", 527, 222, 740, 502, "거실/침실"), ("kitchen", 745, 222, 1040, 330, None), ("entry", 1042, 268, 1110, 330, None),
            ("bath", 745, 385, 943, 502, None), ("room", 948, 335, 1110, 502, None)]),
    dict(id="dj-mannyeon-sangroksu-79", apt="만년 상록수", type="79㎡ (전용 59.88)", region="대전 서구 만년동", area=60, rooms=3, baths=1,
         rot="left", trade=("서구", "상록수"), box=(428, 125, 1113, 605),
         r=[("living", 530, 128, 795, 352, None), ("kitchen", 795, 128, 925, 335, None), ("room", 930, 128, 1110, 330, None),
            ("entry", 1013, 335, 1110, 412, None), ("room", 530, 355, 770, 603, "안방"), ("bath", 773, 440, 888, 565, None),
            ("room", 932, 440, 1110, 603, None)]),
    dict(id="dj-moksang-dasarang-70", apt="목상 다사랑", type="70㎡ (전용 49.86)", region="대전 대덕구 목상동", area=50, rooms=3, baths=1,
         rot="left", trade=("대덕구", "다사랑"), kb=8268, box=(458, 140, 1088, 585),
         r=[("living", 620, 143, 780, 340, None), ("kitchen", 780, 143, 915, 325, None), ("room", 918, 143, 1085, 325, None),
            ("entry", 983, 328, 1085, 398, None), ("room", 538, 345, 778, 582, "안방"), ("bath", 783, 425, 890, 525, None),
            ("room", 895, 425, 1085, 582, None)]),
    dict(id="dj-dunsan-nokwon-76", apt="둔산 녹원", type="76㎡ (전용 59.54)", region="대전 서구 둔산동", area=60, rooms=3, baths=1,
         rot="left", trade=("서구", "녹원"), box=(458, 150, 1108, 600),
         r=[("living", 555, 153, 828, 385, None), ("entry", 740, 153, 805, 228, None), ("room", 832, 153, 1010, 297, None),
            ("kitchen", 745, 300, 1010, 458, None), ("room", 555, 388, 742, 598, "안방"), ("bath", 747, 462, 848, 582, None),
            ("room", 852, 462, 1010, 598, None)]),
    dict(id="dj-dunsan-nokwon-103", apt="둔산 녹원", type="103㎡ (전용 84.60)", region="대전 서구 둔산동", area=85, rooms=3, baths=2,
         rot="left", trade=("서구", "녹원"), box=(517, 120, 1048, 602),
         r=[("living", 588, 180, 828, 392, None), ("entry", 755, 180, 808, 250, None), ("room", 832, 180, 962, 313, None),
            ("kitchen", 765, 317, 1020, 447, None), ("room", 588, 393, 762, 600, "안방"), ("bath", 765, 450, 838, 522, None),
            ("bath", 765, 527, 838, 600, None), ("room", 875, 450, 993, 600, None)]),
    dict(id="dj-songchon-seonbi3-80b", apt="송촌 선비마을3단지", type="80B㎡ (전용 59.94)", region="대전 대덕구 송촌동", area=60, rooms=3, baths=1,
         rot="left", trade=("대덕구", "선비마을3단지"), kb=8243, box=(523, 160, 1050, 590),
         r=[("living", 608, 163, 833, 375, None), ("entry", 767, 163, 815, 228, None), ("room", 836, 163, 960, 302, None),
            ("kitchen", 775, 305, 962, 437, None), ("room", 608, 377, 772, 578, "안방"), ("bath", 775, 440, 848, 545, None),
            ("room", 850, 440, 985, 578, None)]),
    dict(id="dj-songchon-seonbi3-108", apt="송촌 선비마을3단지", type="108㎡ (전용 84.90)", region="대전 대덕구 송촌동", area=85, rooms=3, baths=2,
         rot=None, trade=("대덕구", "선비마을3단지"), kb=8243, box=(525, 105, 1043, 622),
         r=[("kitchen", 728, 190, 840, 340, None), ("bath", 620, 277, 725, 345, None), ("room", 845, 218, 977, 340, None),
            ("bath", 980, 218, 1040, 340, None), ("entry", 528, 345, 597, 408, None), ("living", 660, 340, 857, 545, None),
            ("room", 527, 410, 657, 545, None), ("room", 857, 403, 1040, 560, "안방")]),
    # ── 방 4개·화장실 2개 (전용 100~120㎡) ──
    dict(id="dj-dunsan-crova-120", apt="둔산 크로바", type="120㎡ (전용 101.79)", region="대전 서구 둔산동", area=102, rooms=4, baths=2,
         rot=None, trade=("서구", "크로바"), kb=8333, box=(530, 108, 1013, 605),
         r=[("room", 565, 192, 698, 307, None), ("kitchen", 703, 137, 857, 330, None), ("room", 883, 162, 1010, 275, None),
            ("bath", 805, 222, 880, 322, None), ("bath", 563, 312, 632, 377, None), ("entry", 935, 325, 1010, 375, None),
            ("living", 703, 378, 877, 545, None), ("room", 532, 380, 698, 545, "안방"), ("room", 880, 378, 1010, 545, None)]),
    dict(id="dj-dunsan-mokryeon-121b", apt="둔산 목련", type="121B㎡ (전용 101.83)", region="대전 서구 둔산동", area=102, rooms=4, baths=2,
         rot=None, trade=("서구", "목련"), kb=8330, box=(565, 103, 1043, 585),
         r=[("room", 568, 180, 678, 292, None), ("bath", 683, 230, 748, 330, None), ("kitchen", 750, 130, 860, 320, None),
            ("room", 897, 192, 1040, 302, None), ("bath", 937, 307, 1030, 377, None), ("entry", 568, 318, 615, 372, None),
            ("living", 695, 380, 865, 532, None), ("room", 568, 388, 692, 532, None), ("room", 867, 380, 1040, 532, "안방")]),
    dict(id="dj-dunsan-hanmaru-122", apt="둔산 한마루", type="122㎡ (전용 101.94)", region="대전 서구 둔산동", area=102, rooms=4, baths=2,
         rot=None, trade=("서구", "한마루아파트"), box=(550, 108, 1047, 608),
         r=[("room", 552, 162, 678, 277, None), ("bath", 683, 222, 762, 327, None), ("kitchen", 752, 132, 875, 310, None),
            ("room", 877, 192, 1012, 307, None), ("bath", 930, 310, 1028, 377, None), ("entry", 552, 310, 625, 385, None),
            ("living", 680, 385, 878, 545, None), ("room", 552, 388, 677, 545, None), ("room", 878, 378, 1045, 545, "안방")]),
    dict(id="dj-songchon-seonbi3-142", apt="송촌 선비마을3단지", type="142㎡ (전용 118.09)", region="대전 대덕구 송촌동", area=118, rooms=4, baths=2,
         rot="left", trade=("대덕구", "선비마을3단지"), kb=8243, box=(492, 130, 1078, 620),
         r=[("room", 562, 133, 725, 262, None), ("entry", 730, 133, 780, 202, None), ("room", 840, 133, 962, 245, None),
            ("bath", 785, 248, 882, 322, None), ("kitchen", 885, 248, 997, 372, None), ("living", 562, 262, 785, 432, None),
            ("room", 562, 437, 725, 617, "안방"), ("room", 790, 432, 940, 552, None), ("bath", 810, 557, 940, 617, None)]),
    dict(id="dj-gwanpyeong-prugio-151", apt="관평 대덕테크노밸리2단지(대우푸르지오)", type="151㎡ (전용 118.66)", region="대전 유성구 관평동", area=119, rooms=4, baths=2,
         rot=None, trade=("유성구", "대우푸르지오"), kb=13935, box=(528, 160, 1046, 493),
         r=[("entry", 587, 270, 640, 328, None), ("bath", 642, 240, 708, 328, None), ("kitchen", 708, 225, 876, 328, None),
            ("room", 878, 225, 980, 325, None), ("bath", 980, 210, 1046, 295, None), ("living", 738, 330, 900, 493, None),
            ("room", 528, 350, 628, 493, None), ("room", 630, 370, 736, 493, None), ("room", 900, 372, 1046, 493, "안방")]),
    dict(id="dj-gwanpyeong-prugio-132", apt="관평 대덕테크노밸리2단지(대우푸르지오)", type="132㎡ (전용 101.69)", region="대전 유성구 관평동", area=102, rooms=3, baths=2,
         rot=None, trade=("유성구", "대우푸르지오"), kb=13935, box=(573, 158, 997, 500),
         r=[("entry", 620, 280, 700, 340, None), ("kitchen", 700, 240, 822, 340, None), ("room", 824, 240, 936, 338, None),
            ("bath", 938, 240, 997, 325, None), ("bath", 573, 338, 655, 392, None), ("living", 700, 340, 855, 500, None),
            ("room", 573, 392, 697, 500, None), ("room", 855, 380, 997, 500, "안방")]),
]


def rotate(r, rot):
    """남향 면이 아래로 오게 0~1 사각형을 돌린다."""
    x, y, w, h = r["x"], r["y"], r["w"], r["h"]
    if rot == "left":    # 왼쪽 → 아래 (반시계 90°)
        x, y, w, h = y, 1 - (x + w), h, w
    elif rot == "right":  # 오른쪽 → 아래 (시계 90°)
        x, y, w, h = 1 - (y + h), x, h, w
    return {**r, "x": round(x, 3), "y": round(y, 3), "w": round(w, 3), "h": round(h, 3)}


def build_plans():
    items = []
    for p in LH + KB:
        x1, y1, x2, y2 = p["box"]
        W, H = x2 - x1, y2 - y1
        rects = []
        for t, a, b, c, d, n in p["r"]:
            r = {"t": t, "x": (a - x1) / W, "y": (b - y1) / H, "w": (c - a) / W, "h": (d - b) / H}
            r = rotate(r, p.get("rot"))
            if n:
                r["n"] = n
            rects.append(r)
        rects.sort(key=lambda r: r["t"] == "living")  # 겹치는 칸은 현관·주방이 먼저
        is_kb = p["id"].startswith("dj-")
        item = {k: p[k] for k in ("id", "apt", "type", "region", "area", "rooms", "baths")} | {
            "aspect": round((H / W) if p.get("rot") else (W / H), 2), "rects": rects,
            "source": (f"https://kbland.kr/c/{p['kb']}" if p.get("kb") else "https://kbland.kr/map") if is_kb
                      else "https://www.data.go.kr/data/15037046/fileData.do",
            "sourceName": "KB부동산 단지 평면도" if is_kb else "LH 주택 평면도 현황, 공공데이터포털",
        }
        if is_kb:
            item["daejeon"] = True
            if p.get("trade"):
                item["trade"] = {"gu": p["trade"][0], "apt": p["trade"][1]}
        items.append(item)
    return {
        "note": "남쪽이 아래. 좌표는 집 외곽 사각형을 0~1로 둔 값. t = living|kitchen|room|bath|entry. 발코니·드레스룸·팬트리는 뺐다. "
                "daejeon=true 는 KB부동산 단지 평면도를 보고 옮긴 대전 기존 단지이고, trade 는 실거래 데이터의 같은 단지",
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
    (4, 2): (102, "40평형대", "방 4개면 전용 100㎡ 안팎으로, 흔히 40평형대라고 불러요."),
}
SHARE = {"living": (.24, 1.35), "kitchen": (.12, 1.4), "room1": (.15, 1.2), "room2": (.11, 1.15), "room3": (.10, 1.1),
         "bath1": (.045, 1.4), "bath2": (.04, 1.3), "entry": (.035, 1.0)}
# 방 4개는 방이 늘어난 만큼 거실·주방 비율을 조금 줄여 복도 자리(약 20%)를 남긴다
SHARE4 = {"living": (.21, 1.35), "kitchen": (.10, 1.4), "room1": (.13, 1.2), "room2": (.09, 1.15), "room3": (.085, 1.1),
          "room4": (.08, 1.1), "bath1": (.035, 1.4), "bath2": (.03, 1.3), "entry": (.025, 1.0)}
CELL = 0.5
# 집 테두리 가로:세로. 실제 평면도 49장의 외곽 비율이 0.4~1.6(중앙값 약 1.0)이라 남향 폭을 조금 넓힌 1.35로 둔다
ASPECT = 1.35
ASPECT4 = 1.7  # 방 4개는 남쪽에 방 셋과 거실이 나란히 서는 4베이라 폭이 넓다


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


def fit_to_box(pieces, rooms, cols, rows):
    """비율로 만든 조각 크기를 집 테두리 모양에 맞춘다 (app.js autoPlace와 같은 판상형 틀).
    남쪽 줄(방2·거실·안방, 방 4개면 방3도)은 집 깊이의 절반, 북쪽 줄(방·공용 욕실·현관·주방)은 38%,
    사이는 복도. 줄마다 원래 너비 비율대로 집 폭을 나눠 갖고, 욕실·현관은 좁은 쪽을 너비로 쓴다."""
    rnd = lambda v: int(v + 0.5)
    south_h = max(2, rnd(rows * 0.5))
    north_h = max(2, min(rows - south_h - 1, rnd(rows * 0.38)))
    out = {k: list(v) for k, v in pieces.items()}

    def lay(ids, height, flex_id, fixed, end_gap=0):
        row = [i for i in ids if i in pieces]
        room = cols - end_gap
        narrow = {i: max(3, min(pieces[i])) for i in row if i in fixed}  # 욕실·현관 폭은 1.5m 이상
        flex_total = sum(pieces[i][0] for i in row if i not in fixed)
        widths = {i: narrow[i] if i in fixed else max(5, (pieces[i][0] * (room - sum(narrow.values()))) // flex_total) for i in row}
        f = flex_id if flex_id in row else row[0]
        extra = room - sum(widths.values())
        if f == "kitchen":  # 주방이 북쪽 줄을 혼자 다 차지하지 않게 원래 너비의 1.5배, 거실 너비까지만 (남는 칸은 복도)
            widths[f] = min(widths[f] + extra, max(5, min(int(pieces[f][0] * 1.5), out["living"][0])))
        else:
            widths[f] += extra
        for i in row:
            out[i] = [max(2, widths[i]), min(max(pieces[i]), height) if i in fixed else height]

    lay(["room3", "room2", "living", "room1"] if rooms >= 4 else ["room2", "living", "room1"], south_h, "living", [])
    gap = 0
    if "bath2" in pieces:
        out["bath2"] = [max(3, min(pieces["bath2"])), min(max(pieces["bath2"]), rows - south_h)]
        gap = out["bath2"][0]
    lay(["room4" if rooms >= 4 else "room3", "bath1", "entry", "kitchen"], north_h, "kitchen", ["bath1", "entry"], gap)
    return out



# ───── 예시 배치: 같은 방·욕실 구성의 대전 단지 도면을 집 격자에 옮겨 만든다 ─────
GX, GY = 24, 12


def _raster(rects):
    g = [None] * (GX * GY)
    for j in range(GY):
        for i in range(GX):
            cx, cy = (i + .5) / GX, (j + .5) / GY
            for r in rects:
                if r["x"] <= cx < r["x"] + r["w"] and r["y"] <= cy < r["y"] + r["h"]:
                    g[j * GX + i] = r["t"]
                    break
    return g


def _centroids(rects):
    c = {}
    for r in rects:
        a = r["w"] * r["h"]
        k = c.setdefault(r["t"], [0, 0, 0])
        k[0] += (r["x"] + r["w"] / 2) * a; k[1] += (r["y"] + r["h"] / 2) * a; k[2] += a
    return {t: (v[0] / v[2], v[1] / v[2]) for t, v in c.items()}


def score_like_app(mine, plan):
    """logic.js compareLayout과 같은 계산 (예시 배치를 고를 때만 쓴다)."""
    a, b = _raster(mine), _raster(plan["rects"])
    same = sum(1 for x, y in zip(a, b) if x and x == y)
    union = sum(1 for x, y in zip(a, b) if x or y)
    overlap = same / union if union else 0
    ca, cb = _centroids(mine), _centroids(plan["rects"])
    place = 0
    for t in ("living", "kitchen", "room", "bath", "entry"):
        d = math.hypot(ca[t][0] - cb[t][0], (ca[t][1] - cb[t][1]) * .5) if t in ca and t in cb else 1
        place += max(0, 1 - d / .45)
    place /= 5
    rooms = sum(1 for r in mine if r["t"] == "room"); baths = sum(1 for r in mine if r["t"] == "bath")
    pen = abs(rooms - plan["rooms"]) * .08 + abs(baths - plan["baths"]) * .05
    return round(max(0, min(1, .55 * overlap + .45 * place - pen)) * 100)


def example_from_plan(plan, rooms, baths, cols, rows):
    rects = plan["rects"]
    rm = [r for r in rects if r["t"] == "room"]
    master = next((r for r in rm if r.get("n") == "안방"), None) or max(rm, key=lambda r: r["w"] * r["h"])
    others = sorted([r for r in rm if r is not master], key=lambda r: -r["w"] * r["h"])
    assign = {"room1": master}
    for i, r in enumerate(others[:rooms - 1]):
        assign[f"room{i + 2}"] = r
    bs = [r for r in rects if r["t"] == "bath"]
    if baths == 2 and len(bs) >= 2:
        mc = (master["x"] + master["w"] / 2, master["y"] + master["h"] / 2)
        bs = sorted(bs, key=lambda r: math.hypot(r["x"] + r["w"] / 2 - mc[0], r["y"] + r["h"] / 2 - mc[1]))
        assign["bath2"], assign["bath1"] = bs[0], bs[1]
    elif bs:
        assign["bath1"] = bs[0]
    for t in ("living", "kitchen", "entry"):
        r = next((r for r in rects if r["t"] == t), None)
        if r:
            assign[t] = r
    placed = {}
    order = ["living", "room1", "room2", "room3", "room4", "kitchen", "bath2", "bath1", "entry"]

    def hit(x, y, w, h):
        return any(x < X + W and X < x + w and y < Y + H and Y < y + h for X, Y, W, H in placed.values())
    for pid in order:
        r = assign.get(pid)
        if not r:
            continue
        x, y = round(r["x"] * cols), round(r["y"] * rows)
        w, h = max(2, round(r["w"] * cols)), max(2, round(r["h"] * rows))
        x, y = min(max(0, x), cols - 2), min(max(0, y), rows - 2)
        w, h = min(w, cols - x), min(h, rows - y)
        # 다른 조각과 겹치면 겹친 쪽을 한 칸씩 깎는다 (최소 2칸)
        tries = 0
        while hit(x, y, w, h) and tries < 20:
            if w >= h and w > 2: w -= 1
            elif h > 2: h -= 1
            elif w > 2: w -= 1
            else: break
            tries += 1
        if hit(x, y, w, h):
            continue
        placed[pid] = [x, y, w, h]
    # 거실은 남쪽 외벽에 닿게: 아래가 비어 있으면 끝까지 늘린다
    if "living" in placed:
        x, y, w, h = placed.pop("living")
        while y + h < rows and not hit(x, y, w, h + 1):
            h += 1
        placed["living"] = [x, y, w, h]
    return placed


def build_example(plans, rooms, baths, cols, rows):
    best = None
    for p in plans:
        if not p.get("daejeon") or p["rooms"] != rooms or p["baths"] != baths:
            continue
        lay = example_from_plan(p, rooms, baths, cols, rows)
        cat = lambda k: "room" if k.startswith("room") else "bath" if k.startswith("bath") else k
        mine = [{"t": cat(k), "x": x / cols, "y": y / rows, "w": w / cols, "h": h / rows} for k, (x, y, w, h) in lay.items()]
        expected = len(["living", "kitchen", "entry"]) + rooms + baths
        sc = score_like_app(mine, p)
        # 모든 조각이 들어가고 거실이 남쪽에 닿는 도면만 예시로 쓴다
        if len(lay) < expected or "living" not in lay or sum(lay["living"][1::2]) != rows:
            continue
        # 방·거실·주방이 1.5m(3칸)보다 좁으면 예시로 어색하다
        if any(min(v[2], v[3]) < 3 for k, v in lay.items() if not k.startswith("bath") and k != "entry"):
            continue
        if not best or sc > best[0]:
            best = (sc, p, lay)
    if not best:
        return None
    sc, p, lay = best
    return {"ref": p["id"], "refName": f"{p['apt']} {p['type']}", "score": sc, "pieces": lay}


def build_guide(plans):
    items = []
    for (rooms, baths), (area, label, note) in RECO.items():
        ids = ["living", "kitchen"] + [f"room{i}" for i in range(1, rooms + 1)] + [f"bath{i}" for i in range(1, baths + 1)] + ["entry"]
        cells_total = area / (CELL * CELL)
        cols = round(math.sqrt(cells_total * (ASPECT4 if rooms == 4 else ASPECT))); rows_ = round(cells_total / cols)
        pieces = {}
        for pid in ids:
            share, ratio = (SHARE4 if rooms == 4 else SHARE)[pid]
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
        pieces = fit_to_box(pieces, rooms, cols, rows_)
        item_example = build_example(plans, rooms, baths, cols, rows_)
        items.append({"rooms": rooms, "baths": baths, "area": area, "label": label, "note": note,
                      "box": [cols * CELL, rows_ * CELL],
                      **({"example": item_example} if item_example else {}),
                      "pieces": {k: [w * CELL, h * CELL] for k, (w, h) in pieces.items()},
                      "source": "전용면적 대비 공간 비율 예시(거실 24%·주방 12%·안방 15% 등). LH 주택 평면도(공공데이터포털) 26장·대전 단지 평면도 23장과 비율 대조"})
    return {"note": "크기는 [가로m, 세로m], 0.5m 단위. box는 집 테두리 크기", "lhShares": lh_shares(plans), "items": items}


def attach_prices(plans, apts):
    """대전 도면에 같은 단지·비슷한 면적(±3㎡)의 실거래 요약을 붙인다."""
    for p in plans["items"]:
        t = p.get("trade")
        if not t:
            continue
        hits = [a for a in apts["items"] if a["gu"] == t["gu"] and a["apt"] == t["apt"] and abs(a["area"] - p["area"]) <= 3]
        if hits:
            h = min(hits, key=lambda a: abs(a["area"] - p["area"]))
            p["price"] = {k: h[k] for k in ("area", "built", "sale", "saleCount", "lastSale", "lastDate", "jeonse")}


if __name__ == "__main__":
    apts = build_apartments()
    plans = build_plans()
    attach_prices(plans, apts)
    guide = build_guide(plans["items"])
    for name, obj in (("apartments-daejeon.json", apts), ("plans.json", plans), ("area-guide.json", guide)):
        with open(os.path.join(ROOT, "data", name), "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1 if name != "apartments-daejeon.json" else None)
    print("apartments", len(apts["items"]), "plans", len(plans["items"]), "guide", len(guide["items"]))
    print("LH 평균 비율", guide["lhShares"])
