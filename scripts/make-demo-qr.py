"""시연용 QR 3종을 만든다.

- demo/qr-*.png : 이미지 업로드 테스트용 QR 단독 이미지
- demo/demo-qr-sheets.pdf : 강의실 시연용 A4 3장 (주차 요금 안내판 모양)

사용법: python3 scripts/make-demo-qr.py
의심용 주소는 실제로 열면 안 되므로 출력물마다 '시연용, 결제 금지' 표시를 넣는다.
"""
from pathlib import Path

import qrcode
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "demo"
FONT = "/usr/share/fonts/opentype/noto/NotoSansCJK-{}.ttc"
KR = 1  # Noto Sans CJK KR

CASES = [
    ("matched", "https://www.seogu.go.kr/kor.do", "시연 1 · 참고 목록과 일치 예상"),
    ("suspicious", "https://se0gu.com/pay", "시연 2 · 의심 징후 발견 예상 (숫자 0)"),
    ("unknown", "https://example-pay.co.kr/p/123", "시연 3 · 확인 불가 예상"),
]

W, H = 2480, 3508  # A4 300dpi
NAVY = (14, 42, 82)
INK = (25, 25, 25)
GREY = (110, 110, 110)
RED = (190, 30, 30)


def font(weight, size):
    return ImageFont.truetype(FONT.format(weight), size, index=KR)


def center(draw, y, text, f, fill):
    w = draw.textlength(text, font=f)
    draw.text(((W - w) / 2, y), text, font=f, fill=fill)


def make_qr(url):
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    return qr.make_image(fill_color="black", back_color="white").convert("RGB")


def make_sheet(url, label):
    page = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(page)

    # 안내판 머리
    d.rectangle([0, 0, W, 520], fill=NAVY)
    center(d, 150, "주차 요금 간편 결제", font("Bold", 170), "white")
    center(d, 370, "QR을 찍어 요금을 결제하세요", font("Medium", 90), (210, 225, 245))

    # QR
    qr = make_qr(url).resize((1500, 1500), Image.NEAREST)
    x = (W - 1500) // 2
    d.rectangle([x - 40, 700 - 40, x + 1540, 2240], outline=NAVY, width=14)
    page.paste(qr, (x, 700))

    center(d, 2340, "카드 · 간편결제 가능", font("Medium", 80), INK)

    # 시연 표시 (실제 결제 방지)
    d.rectangle([180, 2620, W - 180, 3300], outline=RED, width=10)
    center(d, 2690, "해커톤 시연용 QR · 실제 결제에 쓰지 마세요", font("Bold", 84), RED)
    center(d, 2850, label, font("Bold", 76), INK)
    center(d, 2990, url, font("Regular", 66), GREY)
    center(d, 3130, "QR BEFORE 앱으로 검사만 하고, 주소를 직접 열지 마세요", font("Regular", 60), GREY)
    return page


def main():
    OUT.mkdir(exist_ok=True)
    sheets = []
    for name, url, label in CASES:
        make_qr(url).save(OUT / f"qr-{name}.png")
        sheets.append(make_sheet(url, label))
    sheets[0].save(OUT / "demo-qr-sheets.pdf", save_all=True, append_images=sheets[1:], resolution=300)
    print("demo/ 에 PNG 3장과 demo-qr-sheets.pdf 를 만들었습니다")


if __name__ == "__main__":
    main()
