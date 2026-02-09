#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
티스토리 업로더 아이콘 생성
"""
from PIL import Image, ImageDraw, ImageFont
import os

def create_tistory_icon():
    """티스토리 업로더 아이콘 생성"""

    # 아이콘 크기들 (Windows용)
    sizes = [16, 32, 48, 64, 128, 256]

    # 메인 이미지 (256x256)
    size = 256
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 배경 원 (티스토리 오렌지 색상)
    padding = 10
    draw.ellipse(
        [padding, padding, size - padding, size - padding],
        fill='#FF5722',  # 티스토리 오렌지
        outline='#E64A19',
        width=3
    )

    # 'T' 문자 (Tistory)
    try:
        # Windows 기본 폰트 시도
        font = ImageFont.truetype("arial.ttf", 140)
    except:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 140)
        except:
            font = ImageFont.load_default()

    # T 문자 그리기
    text = "T"
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    x = (size - text_width) // 2
    y = (size - text_height) // 2 - 15

    draw.text((x, y), text, fill='white', font=font)

    # 업로드 화살표 (작은 크기로)
    arrow_size = 50
    arrow_x = size - arrow_size - 30
    arrow_y = size - arrow_size - 30

    # 화살표 배경 원
    draw.ellipse(
        [arrow_x - 10, arrow_y - 10, arrow_x + arrow_size + 10, arrow_y + arrow_size + 10],
        fill='#4CAF50',  # 녹색
        outline='#388E3C',
        width=2
    )

    # 위쪽 화살표
    arrow_points = [
        (arrow_x + arrow_size // 2, arrow_y + 5),  # 꼭대기
        (arrow_x + 10, arrow_y + 25),  # 왼쪽
        (arrow_x + arrow_size // 2 - 8, arrow_y + 25),  # 왼쪽 내부
        (arrow_x + arrow_size // 2 - 8, arrow_y + arrow_size - 5),  # 아래 왼쪽
        (arrow_x + arrow_size // 2 + 8, arrow_y + arrow_size - 5),  # 아래 오른쪽
        (arrow_x + arrow_size // 2 + 8, arrow_y + 25),  # 오른쪽 내부
        (arrow_x + arrow_size - 10, arrow_y + 25),  # 오른쪽
    ]
    draw.polygon(arrow_points, fill='white')

    # ICO 파일로 저장 (여러 크기 포함)
    icon_path = os.path.join(os.path.dirname(__file__), "tistory_uploader.ico")

    # 여러 크기의 이미지 생성
    images = []
    for s in sizes:
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        images.append(resized)

    # ICO 저장
    img.save(icon_path, format='ICO', sizes=[(s, s) for s in sizes])
    print(f"[OK] Icon created: {icon_path}")

    # PNG 버전도 저장
    png_path = os.path.join(os.path.dirname(__file__), "tistory_uploader.png")
    img.save(png_path, format='PNG')
    print(f"[OK] PNG saved: {png_path}")

    return icon_path


def create_simple_icon():
    """간단한 아이콘 (PIL 없이도 작동하는 버전)"""

    # 간단한 16x16 BMP 데이터로 ICO 생성
    # 여기서는 PIL 사용
    size = 64
    img = Image.new('RGBA', (size, size), (255, 87, 34, 255))  # 오렌지
    draw = ImageDraw.Draw(img)

    # 간단한 T 문자
    draw.rectangle([15, 10, 49, 18], fill='white')  # 가로선
    draw.rectangle([28, 10, 36, 54], fill='white')  # 세로선

    icon_path = os.path.join(os.path.dirname(__file__), "tistory_uploader.ico")
    img.save(icon_path, format='ICO')
    print(f"[OK] Simple icon created: {icon_path}")

    return icon_path


if __name__ == "__main__":
    try:
        create_tistory_icon()
    except Exception as e:
        print(f"고급 아이콘 실패: {e}")
        try:
            create_simple_icon()
        except Exception as e2:
            print(f"간단한 아이콘도 실패: {e2}")
            print("pip install Pillow 실행 후 다시 시도해주세요")
